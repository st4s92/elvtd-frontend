# ELVTD Frontend (Symfony)

> Webtrader-Frontend der ELVTD Finance Plattform — verbindet Benutzer mit cTrader, MT4/MT5 Trading-Accounts und dem Copy-Trading-System.

## Architektur-Überblick

```
                        ┌─────────────────────────┐
                        │   Browser (Client)       │
                        │   Bootstrap 5 + Chart.js │
                        │   TradingView Charts     │
                        └────────┬────────┬────────┘
                                 │        │
                          HTTP   │        │ WebSocket
                                 │        │
                    ┌────────────▼──┐  ┌──▼──────────────┐
                    │  Symfony App  │  │  Node.js WS      │
                    │  (PHP 8.0+)  │  │  Server (8080)    │
                    │  Apache       │  │  Protobuf + TLS   │
                    └──┬────────┬──┘  └──┬───────────────┘
                       │        │        │
                REST   │        │ OAuth  │ TCP/TLS (5035)
                       │        │        │
              ┌────────▼──┐  ┌──▼────────▼────────┐
              │  Backend   │  │  cTrader Open API   │
              │  (.NET)    │  │  (Live + Demo)      │
              │  :5021     │  │                     │
              └────────────┘  └─────────────────────┘
```

## Rolle im ELVTD-Ökosystem

| Komponente | Repo | Aufgabe |
|------------|------|---------|
| **Frontend (dieses Repo)** | `elvtd-frontend` | Web-UI, Charts, Account-Verwaltung, Live-Trading |
| Backend API | `elvtd-backend` | Datenhaltung, Copy-Trading-Logik, RabbitMQ-Orchestrierung |
| Tools | `elvtd-tools` | Go Bridges auf Windows VMs, MT4/MT5 Installer, cTrader Copier |

Das Frontend ist die **einzige Benutzer-Schnittstelle** — alle Aktionen (Account anlegen, Positionen schließen, Agent abonnieren) laufen über dieses Repo.

## Tech Stack

- **PHP 8.0+** / Symfony 5.4+
- **Twig** Templates mit Bootstrap 5 + Material Dashboard CSS
- **TradingView Charting Library** für Preischarts
- **Chart.js** für Statistik-Diagramme
- **Node.js WebSocket Server** (`ws-server.js`) für Echtzeit-Tick-Streaming
- **Protobuf** (protobufjs) für cTrader-Kommunikation
- **Apache** (nicht Nginx) mit Rewrite Rules
- **Doctrine ORM** für lokale DB

## Hauptfunktionen

### Accounts
- cTrader-Accounts per **OAuth2** verbinden (Access + Refresh Token)
- MT4/MT5 Accounts manuell anlegen
- Token-Ablauf-Warnung + Re-Autorisierung
- Account-Details mit Balance, Equity, offenen Positionen

### Live Trading (WebSocket)
- Echtzeit-Ticks von cTrader über `ws-server.js`
- Live Positionen + unrealisierte PnL
- Positions schließen (einzeln oder alle)
- Symbol-Subscriptions

### Copy-Trading (Agents)
- Agent-Verzeichnis mit Performance-Statistiken (APY, Winrate, Drawdown, Sharpe)
- Agent abonnieren mit konfigurierbarem Multiplier (0.5x - 5.0x)
- Subscriber-Verwaltung

### Charts
- TradingView Charting Library
- 8 Timeframes (1m, 5m, 15m, 30m, 1h, 4h, 1D)
- Daten primär von cTrader (Protobuf), Fallback auf Yahoo Finance

### Helpdesk
- Ticket-System (erstellen, kommentieren, Status verfolgen)
- Admin-Dashboard mit Statistiken (offen, in Bearbeitung, geschlossen)

## Kommunikation mit anderen Systemen

### → Backend (.NET API)
Über `DeniesClient.php` (HTTP REST):
```
POST /api/trader/account          — Account registrieren
GET  /api/trader/account/{id}/detail — Live-Daten (Balance, Equity)
GET  /api/trader/orders/paginated — Offene/geschlossene Positionen
DELETE /api/trader/orders/active-order/{id} — Position schließen
POST /api/trader/master-slave     — Copy-Trading-Beziehung anlegen
POST /api/trader/master-slave-config — Multiplier setzen
```

### → cTrader Open API
Über `CtraderMarketData.php` (TCP/TLS + Protobuf):
- Historische Candles für Charts
- Symbol-Auflösung (Name → ID)
- Direkte Protobuf-Kommunikation (kein SDK)

### → cTrader via WebSocket Server
Über `ws-server.js` (TLS/TCP auf Port 5035):
- App-Auth + Account-Auth
- Spot-Subscriptions (Live-Ticks)
- Position-Reconciliation
- PnL-Berechnung
- Order-Close-Commands

## Projektstruktur

```
elvtd/
├── src/
│   ├── Controller/          # 28 Controller (Account, Agent, Chart, Order, etc.)
│   ├── Entity/              # Account, Agent, Order, User, Subscription, etc.
│   ├── Service/             # CtraderMarketData, DeniesClient, MetaApiClient
│   ├── Repository/          # Doctrine Repositories
│   ├── Security/            # Authentication
│   └── HelpdeskBundle/      # Helpdesk-Modul (Controller, Entity, Form)
├── templates/               # Twig Templates (13 Verzeichnisse)
├── public/
│   ├── js/                  # Frontend JS (agents.js, etc.)
│   ├── css/                 # Custom Styles
│   ├── assets/              # Bootstrap, Material Dashboard
│   └── charting/            # TradingView Library
├── ws-server.js             # Node.js WebSocket Server (823 Zeilen)
├── package.json             # Node.js Dependencies (ws, protobufjs)
└── .env                     # Config (DB, cTrader Credentials, Mailer)
```

## Deployment

**Server:** `app.elvtdfinance.com` (Apache)
**User:** `web-user`
**Pfad:** `/var/www/elvtd/`

```bash
# PHP-Dateien deployen
scp src/Controller/AccountController.php web-user@app.elvtdfinance.com:/var/www/elvtd/src/Controller/
ssh web-user@app.elvtdfinance.com "cd /var/www/elvtd && php bin/console cache:clear"

# JS/CSS (kein Cache-Clear nötig)
scp public/assets/js/denies-account.js web-user@app.elvtdfinance.com:/var/www/elvtd/public/assets/js/

# WebSocket Server
scp ws-server.js web-user@app.elvtdfinance.com:/var/www/elvtd/
ssh web-user@app.elvtdfinance.com "kill $(pgrep -f ws-server.js); cd /var/www/elvtd && nohup node ws-server.js > ws-server.log 2>&1 &"
```

## cTrader OAuth Flow

```
1. User klickt "Connect cTrader"
2. Redirect → cTrader OAuth (openapi.ctrader.com/apps/authorize)
3. User autorisiert
4. Callback → /auth/ctrader/callback?code=...
5. Code → Access Token + Refresh Token
6. Token im Account gespeichert
7. Account beim Backend registriert (POST /api/trader/account)
8. Bei Ablauf: Refresh Token → neuer Access Token
```

## WebSocket Server — Nachrichtentypen

| Client → Server | Beschreibung |
|-----------------|-------------|
| `auth` | cTrader-Auth (accessToken, ctid, isLive) |
| `subscribe` | Tick-Stream für Symbol starten |
| `getPositions` | Offene Positionen abrufen |
| `getPnl` | Unrealisierte PnL berechnen |
| `closePosition` | Position schließen |
| `closeAllPositions` | Alle Positionen schließen |

| Server → Client | Beschreibung |
|-----------------|-------------|
| `tick` | Live-Tick (bid, ask, time) |
| `positions` | Positionsliste |
| `pnl` | PnL pro Position (gross, net) |
| `auth` | Auth-Status (ok/error) |
| `error` | Fehlermeldung |
