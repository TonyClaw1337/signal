<div align="center">

# 🚂 SIGNAL

**Lokale Zugfrequenz- & Lärmanalyse — standortbezogene Bahn-Intelligence**

[![Built with](https://img.shields.io/badge/built%20with-FastAPI-009688?logo=fastapi)]()
[![React](https://img.shields.io/badge/frontend-React-61dafb?logo=react)]()
[![Leaflet](https://img.shields.io/badge/maps-Leaflet-199900?logo=leaflet)]()
[![PostgreSQL](https://img.shields.io/badge/db-PostgreSQL-4169E1?logo=postgresql)]()
[![Status](https://img.shields.io/badge/status-production-brightgreen)]()
[![Open App](https://img.shields.io/badge/▶_Open_App-e5a00d?style=for-the-badge)](https://<your-host>:8457/)

</div>

---

## 🚂 What is SIGNAL?

SIGNAL ist eine standortbezogene Analyse-App für **Zugfrequenz, Fahrplandaten und Lärmbelastung**. Nutzer geben eine Adresse ein, sehen Gleise auf einer interaktiven Karte und erhalten sofortige Informationen zu Zugverkehr und Lärmprognose.

**Use Cases:** Anwohner-Info, Immobilienbewertung, Standortanalyse, Wohnungssuche.

> In **<30 Sekunden** weiß der Nutzer: Wann kommt der nächste Zug? Wie viele Züge pro Stunde? Wie laut wird es?

## ✨ Features

### 🗺️ Interaktive Kartenansicht
- **Dark-Theme Leaflet-Karte** mit CartoDB Dark Tiles
- **Echtzeit-Gleisdaten** via OpenStreetMap Overpass API
- **Farbcodierte Strecken** — Blau (Personen), Rot (Güter), Grau (Neben)
- **Klickbare Gleisabschnitte** mit Glassmorphism-Popups
- **Entfernungsberechnung** Standort → Gleis (Haversine)

### 📍 Standorteingabe
- **Adresseingabe** mit Nominatim Geocoding
- **GPS-Standort** automatisch übernehmen
- **Karten-Picker** für manuelle Auswahl

### 📊 Taktanalyse
- **Nächste Züge** — Chronologische Liste mit Countdown
- **Frequenz-Charts** — Züge/Stunde (0–24h), Personen/Güter gestapelt
- **Spitzenzeiten** — Werktag vs. Wochenende Vergleich
- **Statistik** — Ø Züge/Tag, Ø Nacht, Max/Stunde, Güteranteil %

### 🔊 Lärmprognose
- **Schalldruckmodell** — Basis-dB × Distanz-Dämpfung × Frequenz-Korrektur
- **Tag/Nacht/Max-Pegel** in dB mit visuellen Indikatoren
- **Lärm-Zonen** auf Karte (🟢 <55dB / 🟡 55-65 / 🟠 65-75 / 🔴 >75)
- **Radius-Selektor** — 50m, 100m, 250m, 500m

### 🚄 Zugklassifizierung
- Fernverkehr (ICE/IC)
- Regionalverkehr (RE/RB)
- Güterverkehr
- S-Bahn / Stadtbahn

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI, SQLAlchemy, httpx |
| **Frontend** | React 18, Vite, Leaflet, recharts |
| **Database** | PostgreSQL 16 |
| **Maps** | OpenStreetMap, Overpass API, CartoDB |
| **Geocoding** | Nominatim |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Design** | COMMAND Design System |

## 📁 Project Structure

```
signal/
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app, routes, models
│       ├── noise.py          # Schalldruckmodell
│       └── overpass.py       # OpenStreetMap integration
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Start.jsx     # Standorteingabe
│       │   ├── MapView.jsx   # Kartenansicht
│       │   └── Details.jsx   # Analyse-Dashboard
│       ├── components/
│       │   ├── TrackPopup.jsx
│       │   ├── TrainList.jsx
│       │   ├── FrequencyChart.jsx
│       │   ├── NoisePanel.jsx
│       │   └── StatCard.jsx
│       └── styles.css
├── core/tc_auth/             # OAuth library
├── Dockerfile
└── README.md
```

## 🚀 Deployment

```bash
# Database
docker exec tc-postgres psql -U identity -c "CREATE DATABASE signal;"

# Build & Run
cd frontend && pnpm install && pnpm build && cd ..
docker compose build signal
docker compose up -d signal

# Tailscale
sudo tailscale serve --bg --https 8457 http://127.0.0.1:9500
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/location` | Adresse geocoden & speichern |
| `GET` | `/api/tracks?lat=X&lng=Y` | Gleise im Umkreis laden |
| `GET` | `/api/tracks/:id/trains` | Fahrplan für Abschnitt |
| `GET` | `/api/tracks/:id/stats` | Frequenzstatistik |
| `GET` | `/api/tracks/:id/noise` | Lärmberechnung |
| `GET` | `/api/dashboard` | Übersichtsdaten |
| `GET` | `/api/health` | Health Check |

## 🔮 Roadmap

- [ ] DB IRIS/HAFAS — Echtzeit-Fahrplandaten
- [ ] Isophon-Heatmap — Erweiterte Lärm-Visualisierung
- [ ] Standortvergleich — 2 Adressen side-by-side
- [ ] PDF-Export — Immobilienbewertung
- [ ] SCOUT-Integration — Wohnungen + Lärmindex
- [ ] KI-Advisory — Standortbewertung durch Tony Claw

## 🏗 Datenquellen

| Quelle | Daten |
|--------|-------|
| OpenStreetMap / Overpass | Gleisgeometrie |
| OpenRailwayMap | Streckenklassifikation |
| Nominatim | Geocoding |
| Schall03 (vereinfacht) | Lärmmodell |

---

<div align="center">

Part of the **Tony Claw Platform** · Built with 🤖 by Tony Claw

</div>
