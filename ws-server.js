/**
 * cTrader Tick Streaming WebSocket Server
 *
 * Connects to cTrader Open API via TCP/TLS + Protobuf,
 * subscribes to spot prices, and broadcasts to browser clients via WebSocket.
 *
 * Usage: node ws-server.js
 * Env:   WS_PORT (default 8080)
 */

const tls = require('tls');
const { WebSocketServer } = require('ws');

// ─── Config ───
const WS_PORT = parseInt(process.env.WS_PORT || '8080', 10);
const CTRADER_HOST_LIVE = 'live.ctraderapi.com';
const CTRADER_HOST_DEMO = 'demo.ctraderapi.com';
const CTRADER_PORT = 5035;
const CLIENT_ID = '14630_Dwxh7PHfgv5R8mjONQMBC8PR6InylkpbxuEyGZUX2PhxPfviXo';
const CLIENT_SECRET = 'APVcr7mO3BcKsePjam245sjtBhcv3WgJQezLAMclN7QAMUMCLn';
const HEARTBEAT_INTERVAL = 25000; // 25s

// ─── Payload Types ───
const PT = {
    HEARTBEAT: 51,
    APP_AUTH_REQ: 2100,
    APP_AUTH_RES: 2101,
    ACCOUNT_AUTH_REQ: 2102,
    ACCOUNT_AUTH_RES: 2103,
    VERSION_REQ: 2104,
    VERSION_RES: 2105,
    SYMBOLS_LIST_REQ: 2114,
    SYMBOLS_LIST_RES: 2115,
    SYMBOL_BY_ID_REQ: 2116,
    SYMBOL_BY_ID_RES: 2117,
    SUBSCRIBE_SPOTS_REQ: 2127,    // was wrongly 2126 (that's EXECUTION_EVENT!)
    SUBSCRIBE_SPOTS_RES: 2128,
    UNSUBSCRIBE_SPOTS_REQ: 2129,
    UNSUBSCRIBE_SPOTS_RES: 2130,
    SPOT_EVENT: 2131,             // was wrongly 2128
    RECONCILE_REQ: 2124,
    RECONCILE_RES: 2125,
    GET_POSITION_PNL_REQ: 2187,
    GET_POSITION_PNL_RES: 2188,
    CLOSE_POSITION_REQ: 2111,
    CLOSE_POSITION_RES: 2112,
    ERROR_RES: 2142,
    GET_ACCOUNTS_REQ: 2149,
    GET_ACCOUNTS_RES: 2150,
};

// ─── Protobuf Helpers ───
function encodeVarint(value) {
    const buf = [];
    if (value < 0) {
        for (let i = 0; i < 9; i++) {
            buf.push((Number(BigInt(value) & 0x7Fn) | 0x80));
            value = Number(BigInt(value) >> 7n);
        }
        buf.push(value & 0x01);
        return Buffer.from(buf);
    }
    do {
        let byte = value & 0x7F;
        value >>>= 7;
        if (value !== 0) byte |= 0x80;
        buf.push(byte);
    } while (value !== 0);
    return Buffer.from(buf);
}

function pbVarint(fieldNum, value) {
    return Buffer.concat([encodeVarint((fieldNum << 3) | 0), encodeVarint(value)]);
}

function pbBytes(fieldNum, data) {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    return Buffer.concat([encodeVarint((fieldNum << 3) | 2), encodeVarint(buf.length), buf]);
}

function decodeVarint(buf, offset) {
    let result = 0, shift = 0;
    const startOffset = offset;
    do {
        if (offset >= buf.length) throw new Error('Varint: unexpected end');
        const byte = buf[offset++];
        result += (byte & 0x7F) * (2 ** shift);
        shift += 7;
        if (shift >= 64) break;
        if (!(byte & 0x80)) break;
    } while (true);

    // 10-byte varints = negative int64 — re-decode with BigInt for precision
    if (shift >= 63) {
        let big = 0n, s = 0n, idx = startOffset;
        do {
            const byte = buf[idx++];
            big |= BigInt(byte & 0x7F) << s;
            s += 7n;
            if (!(byte & 0x80)) break;
        } while (s < 70n);
        if (big >= (1n << 63n)) big -= (1n << 64n);
        return { value: Number(big), offset };
    }

    return { value: result, offset };
}

function pbDecode(buf) {
    const fields = {};
    let offset = 0;
    while (offset < buf.length) {
        let key;
        try { ({ value: key, offset } = decodeVarint(buf, offset)); } catch { break; }
        const fieldNum = key >> 3;
        const wireType = key & 0x07;
        if (fieldNum === 0) break;
        let value;
        switch (wireType) {
            case 0: // varint
                ({ value, offset } = decodeVarint(buf, offset));
                break;
            case 1: // 64-bit
                if (offset + 8 > buf.length) return fields;
                value = buf.slice(offset, offset + 8);
                offset += 8;
                break;
            case 2: // length-delimited
                let len;
                ({ value: len, offset } = decodeVarint(buf, offset));
                if (offset + len > buf.length) return fields;
                value = buf.slice(offset, offset + len);
                offset += len;
                break;
            case 5: // 32-bit
                if (offset + 4 > buf.length) return fields;
                value = buf.slice(offset, offset + 4);
                offset += 4;
                break;
            default:
                return fields;
        }
        if (fields[fieldNum] !== undefined) {
            if (!Array.isArray(fields[fieldNum])) fields[fieldNum] = [fields[fieldNum]];
            fields[fieldNum].push(value);
        } else {
            fields[fieldNum] = value;
        }
    }
    return fields;
}

function wrapMessage(payloadType, payload) {
    return Buffer.concat([pbVarint(1, payloadType), pbBytes(2, payload)]);
}

// ─── cTrader Connection Manager ───
class CtraderStream {
    constructor() {
        this.socket = null;
        this.buffer = Buffer.alloc(0);
        this.authenticated = false;
        this.symbolSubscriptions = new Map(); // symbolId → { symbolName, digits, subscribers: Set<ws> }
        this.symbolNameToId = new Map();
        this.symbolIdToName = new Map();
        this.symbolDigits = new Map();
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        this.ctid = null;
        this.accessToken = null;
        this.isLive = false;
        this.onSpot = null; // callback(symbolName, bid, ask)
    }

    async connect(accessToken, ctid, isLive) {
        this.accessToken = accessToken;
        this.ctid = ctid;
        this.isLive = isLive;
        const host = isLive ? CTRADER_HOST_LIVE : CTRADER_HOST_DEMO;

        return new Promise((resolve, reject) => {
            this.socket = tls.connect({ host, port: CTRADER_PORT, rejectUnauthorized: false }, () => {
                log(`Connected to ${host}:${CTRADER_PORT}`);
                this.buffer = Buffer.alloc(0);
                this.startHeartbeat();
                this.authenticate().then(resolve).catch(reject);
            });

            this.socket.on('data', (data) => this.onData(data));
            this.socket.on('error', (err) => {
                log('TCP error: ' + err.message);
            });
            this.socket.on('close', () => {
                log('TCP connection closed');
                this.authenticated = false;
                this.scheduleReconnect();
            });
        });
    }

    startHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
            if (this.socket && !this.socket.destroyed) {
                // Heartbeat inner payload must contain payloadType field
                const innerPayload = pbVarint(1, PT.HEARTBEAT);
                this.sendMessage(wrapMessage(PT.HEARTBEAT, innerPayload));
            }
        }, HEARTBEAT_INTERVAL);
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.stopHeartbeat();
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            if (this.accessToken && this.ctid !== null) {
                log('Reconnecting...');
                try {
                    await this.connect(this.accessToken, this.ctid, this.isLive);
                    // Re-subscribe all symbols
                    for (const [symbolId] of this.symbolSubscriptions) {
                        await this.subscribeSpots(symbolId);
                    }
                    log('Reconnected and re-subscribed');
                } catch (e) {
                    log('Reconnect failed: ' + e.message);
                    this.scheduleReconnect();
                }
            }
        }, 5000);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    }

    sendMessage(msg) {
        if (!this.socket || this.socket.destroyed) return;
        const header = Buffer.alloc(4);
        header.writeUInt32BE(msg.length);
        this.socket.write(Buffer.concat([header, msg]));
    }

    onData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        while (this.buffer.length >= 4) {
            const msgLen = this.buffer.readUInt32BE(0);
            if (this.buffer.length < 4 + msgLen) break;
            const msgBody = this.buffer.slice(4, 4 + msgLen);
            this.buffer = this.buffer.slice(4 + msgLen);
            this.handleMessage(msgBody);
        }
    }

    handleMessage(body) {
        const wrapper = pbDecode(body);
        const payloadType = wrapper[1] || 0;
        const payloadBytes = wrapper[2];
        if (!Buffer.isBuffer(payloadBytes)) return;
        const fields = pbDecode(payloadBytes);

        switch (payloadType) {
            case PT.SPOT_EVENT:
                this.handleSpotEvent(fields);
                break;
            case PT.ERROR_RES: {
                const errCode = fields[3] ? fields[3].toString() : '';
                const errMsg = fields[4] ? fields[4].toString() : '';
                log('cTrader error: ' + errCode + ' - ' + errMsg);
                // Only reject pending promise, don't crash
                if (this._responseResolve) {
                    const rej = this._responseReject;
                    this._responseResolve = null;
                    this._responseReject = null;
                    if (rej) rej(new Error(errCode + ': ' + errMsg));
                }
                // Don't let non-fatal errors close the connection
                break;
            }
            case PT.HEARTBEAT:
                break; // ignore
            default:
                // Store for awaited responses
                if (this._responseResolve && this._expectedType === payloadType) {
                    this._responseResolve(fields);
                    this._responseResolve = null;
                } else if (payloadType !== PT.HEARTBEAT) {
                    log('Unhandled message type: ' + payloadType);
                }
                break;
        }
    }

    handleSpotEvent(fields) {
        // ProtoOASpotEvent: field 2 = ctidTraderAccountId, field 3 = symbolId, field 4 = bid, field 5 = ask
        const symbolId = fields[3] || 0;
        const sub = this.symbolSubscriptions.get(symbolId);
        if (!sub) return;

        const digits = sub.digits || 5;
        const divisor = Math.pow(10, digits);
        const bid = fields[4] !== undefined ? fields[4] / divisor : null;
        const ask = fields[5] !== undefined ? fields[5] / divisor : null;

        // Apply same sanity check as PHP side
        let adjBid = bid, adjAsk = ask;
        if (bid && bid > 100000) {
            let sample = bid, extra = 0;
            while (sample > 100000 && extra < 6) { extra++; sample /= 10; }
            adjBid = bid / Math.pow(10, extra);
            adjAsk = ask ? ask / Math.pow(10, extra) : null;
        }

        log(`TICK ${sub.symbolName}: bid=${adjBid} ask=${adjAsk} (raw bid=${bid} ask=${ask})`);

        if (this.onSpot) {
            this.onSpot(sub.symbolName, adjBid, adjAsk, symbolId);
        }
    }

    awaitResponse(expectedType, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            this._expectedType = expectedType;
            this._responseResolve = resolve;
            this._responseReject = reject;
            setTimeout(() => {
                if (this._responseResolve === resolve) {
                    this._responseResolve = null;
                    this._responseReject = null;
                    reject(new Error('Response timeout for type ' + expectedType));
                }
            }, timeoutMs);
        });
    }

    async authenticate() {
        // App auth
        const appAuth = Buffer.concat([
            pbVarint(1, PT.APP_AUTH_REQ),
            pbBytes(2, CLIENT_ID),
            pbBytes(3, CLIENT_SECRET),
        ]);
        this.sendMessage(wrapMessage(PT.APP_AUTH_REQ, appAuth));
        await this.awaitResponse(PT.APP_AUTH_RES);
        log('App auth OK');

        // Version negotiation — required before other requests
        const versionReq = pbVarint(1, PT.VERSION_REQ);
        this.sendMessage(wrapMessage(PT.VERSION_REQ, versionReq));
        try {
            const vRes = await this.awaitResponse(PT.VERSION_RES, 5000);
            const version = vRes[2] ? vRes[2].toString() : 'unknown';
            log('API version: ' + version);
        } catch (e) {
            log('Version negotiation skipped: ' + e.message);
        }

        // Account auth
        const accAuth = Buffer.concat([
            pbVarint(1, PT.ACCOUNT_AUTH_REQ),
            pbVarint(2, this.ctid),
            pbBytes(3, this.accessToken),
        ]);
        this.sendMessage(wrapMessage(PT.ACCOUNT_AUTH_REQ, accAuth));
        await this.awaitResponse(PT.ACCOUNT_AUTH_RES);
        log('Account auth OK (ctid=' + this.ctid + ')');
        this.authenticated = true;
    }

    async resolveSymbolId(symbolName) {
        if (this.symbolNameToId.has(symbolName)) return this.symbolNameToId.get(symbolName);

        // Fetch symbol list
        const req = Buffer.concat([
            pbVarint(1, PT.SYMBOLS_LIST_REQ),
            pbVarint(2, this.ctid),
        ]);
        this.sendMessage(wrapMessage(PT.SYMBOLS_LIST_REQ, req));
        const res = await this.awaitResponse(PT.SYMBOLS_LIST_RES, 15000);

        // Parse symbols (field 3 = repeated ProtoOALightSymbol)
        const raw = res[3];
        const items = Array.isArray(raw) ? raw : (Buffer.isBuffer(raw) ? [raw] : []);
        const clean = (s) => s.replace(/[._](cash|raw|std|pro|micro|mini|m|i|k|z)$/i, '');

        for (const bytes of items) {
            if (!Buffer.isBuffer(bytes)) continue;
            const sym = pbDecode(bytes);
            const id = sym[1] || 0;
            const name = sym[2] ? sym[2].toString() : '';
            if (id && name) {
                this.symbolNameToId.set(name, id);
                this.symbolIdToName.set(id, name);
            }
        }

        // Direct match
        if (this.symbolNameToId.has(symbolName)) return this.symbolNameToId.get(symbolName);

        // Fuzzy match
        const cleanInput = clean(symbolName).toLowerCase();
        for (const [name, id] of this.symbolNameToId) {
            if (clean(name).toLowerCase() === cleanInput) {
                this.symbolNameToId.set(symbolName, id);
                return id;
            }
        }

        return null;
    }

    async getSymbolDigits(symbolId) {
        if (this.symbolDigits.has(symbolId)) return this.symbolDigits.get(symbolId);

        const req = Buffer.concat([
            pbVarint(1, PT.SYMBOL_BY_ID_REQ),
            pbVarint(2, this.ctid),
            pbVarint(3, symbolId),
        ]);
        this.sendMessage(wrapMessage(PT.SYMBOL_BY_ID_REQ, req));
        const res = await this.awaitResponse(PT.SYMBOL_BY_ID_RES);

        // Try field 3 and field 4 for ProtoOASymbol
        for (const fieldNum of [3, 4]) {
            const raw = res[fieldNum];
            const items = Array.isArray(raw) ? raw : (Buffer.isBuffer(raw) ? [raw] : []);
            for (const bytes of items) {
                if (!Buffer.isBuffer(bytes)) continue;
                const sym = pbDecode(bytes);
                if ((sym[1] || 0) === symbolId) {
                    let digits = sym[2] || 0;
                    const pipPos = sym[3] || null;
                    if (digits <= 0) digits = pipPos ? pipPos + 1 : 2;
                    this.symbolDigits.set(symbolId, digits);
                    return digits;
                }
            }
        }

        this.symbolDigits.set(symbolId, 5);
        return 5;
    }

    async subscribeSpots(symbolId) {
        const req = Buffer.concat([
            pbVarint(1, PT.SUBSCRIBE_SPOTS_REQ),
            pbVarint(2, this.ctid),
            pbVarint(3, symbolId),
        ]);
        this.sendMessage(wrapMessage(PT.SUBSCRIBE_SPOTS_REQ, req));
        try {
            await this.awaitResponse(PT.SUBSCRIBE_SPOTS_RES, 5000);
            log('Subscribed to spots for symbolId=' + symbolId + ' — confirmed');
        } catch (e) {
            log('Subscribe spots response: ' + e.message);
        }
    }

    async subscribeSymbol(symbolName, ws) {
        let symbolId = await this.resolveSymbolId(symbolName);
        if (!symbolId) {
            log('Symbol not found: ' + symbolName);
            return false;
        }

        const digits = await this.getSymbolDigits(symbolId);

        if (!this.symbolSubscriptions.has(symbolId)) {
            this.symbolSubscriptions.set(symbolId, {
                symbolName,
                digits,
                subscribers: new Set(),
            });
            await this.subscribeSpots(symbolId);
        }

        this.symbolSubscriptions.get(symbolId).subscribers.add(ws);
        log(`Client subscribed to ${symbolName} (id=${symbolId}, digits=${digits}), ${this.symbolSubscriptions.get(symbolId).subscribers.size} subscriber(s)`);
        return true;
    }

    async getPositions() {
        // Ensure symbol list is loaded for name resolution
        if (this.symbolIdToName.size === 0) {
            await this.resolveSymbolId('_');
        }

        // ProtoOAReconcileReq: field 1 = payloadType, field 2 = ctidTraderAccountId
        const req = Buffer.concat([
            pbVarint(1, PT.RECONCILE_REQ),
            pbVarint(2, this.ctid),
        ]);
        this.sendMessage(wrapMessage(PT.RECONCILE_REQ, req));
        const res = await this.awaitResponse(PT.RECONCILE_RES, 10000);

        // Parse positions from ReconcileRes
        // field 3 = repeated ProtoOAPosition
        const positions = [];
        const raw3 = res[3];
        const items = Array.isArray(raw3) ? raw3 : (Buffer.isBuffer(raw3) ? [raw3] : []);
        for (const bytes of items) {
            if (!Buffer.isBuffer(bytes)) continue;
            const pos = pbDecode(bytes);
            // ProtoOAPosition fields:
            // 1=positionId, 2=tradeData(embedded), 3=positionStatus, 4=swap, 5=price(entry),
            // 7=commission, 9=mirroringCommission, 10=guaranteedStopLoss, 11=usedMargin
            // 12=stopLoss, 13=takeProfit, 14=utcLastUpdateTimestamp

            // Parse tradeData (field 2) for symbol, volume, side, openTimestamp
            let symbolId = 0, volume = 0, tradeSide = 0, openTimestamp = 0;
            if (Buffer.isBuffer(pos[2])) {
                const td = pbDecode(pos[2]);
                symbolId = td[1] || 0;
                volume = td[2] || 0;
                tradeSide = td[3] || 0;
                openTimestamp = td[4] || 0;
            }

            // Parse entry price — can be double (wireType 1 = 8-byte Buffer) or varint
            let entryPrice = 0;
            if (Buffer.isBuffer(pos[5]) && pos[5].length === 8) {
                entryPrice = pos[5].readDoubleLE(0);
            } else {
                entryPrice = pos[5] || 0;
            }

            // Parse swap/commission — can also be 64-bit fixed
            function readNumField(val) {
                if (Buffer.isBuffer(val) && val.length === 8) return val.readDoubleLE(0);
                return val || 0;
            }

            const symbolName = this.symbolIdToName.get(symbolId);
            positions.push({
                positionId: pos[1] || 0,
                symbol: symbolName || 'ID:' + symbolId,
                symbolId: symbolId,
                side: tradeSide === 1 ? 'BUY' : 'SELL',
                volume: volume / 10000,
                rawVolume: volume, // raw volume for close requests
                entryPrice: entryPrice,
                swap: readNumField(pos[4]),
                commission: readNumField(pos[7]),
                stopLoss: readNumField(pos[12]),
                takeProfit: readNumField(pos[13]),
                openTime: openTimestamp ? new Date(openTimestamp).toISOString().replace('T', ' ').slice(0, 19) : '',
            });
        }

        return positions;
    }

    async getUnrealizedPnl() {
        // ProtoOAGetPositionUnrealizedPnlReq: field 1 = payloadType, field 2 = ctidTraderAccountId
        const req = Buffer.concat([
            pbVarint(1, PT.GET_POSITION_PNL_REQ),
            pbVarint(2, this.ctid),
        ]);
        this.sendMessage(wrapMessage(PT.GET_POSITION_PNL_REQ, req));
        const res = await this.awaitResponse(PT.GET_POSITION_PNL_RES, 10000);

        // field 3 = repeated ProtoOAPositionUnrealizedPnl
        const pnls = [];
        const raw3 = res[3];
        const items = Array.isArray(raw3) ? raw3 : (Buffer.isBuffer(raw3) ? [raw3] : []);
        for (const bytes of items) {
            if (!Buffer.isBuffer(bytes)) continue;
            const p = pbDecode(bytes);
            // field 1 = positionId, field 2 = grossUnrealizedPnl, field 3 = netUnrealizedPnl
            function readInt(val) {
                if (Buffer.isBuffer(val) && val.length === 8) {
                    // Signed int64 little-endian
                    return Number(val.readBigInt64LE(0));
                }
                return val || 0;
            }
            const entry = {
                positionId: readInt(p[1]),
                grossPnl: readInt(p[2]),
                netPnl: readInt(p[3]),
            };
            pnls.push(entry);
        }

        if (pnls.length > 0) {
            log('PNL data: ' + JSON.stringify(pnls));
        }

        return pnls;
    }

    async closePosition(positionId, volume) {
        // ProtoOAClosePositionReq: field 1 = payloadType, field 2 = ctidTraderAccountId,
        // field 3 = positionId, field 4 = volume (in cents, full volume to close entirely)
        const req = Buffer.concat([
            pbVarint(1, PT.CLOSE_POSITION_REQ),
            pbVarint(2, this.ctid),
            pbVarint(3, positionId),
            pbVarint(4, volume),
        ]);
        this.sendMessage(wrapMessage(PT.CLOSE_POSITION_REQ, req));
        const res = await this.awaitResponse(PT.CLOSE_POSITION_RES, 15000);
        log('Position ' + positionId + ' closed');
        return res;
    }

    unsubscribeClient(ws) {
        for (const [symbolId, sub] of this.symbolSubscriptions) {
            sub.subscribers.delete(ws);
            if (sub.subscribers.size === 0) {
                // Unsubscribe from cTrader
                const req = Buffer.concat([
                    pbVarint(1, PT.UNSUBSCRIBE_SPOTS_REQ),
                    pbVarint(2, this.ctid),
                    pbVarint(3, symbolId),
                ]);
                this.sendMessage(wrapMessage(PT.UNSUBSCRIBE_SPOTS_REQ, req));
                this.symbolSubscriptions.delete(symbolId);
                log(`Unsubscribed from ${sub.symbolName} (no more clients)`);
            }
        }
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        if (this.socket) { this.socket.destroy(); this.socket = null; }
    }
}

// ─── Logging ───
function log(msg) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ─── Main ───
const ctrader = new CtraderStream();
let isConnected = false;

// Spot event → broadcast to subscribed WebSocket clients
ctrader.onSpot = (symbolName, bid, ask, symbolId) => {
    const sub = ctrader.symbolSubscriptions.get(symbolId);
    if (!sub) return;

    const msg = JSON.stringify({
        type: 'tick',
        symbol: symbolName,
        bid,
        ask,
        time: Date.now(),
    });

    for (const ws of sub.subscribers) {
        if (ws.readyState === 1) { // OPEN
            ws.send(msg);
        }
    }
};

// WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT });
log(`WebSocket server listening on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws) => {
    log('Client connected (' + wss.clients.size + ' total)');

    ws.on('message', async (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type !== 'getPnl') log('Incoming: ' + msg.type);
        switch (msg.type) {
            case 'auth':
                // Client sends: { type: 'auth', accessToken, ctid, isLive }
                if (!isConnected) {
                    // Try the requested server first, then fallback to the other
                    // Always try LIVE first — DEMO servers may reject spot subscriptions
                    const tryOrder = [true, false];
                    let connected = false;
                    for (const tryLive of tryOrder) {
                        try {
                            log('Trying ' + (tryLive ? 'LIVE' : 'DEMO') + ' server...');
                            await ctrader.connect(msg.accessToken, msg.ctid, tryLive);
                            isConnected = true;
                            connected = true;
                            ws.send(JSON.stringify({ type: 'auth', status: 'ok', server: tryLive ? 'live' : 'demo' }));
                            log('cTrader authenticated on ' + (tryLive ? 'LIVE' : 'DEMO'));
                            break;
                        } catch (e) {
                            log((tryLive ? 'LIVE' : 'DEMO') + ' auth failed: ' + e.message);
                            ctrader.disconnect();
                        }
                    }
                    if (!connected) {
                        ws.send(JSON.stringify({ type: 'auth', status: 'error', error: 'Auth failed on both servers' }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'auth', status: 'ok', cached: true }));
                }
                break;

            case 'subscribe':
                // Client sends: { type: 'subscribe', symbol: 'USTEC' }
                if (!isConnected) {
                    ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated. Send auth first.' }));
                    return;
                }
                const ok = await ctrader.subscribeSymbol(msg.symbol, ws);
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    symbol: msg.symbol,
                    status: ok ? 'ok' : 'error',
                }));
                break;

            case 'getPositions':
                if (!isConnected) { ws.send(JSON.stringify({ type: 'error', error: 'Not connected' })); return; }
                try {
                    const positions = await ctrader.getPositions();
                    ws.send(JSON.stringify({ type: 'positions', positions }));
                    log('Sent ' + positions.length + ' positions to client');
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'error', error: 'getPositions: ' + e.message }));
                }
                break;

            case 'getPnl':
                if (!isConnected) { ws.send(JSON.stringify({ type: 'error', error: 'Not connected' })); return; }
                try {
                    const pnls = await ctrader.getUnrealizedPnl();
                    ws.send(JSON.stringify({ type: 'pnl', pnls }));
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'error', error: 'getPnl: ' + e.message }));
                }
                break;

            case 'getLiveData':
                // Combined positions + PNL in one sequential request (avoids awaitResponse race)
                if (!isConnected) { ws.send(JSON.stringify({ type: 'error', error: 'Not connected' })); return; }
                try {
                    const livePositions = await ctrader.getPositions();
                    const livePnls = await ctrader.getUnrealizedPnl();
                    ws.send(JSON.stringify({ type: 'liveData', positions: livePositions, pnls: livePnls }));
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'error', error: 'getLiveData: ' + e.message }));
                }
                break;

            case 'closePosition':
                // Close a single position: { type: 'closePosition', positionId, volume }
                if (!isConnected) { ws.send(JSON.stringify({ type: 'error', error: 'Not connected' })); return; }
                try {
                    await ctrader.closePosition(msg.positionId, msg.volume);
                    ws.send(JSON.stringify({ type: 'positionClosed', positionId: msg.positionId }));
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'closeError', positionId: msg.positionId, error: e.message }));
                }
                break;

            case 'closeAllPositions':
                // Close all open positions sequentially
                if (!isConnected) { ws.send(JSON.stringify({ type: 'error', error: 'Not connected' })); return; }
                try {
                    const allPositions = await ctrader.getPositions();
                    let closed = 0, failed = 0;
                    for (const pos of allPositions) {
                        try {
                            await ctrader.closePosition(pos.positionId, pos.volume);
                            closed++;
                        } catch (e) {
                            log('Failed to close ' + pos.positionId + ': ' + e.message);
                            failed++;
                        }
                    }
                    ws.send(JSON.stringify({ type: 'allPositionsClosed', closed, failed, total: allPositions.length }));
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'closeError', error: e.message }));
                }
                break;

            default:
                break;
        }
    });

    ws.on('close', () => {
        ctrader.unsubscribeClient(ws);
        log('Client disconnected (' + wss.clients.size + ' total)');
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('Shutting down...');
    ctrader.disconnect();
    wss.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Shutting down...');
    ctrader.disconnect();
    wss.close();
    process.exit(0);
});
