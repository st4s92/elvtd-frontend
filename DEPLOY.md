# elvtd Deployment Guide

## Server

- **Host:** `app.elvtdfinance.com`
- **User:** `web-user`
- **Pfad:** `/var/www/elvtd/`

## Einzelne Dateien deployen

```bash
# Template deployen
scp templates/pfad/zur/datei.html.twig web-user@app.elvtdfinance.com:/var/www/elvtd/templates/pfad/zur/datei.html.twig

# Controller deployen
scp src/Controller/MeinController.php web-user@app.elvtdfinance.com:/var/www/elvtd/src/Controller/MeinController.php

# JS-Datei deployen (public)
scp public/js/agents.js web-user@app.elvtdfinance.com:/var/www/elvtd/public/js/agents.js

# CSS-Datei deployen
scp public/assets/css/style.css web-user@app.elvtdfinance.com:/var/www/elvtd/public/assets/css/style.css
```

## Cache leeren (nach jeder Änderung an PHP/Twig)

```bash
ssh web-user@app.elvtdfinance.com "cd /var/www/elvtd && php bin/console cache:clear"
```

> **Hinweis:** Bei reinen JS/CSS-Änderungen im `public/` Ordner ist kein Cache-Clear nötig.

## Typische Workflows

### Template + Controller ändern
```bash
cd /Users/ferhat/PhpstormProjects/PineWebsocket/elvtd

scp templates/agent/index.html.twig web-user@app.elvtdfinance.com:/var/www/elvtd/templates/agent/index.html.twig
scp src/Controller/AgentController.php web-user@app.elvtdfinance.com:/var/www/elvtd/src/Controller/AgentController.php
ssh web-user@app.elvtdfinance.com "cd /var/www/elvtd && php bin/console cache:clear"
```

### Nur JS ändern (kein Cache-Clear nötig)
```bash
scp public/js/agents.js web-user@app.elvtdfinance.com:/var/www/elvtd/public/js/agents.js
```

### Mehrere Dateien auf einmal
```bash
scp src/Controller/UserController.php web-user@app.elvtdfinance.com:/var/www/elvtd/src/Controller/UserController.php && \
scp templates/user/edit.html.twig web-user@app.elvtdfinance.com:/var/www/elvtd/templates/user/edit.html.twig && \
scp templates/user/index.html.twig web-user@app.elvtdfinance.com:/var/www/elvtd/templates/user/index.html.twig && \
ssh web-user@app.elvtdfinance.com "cd /var/www/elvtd && php bin/console cache:clear"
```

## Wichtige Pfade

| Lokal | Server |
|-------|--------|
| `templates/` | `/var/www/elvtd/templates/` |
| `src/Controller/` | `/var/www/elvtd/src/Controller/` |
| `src/Service/` | `/var/www/elvtd/src/Service/` |
| `src/Entity/` | `/var/www/elvtd/src/Entity/` |
| `src/Form/` | `/var/www/elvtd/src/Form/` |
| `public/js/` | `/var/www/elvtd/public/js/` |
| `public/assets/` | `/var/www/elvtd/public/assets/` |

## Wann Cache leeren?

| Dateityp | Cache leeren? |
|----------|--------------|
| `.php` (Controller, Entity, Service, Form) | Ja |
| `.html.twig` (Templates) | Ja |
| `.js` / `.css` (public) | Nein |
| `config/*.yaml` | Ja |

## Fehler prüfen

```bash
# Apache Logs
ssh web-user@app.elvtdfinance.com "tail -50 /var/log/apache2/error.log"

# Symfony Logs
ssh web-user@app.elvtdfinance.com "tail -50 /var/www/elvtd/var/log/prod.log"
```
