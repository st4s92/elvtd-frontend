<?php

namespace App\Service;

/**
 * cTrader Open API market data service.
 * Connects via TCP + Protobuf to fetch historical candles.
 * No external dependencies (protobuf encoding/decoding built-in).
 */
class CtraderMarketData
{
    private const HOST_LIVE = 'live.ctraderapi.com';
    private const HOST_DEMO = 'demo.ctraderapi.com';
    private const PORT = 5035;

    // Payload types
    private const PT_APP_AUTH_REQ = 2100;
    private const PT_APP_AUTH_RES = 2101;
    private const PT_ACCOUNT_AUTH_REQ = 2102;
    private const PT_ACCOUNT_AUTH_RES = 2103;
    private const PT_SYMBOLS_LIST_REQ = 2114;
    private const PT_SYMBOLS_LIST_RES = 2115;
    private const PT_SYMBOL_BY_ID_REQ = 2116;
    private const PT_SYMBOL_BY_ID_RES = 2117;
    private const PT_GET_TRENDBARS_REQ = 2137;
    private const PT_GET_TRENDBARS_RES = 2138;
    private const PT_ERROR_RES = 2142;
    private const PT_GET_ACCOUNTS_REQ = 2149;
    private const PT_GET_ACCOUNTS_RES = 2150;
    private const PT_HEARTBEAT = 51;

    // Trendbar period enum
    private const PERIOD_MAP = [
        '1'   => 1,  // M1
        '5'   => 5,  // M5
        '15'  => 7,  // M15
        '30'  => 8,  // M30
        '60'  => 9,  // H1
        '240' => 10, // H4
        'D'   => 12, // D1
        '1D'  => 12,
    ];

    private $socket = null;
    private string $clientId;
    private string $clientSecret;
    private string $cacheDir;

    public function __construct(
        string $clientId = '14630_Dwxh7PHfgv5R8mjONQMBC8PR6InylkpbxuEyGZUX2PhxPfviXo',
        string $clientSecret = 'APVcr7mO3BcKsePjam245sjtBhcv3WgJQezLAMclN7QAMUMCLn'
    ) {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->cacheDir = sys_get_temp_dir() . '/ctrader_cache';
        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0755, true);
        }
    }

    // ════════════════════════════════════════════════════
    // ── Public API ──
    // ════════════════════════════════════════════════════

    /**
     * Fetch OHLCV candle data from cTrader Open API.
     *
     * @return array{t: int[], o: float[], h: float[], l: float[], c: float[], v: int[]}|null
     */
    /** @var string[] Debug log for the current request */
    public array $debug = [];

    public function getCandles(
        string $accessToken,
        int $login,
        string $symbolName,
        string $resolution,
        int $fromTimestamp,
        int $toTimestamp,
        bool $isLive = true,
        ?int $ctid = null
    ): ?array {
        $this->debug = [];
        $period = self::PERIOD_MAP[$resolution] ?? 5;
        $this->debug[] = "period=$period isLive=" . ($isLive ? 'true' : 'false') . ($ctid ? " ctid=$ctid" : '');

        // Try live first, then demo if live fails
        $hosts = $isLive ? [true, false] : [false, true];

        foreach ($hosts as $tryLive) {
            $this->debug[] = 'trying ' . ($tryLive ? 'LIVE' : 'DEMO') . ' server...';
            try {
                $result = $this->doGetCandles($accessToken, $login, $symbolName, $period, $fromTimestamp, $toTimestamp, $tryLive, $ctid);
                if ($result && !empty($result['t'])) {
                    $this->debug[] = 'SUCCESS on ' . ($tryLive ? 'LIVE' : 'DEMO') . ': ' . count($result['t']) . ' candles';
                    $this->disconnect();
                    return $result;
                }
                $this->debug[] = ($tryLive ? 'LIVE' : 'DEMO') . ': empty result, trying other...';
                $this->disconnect();
            } catch (\Exception $e) {
                $this->debug[] = ($tryLive ? 'LIVE' : 'DEMO') . ' error: ' . $e->getMessage();
                $this->disconnect();
            }
        }

        return null;
    }

    private function doGetCandles(
        string $accessToken,
        int $login,
        string $symbolName,
        int $period,
        int $fromTimestamp,
        int $toTimestamp,
        bool $isLive,
        ?int $ctid = null
    ): ?array {
        $this->connect($isLive);
        $this->debug[] = 'connected to ' . ($isLive ? self::HOST_LIVE : self::HOST_DEMO);

        // 1. App auth
        $this->sendMessage($this->buildAppAuthReq());
        $res = $this->receiveExpected(self::PT_APP_AUTH_RES);
        $this->debug[] = 'app auth OK';

        // 2. Resolve ctid — use provided ctid or look up via GetAccounts
        if (!$ctid) {
            $this->sendMessage($this->buildGetAccountsReq($accessToken));
            $res = $this->receiveExpected(self::PT_GET_ACCOUNTS_RES);

            $accounts = $this->getRepeatedEmbedded($res['fields'], 3);
            $this->debug[] = 'found ' . count($accounts) . ' account(s) for token';
            foreach ($accounts as $i => $acc) {
                $this->debug[] = "  account[$i]: ctid=" . ($acc[1] ?? '?') . ' isLive=' . ($acc[2] ?? '?') . ' login=' . ($acc[3] ?? '?');
            }

            $ctid = $this->extractCtidByLogin($res, $login);
            if (!$ctid) {
                throw new \RuntimeException("ctid not found for login $login");
            }
            $this->debug[] = "resolved ctid=$ctid for login=$login";
        } else {
            $this->debug[] = "using provided ctid=$ctid";
        }

        // 3. Account auth
        $this->sendMessage($this->buildAccountAuthReq($ctid, $accessToken));
        $this->receiveExpected(self::PT_ACCOUNT_AUTH_RES);
        $this->debug[] = 'account auth OK';

        // 4. Symbol resolve
        $symbolInfo = $this->resolveSymbol($ctid, $symbolName);
        if (!$symbolInfo) {
            throw new \RuntimeException("symbol not found: $symbolName");
        }
        $this->debug[] = "symbol resolved: {$symbolInfo['name']} → id={$symbolInfo['id']} digits={$symbolInfo['digits']}";

        // 5. Trendbars
        $fromMs = $fromTimestamp * 1000;
        $toMs = $toTimestamp * 1000;
        $this->debug[] = "requesting trendbars: from=" . date('Y-m-d H:i', $fromTimestamp) . " to=" . date('Y-m-d H:i', $toTimestamp);

        $this->sendMessage($this->buildGetTrendbarsReq($ctid, $symbolInfo['id'], $period, $fromMs, $toMs));
        $res = $this->receiveExpected(self::PT_GET_TRENDBARS_RES);

        $bars = $this->getRepeatedEmbedded($res['fields'], 5);
        $this->debug[] = 'raw trendbars received: ' . count($bars);

        $candles = $this->parseTrendbars($res, $symbolInfo['digits']);
        $this->debug[] = 'parsed candles: ' . count($candles['t'] ?? []);

        return $candles;
    }

    // ════════════════════════════════════════════════════
    // ── Symbol Resolution (with caching) ──
    // ════════════════════════════════════════════════════

    private function resolveSymbol(int $ctid, string $symbolName): ?array
    {
        // Check cache first
        $cached = $this->loadSymbolCache($ctid);
        if ($cached && isset($cached[$symbolName])) {
            return $cached[$symbolName];
        }

        // Fetch symbol list
        $this->sendMessage($this->buildSymbolsListReq($ctid));
        $res = $this->receiveExpected(self::PT_SYMBOLS_LIST_RES);

        $symbols = $this->parseSymbolsList($res);
        if (!isset($symbols[$symbolName])) {
            // Try fuzzy match: remove suffixes like .cash, _m, etc.
            $clean = preg_replace('/[._](cash|raw|std|pro|micro|mini|m|i|k|z)$/i', '', $symbolName);
            foreach ($symbols as $name => $info) {
                $cleanName = preg_replace('/[._](cash|raw|std|pro|micro|mini|m|i|k|z)$/i', '', $name);
                if (strcasecmp($clean, $cleanName) === 0 || strcasecmp($symbolName, $name) === 0) {
                    $symbolName = $name;
                    break;
                }
            }
        }

        if (!isset($symbols[$symbolName])) {
            return null;
        }

        $symbolId = $symbols[$symbolName]['id'];

        // Fetch symbol details for digits
        $this->sendMessage($this->buildSymbolByIdReq($ctid, $symbolId));
        $res = $this->receiveExpected(self::PT_SYMBOL_BY_ID_RES);
        $digits = $this->parseSymbolDigits($res, $symbolId);

        $result = [
            'id' => $symbolId,
            'name' => $symbolName,
            'digits' => $digits,
        ];

        // Update cache
        if (!$cached) $cached = [];
        $cached[$symbolName] = $result;
        $this->saveSymbolCache($ctid, $cached);

        return $result;
    }

    // ════════════════════════════════════════════════════
    // ── Message Builders ──
    // ════════════════════════════════════════════════════

    // NOTE: In cTrader protobuf, field 1 is always payloadType in inner messages.
    // Actual data fields start at field 2.

    private function buildAppAuthReq(): string
    {
        $payload = $this->pbVarint(1, self::PT_APP_AUTH_REQ)  // field 1 = payloadType
                 . $this->pbString(2, $this->clientId)         // field 2 = clientId
                 . $this->pbString(3, $this->clientSecret);    // field 3 = clientSecret
        return $this->wrapMessage(self::PT_APP_AUTH_REQ, $payload);
    }

    private function buildGetAccountsReq(string $accessToken): string
    {
        $payload = $this->pbVarint(1, self::PT_GET_ACCOUNTS_REQ) // field 1 = payloadType
                 . $this->pbString(2, $accessToken);              // field 2 = accessToken
        return $this->wrapMessage(self::PT_GET_ACCOUNTS_REQ, $payload);
    }

    private function buildAccountAuthReq(int $ctid, string $accessToken): string
    {
        $payload = $this->pbVarint(1, self::PT_ACCOUNT_AUTH_REQ) // field 1 = payloadType
                 . $this->pbVarint(2, $ctid)                      // field 2 = ctidTraderAccountId
                 . $this->pbString(3, $accessToken);               // field 3 = accessToken
        return $this->wrapMessage(self::PT_ACCOUNT_AUTH_REQ, $payload);
    }

    private function buildSymbolsListReq(int $ctid): string
    {
        $payload = $this->pbVarint(1, self::PT_SYMBOLS_LIST_REQ) // field 1 = payloadType
                 . $this->pbVarint(2, $ctid);                     // field 2 = ctidTraderAccountId
        return $this->wrapMessage(self::PT_SYMBOLS_LIST_REQ, $payload);
    }

    private function buildSymbolByIdReq(int $ctid, int $symbolId): string
    {
        $payload = $this->pbVarint(1, self::PT_SYMBOL_BY_ID_REQ) // field 1 = payloadType
                 . $this->pbVarint(2, $ctid)                      // field 2 = ctidTraderAccountId
                 . $this->pbVarint(3, $symbolId);                  // field 3 = symbolId
        return $this->wrapMessage(self::PT_SYMBOL_BY_ID_REQ, $payload);
    }

    private function buildGetTrendbarsReq(int $ctid, int $symbolId, int $period, int $fromMs, int $toMs): string
    {
        $payload = $this->pbVarint(1, self::PT_GET_TRENDBARS_REQ) // field 1 = payloadType
                 . $this->pbVarint(2, $ctid)                       // field 2 = ctidTraderAccountId
                 . $this->pbVarint(3, $fromMs)                     // field 3 = fromTimestamp
                 . $this->pbVarint(4, $toMs)                       // field 4 = toTimestamp
                 . $this->pbVarint(5, $period)                     // field 5 = period
                 . $this->pbVarint(6, $symbolId);                  // field 6 = symbolId
        return $this->wrapMessage(self::PT_GET_TRENDBARS_REQ, $payload);
    }

    private function wrapMessage(int $payloadType, string $payload): string
    {
        return $this->pbVarint(1, $payloadType) . $this->pbBytes(2, $payload);
    }

    // ════════════════════════════════════════════════════
    // ── Response Parsers ──
    // ════════════════════════════════════════════════════

    private function extractCtidByLogin(array $res, int $login): ?int
    {
        // Field 3 = repeated CtidTraderAccount (field 2 = permissionScope)
        $accounts = $this->getRepeatedEmbedded($res['fields'], 3);
        foreach ($accounts as $acc) {
            $traderLogin = $acc[3] ?? null; // field 3 = traderLogin
            $ctid = $acc[1] ?? null;        // field 1 = ctidTraderAccountId
            if ($traderLogin !== null && (int)$traderLogin === $login && $ctid !== null) {
                return (int)$ctid;
            }
        }

        // Fallback: if traderLogin isn't in the response, use first account
        if (!empty($accounts)) {
            return (int)($accounts[0][1] ?? 0);
        }

        return null;
    }

    private function parseSymbolsList(array $res): array
    {
        $symbols = [];
        // Field 3 = repeated ProtoOALightSymbol
        $items = $this->getRepeatedEmbedded($res['fields'], 3);
        foreach ($items as $sym) {
            $id = (int)($sym[1] ?? 0);    // field 1 = symbolId
            $name = $sym[2] ?? '';          // field 2 = symbolName (string)
            if ($id && $name) {
                $symbols[$name] = ['id' => $id, 'name' => $name];
            }
        }
        return $symbols;
    }

    private function parseSymbolDigits(array $res, int $targetSymbolId): int
    {
        // Try field 3 and field 4 (different cTrader API versions put ProtoOASymbol in different fields)
        foreach ([3, 4] as $fieldNum) {
            $items = $this->getRepeatedEmbedded($res['fields'], $fieldNum);
            foreach ($items as $sym) {
                $id = (int)($sym[1] ?? 0);
                if ($id === $targetSymbolId) {
                    $digits = (int)($sym[2] ?? 0);
                    $pipPosition = isset($sym[3]) ? (int)$sym[3] : null;

                    // digits=0 is invalid for trading instruments — use pipPosition+1 or default
                    if ($digits <= 0) {
                        if ($pipPosition !== null && $pipPosition > 0) {
                            $digits = $pipPosition + 1;
                        } else {
                            $digits = 2; // safe default for indices
                        }
                    }

                    $this->debug[] = "parseSymbolDigits: id=$id digits=$digits pipPosition=" . ($pipPosition ?? 'null') . " (field $fieldNum)";
                    return $digits;
                }
            }
        }
        return 5; // default
    }

    private function parseTrendbars(array $res, int $digits): array
    {
        $divisor = pow(10, $digits);
        $t = []; $o = []; $h = []; $l = []; $c = []; $v = [];

        // Field 5 = repeated ProtoOATrendbar
        $bars = $this->getRepeatedEmbedded($res['fields'], 5);
        foreach ($bars as $bar) {
            $volume = $bar[3] ?? 0;                // field 3: volume
            $lowRaw = $bar[5] ?? 0;                // field 5: low (pipettes)
            $deltaOpen = $bar[6] ?? 0;             // field 6: deltaOpen
            $deltaClose = $bar[7] ?? 0;            // field 7: deltaClose
            $deltaHigh = $bar[8] ?? 0;             // field 8: deltaHigh
            $timestampMinutes = $bar[9] ?? 0;      // field 9: utcTimestampInMinutes

            $lowPrice = $lowRaw / $divisor;
            $openPrice = ($lowRaw + $deltaOpen) / $divisor;
            $closePrice = ($lowRaw + $deltaClose) / $divisor;
            $highPrice = ($lowRaw + $deltaHigh) / $divisor;

            $t[] = (int)$timestampMinutes * 60; // seconds
            $o[] = round($openPrice, $digits);
            $h[] = round($highPrice, $digits);
            $l[] = round($lowPrice, $digits);
            $c[] = round($closePrice, $digits);
            $v[] = (int)$volume;
        }

        // Sanity check: if values are unreasonably large, auto-correct the divisor
        // (e.g., USTEC raw ~24000000 should be ~24000 after dividing by 1000)
        if (!empty($c) && $c[0] > 100000) {
            $this->debug[] = "sanity check: values too large (first close={$c[0]}), auto-adjusting divisor";
            $sampleClose = $c[0];
            $extraDigits = 0;
            while ($sampleClose > 100000 && $extraDigits < 6) {
                $extraDigits++;
                $sampleClose /= 10;
            }
            if ($extraDigits > 0) {
                $newDivisor = pow(10, $extraDigits);
                $digits += $extraDigits;
                $this->debug[] = "auto-adjusted: extra $extraDigits digits, new effective digits=$digits";
                foreach ($o as $i => $val) {
                    $o[$i] = round($val / $newDivisor, $digits);
                    $h[$i] = round($h[$i] / $newDivisor, $digits);
                    $l[$i] = round($l[$i] / $newDivisor, $digits);
                    $c[$i] = round($c[$i] / $newDivisor, $digits);
                }
            }
        }

        return ['t' => $t, 'o' => $o, 'h' => $h, 'l' => $l, 'c' => $c, 'v' => $v];
    }

    // ════════════════════════════════════════════════════
    // ── TCP Connection ──
    // ════════════════════════════════════════════════════

    private function connect(bool $isLive = true): void
    {
        $host = $isLive ? self::HOST_LIVE : self::HOST_DEMO;
        $ctx = stream_context_create(['ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ]]);
        $this->socket = @stream_socket_client(
            "ssl://{$host}:" . self::PORT,
            $errno, $errstr, 10,
            STREAM_CLIENT_CONNECT,
            $ctx
        );
        if (!$this->socket) {
            throw new \RuntimeException("cTrader connection failed: $errstr ($errno)");
        }
        stream_set_timeout($this->socket, 15);
    }

    private function sendMessage(string $message): void
    {
        $header = pack('N', strlen($message));
        $written = @fwrite($this->socket, $header . $message);
        if ($written === false) {
            throw new \RuntimeException('Failed to send message to cTrader');
        }
    }

    private function receiveExpected(int $expectedType, int $maxAttempts = 10): array
    {
        for ($i = 0; $i < $maxAttempts; $i++) {
            $res = $this->receiveMessage();
            if ($res['payloadType'] === $expectedType) {
                return $res;
            }
            if ($res['payloadType'] === self::PT_ERROR_RES) {
                $errorCode = $res['fields'][3] ?? 'UNKNOWN';
                $errorDesc = $res['fields'][4] ?? '';
                throw new \RuntimeException("cTrader error: $errorCode - $errorDesc");
            }
            // Skip heartbeats and other async messages
        }
        throw new \RuntimeException("Expected response type $expectedType not received");
    }

    private function receiveMessage(): array
    {
        $header = $this->readExact(4);
        $length = unpack('N', $header)[1];

        if ($length > 1048576) { // 1MB max
            throw new \RuntimeException("Message too large: $length bytes");
        }

        $body = $this->readExact($length);

        // Decode wrapper (ProtoMessage)
        $wrapper = $this->pbDecode($body);
        $payloadType = (int)($wrapper[1] ?? 0); // field 1 = payloadType
        $payloadBytes = $wrapper[2] ?? '';       // field 2 = payload

        // Decode inner payload
        $fields = is_string($payloadBytes) ? $this->pbDecode($payloadBytes) : [];

        return [
            'payloadType' => $payloadType,
            'fields' => $fields,
        ];
    }

    private function readExact(int $length): string
    {
        $data = '';
        $remaining = $length;
        $retries = 0;
        while ($remaining > 0 && $retries < 100) {
            $chunk = @fread($this->socket, min($remaining, 8192));
            if ($chunk === false || $chunk === '') {
                $meta = stream_get_meta_data($this->socket);
                if ($meta['timed_out']) {
                    throw new \RuntimeException('cTrader connection timed out');
                }
                $retries++;
                usleep(10000); // 10ms
                continue;
            }
            $data .= $chunk;
            $remaining -= strlen($chunk);
            $retries = 0;
        }
        if ($remaining > 0) {
            throw new \RuntimeException("Failed to read $length bytes from cTrader");
        }
        return $data;
    }

    private function disconnect(): void
    {
        if ($this->socket) {
            @fclose($this->socket);
            $this->socket = null;
        }
    }

    // ════════════════════════════════════════════════════
    // ── Protobuf Encoder ──
    // ════════════════════════════════════════════════════

    /** Encode unsigned varint */
    private function encodeVarint(int $value): string
    {
        $buf = '';
        if ($value < 0) {
            // Negative int64: encode as 10-byte varint (two's complement)
            for ($i = 0; $i < 9; $i++) {
                $buf .= chr(($value & 0x7F) | 0x80);
                $value >>= 7;
            }
            $buf .= chr($value & 0x01);
            return $buf;
        }
        do {
            $byte = $value & 0x7F;
            $value >>= 7;
            if ($value !== 0) $byte |= 0x80;
            $buf .= chr($byte);
        } while ($value !== 0);
        return $buf;
    }

    /** Encode a varint field */
    private function pbVarint(int $fieldNum, int $value): string
    {
        return $this->encodeVarint(($fieldNum << 3) | 0) . $this->encodeVarint($value);
    }

    /** Encode a length-delimited field (bytes/string/embedded) */
    private function pbBytes(int $fieldNum, string $data): string
    {
        return $this->encodeVarint(($fieldNum << 3) | 2) . $this->encodeVarint(strlen($data)) . $data;
    }

    /** Alias for pbBytes (strings are length-delimited in protobuf) */
    private function pbString(int $fieldNum, string $data): string
    {
        return $this->pbBytes($fieldNum, $data);
    }

    // ════════════════════════════════════════════════════
    // ── Protobuf Decoder ──
    // ════════════════════════════════════════════════════

    private function decodeVarint(string $data, int &$offset): int
    {
        $result = 0;
        $shift = 0;
        do {
            if ($offset >= strlen($data)) {
                throw new \RuntimeException('Varint decode: unexpected end of data');
            }
            $byte = ord($data[$offset++]);
            $result |= ($byte & 0x7F) << $shift;
            $shift += 7;
            if ($shift >= 64) break; // prevent infinite loop
        } while ($byte & 0x80);
        return $result;
    }

    /**
     * Decode a protobuf message into [fieldNumber => value] map.
     * Repeated fields become arrays.
     */
    private function pbDecode(string $data): array
    {
        $fields = [];
        $offset = 0;
        $len = strlen($data);

        while ($offset < $len) {
            try {
                $key = $this->decodeVarint($data, $offset);
            } catch (\Exception $e) {
                break;
            }
            $fieldNum = $key >> 3;
            $wireType = $key & 0x07;

            if ($fieldNum === 0) break; // invalid

            $value = null;
            switch ($wireType) {
                case 0: // varint
                    $value = $this->decodeVarint($data, $offset);
                    break;
                case 1: // 64-bit fixed
                    if ($offset + 8 > $len) break 2;
                    $value = substr($data, $offset, 8);
                    $offset += 8;
                    break;
                case 2: // length-delimited
                    $length = $this->decodeVarint($data, $offset);
                    if ($offset + $length > $len) break 2;
                    $value = substr($data, $offset, $length);
                    $offset += $length;
                    break;
                case 5: // 32-bit fixed
                    if ($offset + 4 > $len) break 2;
                    $value = substr($data, $offset, 4);
                    $offset += 4;
                    break;
                default:
                    break 2; // unknown wire type
            }

            // Handle repeated fields: store as array
            if (isset($fields[$fieldNum])) {
                if (!is_array($fields[$fieldNum]) || !isset($fields[$fieldNum][0])) {
                    $fields[$fieldNum] = [$fields[$fieldNum]];
                }
                $fields[$fieldNum][] = $value;
            } else {
                $fields[$fieldNum] = $value;
            }
        }

        return $fields;
    }

    /**
     * Extract repeated embedded messages from a field.
     * Returns array of decoded sub-messages.
     */
    private function getRepeatedEmbedded(array $fields, int $fieldNum): array
    {
        if (!isset($fields[$fieldNum])) return [];
        $raw = $fields[$fieldNum];
        if (!is_array($raw)) $raw = [$raw];
        $results = [];
        foreach ($raw as $bytes) {
            if (is_string($bytes)) {
                $results[] = $this->pbDecode($bytes);
            }
        }
        return $results;
    }

    // ════════════════════════════════════════════════════
    // ── Symbol Cache ──
    // ════════════════════════════════════════════════════

    private function loadSymbolCache(int $ctid): ?array
    {
        $file = $this->cacheDir . '/symbols_' . $ctid . '.json';
        if (!file_exists($file)) return null;
        if (filemtime($file) < time() - 3600) return null; // 1 hour TTL
        $data = @json_decode(@file_get_contents($file), true);
        return is_array($data) ? $data : null;
    }

    private function saveSymbolCache(int $ctid, array $data): void
    {
        $file = $this->cacheDir . '/symbols_' . $ctid . '.json';
        @file_put_contents($file, json_encode($data));
    }
}
