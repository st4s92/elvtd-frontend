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

## Umgebungsvariablen

```env
VITE_API_BASE_URL=http://65.108.60.88:5021   # Backend API URL
```
