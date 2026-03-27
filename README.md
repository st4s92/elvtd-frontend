# ELVTD Frontend (React)

> Admin-Dashboard und Trading-UI der ELVTD Finance Plattform — React 19 SPA mit Echtzeit-Trading, Account-Management, Server-Monitoring und AI-Integration.

## Architektur-Überblick

```
┌─────────────────────────────────┐
│   Browser (SPA)                 │
│   React 19 + Vite + Tailwind   │
│   ApexCharts + Recharts         │
│   Three.js (3D)                │
└───────────┬─────────────────────┘
            │ HTTP (Axios)
            │ Bearer Token Auth
            ▼
┌─────────────────────────────────┐
│   Backend (.NET 9)              │
│   65.108.60.88:5021             │
│   REST API                      │
└─────────────────────────────────┘
```

## Rolle im ELVTD-Ökosystem

| Komponente | Repo | Aufgabe |
|------------|------|---------|
| **Frontend (dieses Repo)** | `elvtd-frontend` | React Admin-Dashboard, Trading-UI, Monitoring |
| Platform (Symfony) | `elvtd-platform` | Webtrader mit cTrader-Integration, WebSocket, Charts |
| Backend API | `elvtd-backend` | Datenhaltung, Business-Logik, RabbitMQ-Orchestrierung |
| Tools | `elvtd-tools` | Go Bridges auf Windows VMs, MT4/MT5 Installer, cTrader Copier |

Das React-Frontend ist das **Admin- und Management-Dashboard** — hier werden Accounts, Server, Orders, Copy-Trading-Beziehungen und System-Logs verwaltet. Die Symfony-Platform (`elvtd-platform`) ist dagegen das Webtrader-Frontend für Endbenutzer mit Live-Charts und WebSocket-Trading.

## Tech Stack

- **React 19.2** + TypeScript 5.5
- **Vite 7.1** (Build + Dev Server)
- **Tailwind CSS 4.1** + **shadcn/ui** (Radix UI Primitives)
- **ApexCharts** + **Recharts** (Daten-Visualisierung)
- **Three.js** + **Framer Motion** (3D + Animationen)
- **React Router 7.8** (Client-Side Routing)
- **Axios** (HTTP Client mit Bearer Token Interceptor)
- **i18next** (Internationalisierung)
- **Lucide Icons**

## Hauptfunktionen

### Trading Dashboard
- Echtzeit-Positionsüberwachung mit PnL-Tracking
- Aktive Trades Tabelle mit Live-Updates
- Performance-Metriken (Balance, Equity, Drawdown)
- Trade-Aktivitäts-Charts

### Account-Management
- Accounts anlegen, bearbeiten, löschen
- Master/Slave Zuordnungen verwalten
- Installation auf VMs triggern
- Account-Status und Server-Zuordnung

### Order-Management
- Globale Order-Übersicht (alle Accounts)
- Master-Order Tracking
- Force-Close einzelner Trades
- Global Kill Switch (alle Trades schließen)

### Copy-Trading
- Master-Slave Beziehungen anlegen/verwalten
- Symbol-Mapping konfigurieren (z.B. EURUSD → EUR.USD)
- Multiplier setzen
- Signals-Übersicht

### Server-Monitoring
- Server-Status (CPU, RAM, Uptime, aktive Terminals)
- Heartbeat-Überwachung
- Stale Account Reassignment

### Administrative Tools
- User-Management (Rollen, Berechtigungen)
- Background Jobs Übersicht
- System-Logs
- AI Trading-Assistent (Gemini-Integration)

### Content & Support
- Helpdesk Ticket-System
- Blog-Management
- Notizen

## Projektstruktur

```
elvtd-frontend/
├── src/
│   ├── main.tsx                    # App Entry Point
│   ├── App.tsx                     # Router + Theme Provider
│   ├── routes/Router.tsx           # Route-Definitionen
│   ├── views/
│   │   ├── dashboards/
│   │   │   ├── Modern/            # Haupt-Analytics Dashboard
│   │   │   ├── Signals/           # Trade Signals & Orders
│   │   │   ├── Accounts/          # Account-Verwaltung
│   │   │   ├── Orders/            # Globale Order-Übersicht
│   │   │   ├── MasterOrders/      # Master-Account Orders
│   │   │   ├── SymbolMap/         # Symbol-Mapping
│   │   │   ├── Servers/           # Server-Monitoring
│   │   │   ├── Users/             # User-Verwaltung
│   │   │   ├── Jobs/              # Background Jobs
│   │   │   ├── AI/                # AI Dashboard
│   │   │   └── Logs/              # System-Logs
│   │   ├── apps/
│   │   │   ├── tickets/           # Helpdesk
│   │   │   ├── blog/              # Blog
│   │   │   └── notes/             # Notizen
│   │   └── authentication/        # Login/Register
│   ├── components/
│   │   ├── ui/                    # shadcn/ui Komponenten
│   │   ├── dashboards/            # Dashboard-spezifische Komponenten
│   │   └── shared/                # Layouts, Breadcrumbs
│   ├── context/                   # React Context (Blog, Notes, Tickets)
│   ├── api/                       # API Response Types
│   ├── hooks/                     # Custom Hooks (useDashboardMetrics)
│   ├── lib/                       # Axios Client, Helpers
│   ├── css/                       # Global Styles + Tailwind
│   └── types/                     # TypeScript Interfaces
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## API-Anbindung

Alle API-Calls gehen über einen Axios-Client mit:
- **Base URL:** `VITE_API_BASE_URL` (default: `http://65.108.60.88:5021`)
- **Auth:** Bearer Token aus localStorage
- **Interceptors:** Automatischer Token-Header bei jedem Request

Genutzte Backend-Endpoints:
```
/api/trader/account/*           — Account CRUD + Install/Restart
/api/trader/orders/*            — Order-Verwaltung
/api/trader/master-slave/*      — Copy-Trading Beziehungen
/api/trader/servers/*           — Server-Status + Reassignment
/api/trader/symbol-map/*        — Symbol-Mapping
/api/user/*                     — User-Verwaltung
/api/ai/*                       — AI Chat + Analyse
```

## Development

```bash
# Dependencies installieren
npm install

# Dev Server starten (Hot Reload)
npm run dev

# Linting
npm run lint

# Production Preview
npm run preview
```

## Deployment

Das Frontend wird als statisches SPA gebaut und auf den Backend-Server kopiert, wo Nginx es aus `/dist` ausliefert.

```bash
# 1. Production Build erstellen
npm run build

# 2. Build-Output auf Backend-Server deployen
scp -r dist/* deniesBackend:~/elvtd-backend/dist/
```

Der **Nginx-Container** im `elvtd-backend` Docker Setup (Port 80) liefert den Inhalt von `/dist` als statische Dateien aus.

### Deployment-Ablauf im Detail

```
lokaler Rechner                        Backend-Server (65.108.60.88)
┌──────────────┐                      ┌──────────────────────────┐
│ npm run build │                      │ ~/elvtd-backend/         │
│      ↓        │   scp -r dist/*     │   dist/                  │
│ dist/         │ ──────────────────▶  │     index.html           │
│   index.html  │                      │     assets/              │
│   assets/     │                      │                          │
└──────────────┘                      │ Docker: nginx:alpine     │
                                      │   Port 80 → serves /dist │
                                      └──────────────────────────┘
```

## Symbol Mapping — Anleitung

### Das Problem

Verschiedene Broker benennen dasselbe Instrument unterschiedlich:

| Instrument | FTMO | IC Markets | GBE | Canonical |
|------------|------|------------|-----|-----------|
| Euro/Dollar | `EURUSD` | `EURUSD.PRO` | `EURUSD` | `EURUSD` |
| Nasdaq 100 | `NAS100` | `USTEC` | `US100.cash` | `USTEC` |
| Gold | `XAUUSD` | `XAUUSD.CASH` | `GOLD` | `XAUUSD` |
| DAX | `GER40` | `DE40` | `GER40.cash` | `GER40` |

Jedes Broker-Symbol wird auf ein **Canonical Symbol** gemappt — eine einheitliche interne Bezeichnung. Damit weiß der Copy-Trading Copier, welches Symbol er auf dem Slave handeln muss.

```
Master (FTMO):  NAS100  →  Canonical: USTEC  →  Slave (GBE): US100.cash
```

### Wichtig: Broker Name muss EXAKT übereinstimmen

Der `broker_name` im Mapping wird **exakt** (case-insensitive) mit dem `broker_name` des Accounts verglichen. Es gibt **kein** Substring- oder Prefix-Matching.

**`server_name` wird NICHT für die Auflösung benutzt** — es wird gespeichert, aber ignoriert. Die gesamte Resolution läuft ausschließlich über `broker_name` + `broker_symbol` + `canonical_symbol`.

**Aktuelle Broker-Namen in der DB (Stand Produktion):**

| broker_name | server_name | Anmerkung |
|-------------|-------------|-----------|
| `FTMO` | `FTMO-Server`, `FTMO-Server3` | Ein Mapping mit `FTMO` reicht für alle Server |
| `GBE` | `GBEbrokers-Live`, `GBEbrokers-Demo` | Ein Mapping mit `GBE` reicht für Live UND Demo |
| `tegasFX` | `tegasFX-Main-UK` | |

Da Live- und Demo-Accounts denselben `broker_name` haben (z.B. `GBE`), reicht **ein einziges Mapping pro Broker** — egal ob Live oder Demo.

**BrokerName prüfen:**
```bash
curl "http://65.108.60.88:5021/api/trader/account/paginated?Page=1&PerPage=50"
# → broker_name ist das relevante Feld, server_name wird ignoriert
```

### Multi-Broker: Gleiches Canonical, verschiedene Broker

Dasselbe Canonical Symbol kann für verschiedene Broker unterschiedlich gemappt werden:

| Broker Name | Broker Symbol | Canonical |
|-------------|--------------|-----------|
| `FTMO` | `NAS100` | `USTEC` |
| `GBE` | `US100.cash` | `USTEC` |
| `tegasFX` | `USTEC` | `USTEC` |

Wenn ein Master (FTMO) `NAS100` tradet:
- Slave auf `GBE` → Copier findet Canonical `USTEC` → `US100.cash`
- Slave auf `tegasFX` → Copier findet Canonical `USTEC` → `USTEC`

Das funktioniert, weil der Copier den `broker_name` des Slave-Accounts kennt und damit das richtige Mapping findet.

### Neues Mapping anlegen

1. **Symbol Maps** im Dashboard öffnen
2. **"Add Mapping"** klicken
3. Drei Felder ausfüllen:

| Feld | Beschreibung | Beispiel |
|------|-------------|---------|
| **Broker Name** | **Exakt** wie `broker_name` im Account (nicht `server_name`!). | `FTMO`, `GBE`, `tegasFX` |
| **Broker Symbol** | Symbol beim Broker. **Case-sensitive!** | `NAS100`, `US100.cash` |
| **Canonical Symbol** | Einheitlicher interner Name (uppercase). | `USTEC` |

4. **"Submit Mapping"** klicken

### Neuen Broker komplett einrichten

**Beispiel:** GBE Brokers wird neu angebunden. Master tradet auf FTMO.

**Schritt 1 — Exakten broker_name herausfinden:**
```bash
curl "http://65.108.60.88:5021/api/trader/account/paginated?Page=1&PerPage=50"
# Suche nach dem broker_name Feld des Accounts (NICHT server_name)
# z.B. broker_name: "GBE", server_name: "GBEbrokers-Demo"  →  Mapping mit "GBE"
```

**Schritt 2 — Broker-Symbolliste beschaffen:**
MetaTrader → Market Watch → alle Symbole notieren. Oder cTrader → Symbol-Liste.

**Schritt 3 — Vorhandene Canonicals prüfen:**
```bash
curl http://65.108.60.88:5021/api/trader/symbol-map/canonical
# → ["EURUSD", "GBPUSD", "USTEC", "XAUUSD", "GER40", ...]
```

**Schritt 4 — Mappings für den neuen Broker anlegen (mit exaktem broker_name!):**

| Broker Name | Broker Symbol | Canonical |
|-------------|--------------|-----------|
| `GBE` | `EURUSD` | `EURUSD` |
| `GBE` | `GBPUSD` | `GBPUSD` |
| `GBE` | `US100.cash` | `USTEC` |
| `GBE` | `GOLD` | `XAUUSD` |
| `GBE` | `GER40.cash` | `GER40` |

Identische Symbole (EURUSD = EURUSD) **müssen auch gemappt werden**, damit die Canonical-Auflösung funktioniert.

Da Live und Demo denselben `broker_name` haben (`GBE`), gilt das Mapping automatisch für beide.

**Schritt 5 — Master-Broker ebenfalls mappen** (falls noch nicht vorhanden):

| Broker Name | Broker Symbol | Canonical |
|-------------|--------------|-----------|
| `FTMO` | `NAS100` | `USTEC` |
| `FTMO` | `XAUUSD` | `XAUUSD` |
| `FTMO` | `EURUSD` | `EURUSD` |

**Schritt 6 — Optional: Pair Override** für Sonderfälle:
Wenn ein bestimmtes Master-Slave Paar eine individuelle Zuordnung braucht → im Frontend die Master-Slave Beziehung öffnen → Pairs konfigurieren. Pair Overrides haben **höchste Priorität** und überschreiben das globale Mapping.

### Wie die Auflösung im Copier funktioniert (5 Stufen)

```
Master öffnet Position: "NAS100" (FTMO)
        │
        ▼
Tier 1: Pair Override vorhanden? → JA: verwende Override
        │ NEIN
        ▼
Tier 2: Canonical Auflösung (exakt)
        FTMO + NAS100 → Canonical: USTEC → GBE + USTEC → US100.cash
        │ NICHT GEFUNDEN
        ▼
Tier 3: Fuzzy Canonical (Suffixe entfernen: .CASH .PRO .M .ECN etc.)
        Bereinigtes Symbol → Retry Tier 2
        │ NICHT GEFUNDEN
        ▼
Tier 4: Fuzzy Match gegen Slave-Symbolliste
        Bereinigter Name == Slave-Symbol? → StartsWith Match?
        │ NICHT GEFUNDEN
        ▼
Tier 5: Fallback — Master-Symbol 1:1 verwenden (wird wahrscheinlich fehlschlagen)
```

Der Copier cached die Mappings alle **30 Sekunden** — neue Einträge sind also nach max. 30s aktiv.

### Häufige Fehler

| Problem | Ursache | Fix |
|---------|---------|-----|
| Symbol wird nicht kopiert | Kein Mapping für Master-Broker ODER Slave-Broker | Beide Seiten mappen |
| Mapping existiert aber greift nicht | `broker_name` im Mapping stimmt nicht mit Account überein — verwechsle nicht `broker_name` (`GBE`) mit `server_name` (`GBEbrokers-Live`)! | `broker_name` der Accounts prüfen und exakt übernehmen |
| Falsches Instrument | Canonical falsch zugeordnet | Canonical muss bei beiden Brokern gleich sein |
| "Symbol not found" im Slave | Symbol existiert nicht im Slave-Account | Bei cTrader: Symbol muss subscribed sein |

### API Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| `GET` | `/api/trader/symbol-map` | Alle Mappings |
| `GET` | `/api/trader/symbol-map/canonical` | Distinct Canonical Symbole |
| `POST` | `/api/trader/symbol-map` | Neues Mapping |
| `PUT` | `/api/trader/symbol-map/{id}` | Mapping aktualisieren |
| `DELETE` | `/api/trader/symbol-map/{id}` | Mapping löschen (Soft Delete) |

**Request-Body (POST/PUT):**
```json
{
  "broker_name": "GBE",
  "server_name": "GBEbrokers-Live",
  "broker_symbol": "US100.cash",
  "canonical_symbol": "USTEC"
}
```

## Umgebungsvariablen

```env
VITE_API_BASE_URL=http://65.108.60.88:5021   # Backend API URL
```
