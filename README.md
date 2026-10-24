# AI Navigation System

An intelligent route planning application built with **Next.js 14**, **Python Flask**, **NetworkX**, and **scikit-learn** that finds optimal routes across 105 Indian cities and 161 national highway connections using Dijkstra pathfinding and Random Forest machine learning travel time prediction.

![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Python](https://img.shields.io/badge/Python-3.10%20--%203.12-blue)
![Flask](https://img.shields.io/badge/Flask-3.0.0-green)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.7.1-orange)
![NetworkX](https://img.shields.io/badge/NetworkX-3.2.1-red)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Running the Application](#running-the-application)
7. [Environment Variables](#environment-variables)
8. [API Documentation](#api-documentation)
9. [Machine Learning Model & Evaluation](#machine-learning-model--evaluation)
10. [Road Network & Caching](#road-network--caching)
11. [Testing Strategy](#testing-strategy)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [Current Limitations](#current-limitations)
14. [Production Deployment](#production-deployment)

---

## Features

- **Optimal Shortest Path Calculation**: Uses Dijkstra's algorithm implemented in NetworkX over a verified 105-city, 161-highway road network graph weighted by real driving distances.
- **Random Forest Travel Time Prediction**: Machine learning regression model estimating travel time based on distance, highway classification, traffic level, and time of day.
- **Alternative Route Suggestions & Comparison**: Discovers genuinely distinct alternative paths, calculates their distances and travel times, and allows one-click switching directly on the map.
- **Interactive Leaflet Map**: Interactive OpenStreetMap visualization with start/via/destination markers, auto-fitting bounds, real road polyline geometry, and a live map legend.
- **Quick City Select**: Interactive search and quick-select buttons for 20+ prominent Indian transit hubs and tourist destinations.
- **Transparent Fallback & Offline Resilience**: When external routing services (OSRM) are unavailable, the system transparently falls back to local road graph distances and local ML predictions.
- **Comprehensive Error Handling**: Validates request payloads, same-city selections, unknown locations, and network disconnections gracefully with user-friendly notices.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend: Next.js 14 App Router                 │
│  ┌───────────────────────┐  ┌───────────────────┐  ┌────────────────┐  │
│  │ NavigationForm (Input)│  │ MapView (Leaflet) │  │  RouteDetails  │  │
│  └───────────────────────┘  └───────────────────┘  └────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Next.js API Gateway (/api/shortest-path)                  │
│              - Input validation & schema enforcement                   │
│              - Error forwarding & timeout protection                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP POST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Python Backend (Flask REST API :5000)                │
│  ┌──────────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │
│  │  NetworkX Graph      │  │ scikit-learn RF   │  │  OSRM Highway   │  │
│  │  (Dijkstra Path)     │  │ Travel Time Model │  │  Geometry Poly  │  │
│  └──────────────────────┘  └───────────────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | `14.2.3` | React Server Components & API routes |
| **UI Library** | React | `^18.3.1` | Declarative user interface |
| **Language** | TypeScript | `^5.0.0` | Strict static type checking |
| **Styling** | Tailwind CSS | `^3.4.3` | Utility-first CSS styling |
| **Mapping** | Leaflet.js | `^1.9.4` | OpenStreetMap visualization |
| **Icons** | Lucide React | `^0.378.0` | Vector UI icons |
| **Backend API** | Python Flask & Flask-CORS | `3.0.0` / `4.0.0` | REST API service |
| **Pathfinding** | NetworkX | `3.2.1` | Graph representation & Dijkstra |
| **Machine Learning** | scikit-learn | `1.7.1` | Random Forest travel time regressor |
| **Data Processing** | pandas & numpy | `3.1.0` / `2.5.4` | Data structures & numerical routines |
| **Testing** | pytest | `9.1.1` | Automated unit & integration testing |

---

## Prerequisites

- **Node.js**: `v18.17.0+` or `v20+` (verified on Node `v24.20.0`)
- **npm**: `v9+` (verified on npm `11.19.0`)
- **Python**: `3.10`, `3.11`, or `3.12` (verified on Python `3.12.15`)
- **Git**: `2.30+`

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/DigarSingh/ai_nav.git
cd ai_nav
```

### 2. Frontend Dependencies & Environment

```bash
# Install Node dependencies
npm install

# Create local environment file from template
cp .env.example .env.local
```

### 3. Python Virtual Environment & Dependencies

#### Windows (PowerShell):

```powershell
cd python-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install required packages
pip install -r requirements.txt pytest
```

#### Linux / macOS:

```bash
cd python-backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install required packages
pip install -r requirements.txt pytest
```

---

## Running the Application

### Option A: Run Both Services Concurrently

#### Terminal 1 — Start the Python Flask Server:

```bash
# From python-backend/ directory (with virtual environment active):
python app.py
```
*The Flask API starts on `http://localhost:5000`.*

#### Terminal 2 — Start the Next.js Frontend:

```bash
# From project root:
npm run dev
```
*The Next.js web application starts on `http://localhost:3000`.*

Open your browser and navigate to **`http://localhost:3000`**.

---

## Environment Variables

Copy `.env.example` to `.env.local` in the project root:

```env
# Frontend (Next.js) -> Flask Backend URL
FLASK_API_URL=http://localhost:5000

# Backend (Flask) Optional Overrides
# OSRM_URL=https://router.project-osrm.org
# MODEL_PATH=travel_time_model.pkl
# FLASK_DEBUG=false
```

---

## API Documentation

### 1. Route Prediction Endpoint

- **Endpoint**: `POST /predict` (Flask) & `POST /api/shortest-path` (Next.js proxy)
- **Content-Type**: `application/json`

#### Example Request:

```json
{
  "source": "Delhi",
  "destination": "Mumbai"
}
```

#### Example Response (`200 OK`):

```json
{
  "source": "Delhi",
  "destination": "Mumbai",
  "path": ["Delhi", "Jaipur", "Udaipur", "Ahmedabad", "Mumbai"],
  "distance": 1454.0,
  "time": "36 hr 25 min",
  "prediction_method": "ml_random_forest",
  "predicted_hours": 36.42,
  "ml_estimated_time": "36 hr 25 min",
  "osrm_estimated_time": "17 hr 35 min",
  "coordinates": [
    [28.6139, 77.2090],
    [26.9124, 75.7873],
    [24.5854, 73.7125],
    [23.0225, 72.5714],
    [19.0760, 72.8777]
  ],
  "geometry": [
    [28.6139, 77.2090],
    [28.6140, 77.2075],
    [19.0760, 72.8777]
  ],
  "alternate_routes": [
    ["Delhi", "Jaipur", "Ahmedabad", "Mumbai"],
    ["Delhi", "Jaipur", "Udaipur", "Ahmedabad", "Vadodara", "Surat", "Mumbai"]
  ],
  "alternate_route_details": [
    {
      "path": ["Delhi", "Jaipur", "Ahmedabad", "Mumbai"],
      "distance": 1466.0,
      "time": "36 hr 32 min",
      "hours": 36.53,
      "method": "ml_random_forest"
    },
    {
      "path": ["Delhi", "Jaipur", "Udaipur", "Ahmedabad", "Vadodara", "Surat", "Mumbai"],
      "distance": 1470.0,
      "time": "36 hr 32 min",
      "hours": 36.53,
      "method": "ml_random_forest"
    }
  ]
}
```

#### Error Responses:

- `400 Bad Request`: Missing body, empty city names, non-string types, or identical origin and destination (`{"error": "Source and destination cannot be the same"}`).
- `404 Not Found`: Unknown city (`{"error": "Source city 'Gotham' not found in network"}`) or unreachable destination.
- `503 Service Unavailable`: Flask server unreachable from Next.js gateway.

---

### 2. Health Endpoint

- **Endpoint**: `GET /health`
- **Response**:

```json
{
  "status": "healthy",
  "graph_loaded": true,
  "model_loaded": true,
  "nodes_count": 105,
  "edges_count": 161,
  "cities_available": ["Agartala", "Agra", "Ahmedabad", "...", "Varanasi", "Vijayawada", "Visakhapatnam"]
}
```

---

### 3. Cities Endpoint

- **Endpoint**: `GET /cities`
- **Response**: Returns list of all 105 indexed Indian cities.

---

## Machine Learning Model & Evaluation

### Model Architecture

- **Algorithm**: `RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)`
- **Input Features**:
  1. `distance_km` (float): Driving distance in kilometers.
  2. `road_type` (int): 1 = Expressway/Highway, 2 = National Highway, 3 = State Highway.
  3. `traffic_level` (float): Traffic density multiplier (0.5 = light, 1.0 = normal, 1.5 = heavy).
  4. `time_of_day` (int): 0 = Morning, 1 = Afternoon, 2 = Night.
- **Target Variable**: `travel_time_hours` (non-negative float).
- **Data Preprocessing & Splitting**: 80/20 train/test split with deterministic seed (`random_state=42`).

### Verified Evaluation Results

The trained Random Forest model was evaluated on the held-out test split and compared against two baseline models:

| Model / Baseline | MAE (Hours) | MAE (Minutes) | RMSE (Hours) | R² Score |
|---|---|---|---|---|
| **Random Forest Regressor** | **0.6302 hr** | **37.81 min** | **0.8621 hr** | **0.9942** |
| Baseline 2: Fixed 60 km/h Rule | 5.5213 hr | 331.28 min | 7.9800 hr | - |
| Baseline 1: Dummy Mean Predictor | 8.9832 hr | 538.99 min | 11.2904 hr | 0.0000 |

*Note on Data Source: The model was trained on simulated highway trip data reflecting realistic highway speeds, congestion modifiers, and route types. While achieving high internal consistency (R² = 0.9942), actual driving times may vary with live traffic conditions. The application provides OSRM live routing duration alongside the ML model prediction.*

---

## Road Network & Caching

- **Nodes**: 105 major Indian metropolitan areas, state capitals, and strategic transit cities.
- **Edges**: 161 verified real-world highway connections with road distances in kilometers.
- **Graph Topology**: Single fully connected component (`nx.is_connected(G) == True`), ensuring every city can be routed to every other city.
- **Caching**: Graph is cached to `python-backend/road_network.pkl` on initial load. Integrity checks automatically regenerate the graph if corrupted.
- **Large Download Safeguard**: Predefined highway network prevents downloading multi-gigabyte OpenStreetMap graphs at runtime.

---

## Testing Strategy

### 1. Backend Automated Tests (pytest)

Run the complete 21-test test suite:

```bash
cd python-backend
pytest -v tests/test_navigation.py
```

Covered test scenarios:
- `/health` and `/cities` endpoints.
- Dijkstra shortest path correctness on deterministic test graphs.
- Connectivity across all 105 cities.
- Valid route prediction and coordinate latitude/longitude order.
- Case-insensitive city lookup.
- Long-distance cross-country routing (Srinagar to Thiruvananthapuram).
- Error handling: missing body, non-string fields, identical cities, unknown cities.
- Unreachable destinations (`nx.NetworkXNoPath`).
- Alternative route validity and uniqueness.
- Random Forest ML prediction validity, positive numbers, and finite values.
- Zero-distance handling.
- Graceful transparent fallback when ML model is detached.
- CORS headers.

*Core tests mock external OSRM calls (`mock_osrm` fixture), running 100% offline in ~7 seconds.*

### 2. Frontend Checks

```bash
# TypeScript verification
npm run typecheck

# ESLint check
npm run lint

# Production build test
npm run build
```

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| `No Python at '"C:\Users\...\anaconda3\python.exe'` | Stale virtual environment paths | Create a fresh Python 3.12 venv: `python -m venv venv` and install requirements. |
| `AttributeError: module 'app' has no attribute 'road_network'` | Importing `app` from root loads `app/` folder instead of `app.py` | Run commands from `python-backend/` or specify module path in `sys.path`. |
| `ESLint interactive prompt on next lint` | Missing `.eslintrc.json` | An `.eslintrc.json` with `{"extends": "next/core-web-vitals"}` is now provided. |
| `Leaflet map window is not defined` | Leaflet accessed during SSR | MapView uses dynamic imports (`import('leaflet')`) inside `useEffect`. |
| `Python routing service unreachable` | Flask server not started | Start Flask: `cd python-backend && python app.py`. |

---

## Current Limitations

1. **Static Graph Edges**: Highway connections represent major arterial routes. Intermediate unlisted villages and local bypasses route through the nearest transit node.
2. **Offline vs Live Road Polylines**: When internet connectivity is available, the public OSRM service provides highway curves for the map polyline. In offline mode, the map falls back to direct city-to-city segments while preserving exact Dijkstra shortest distances.

---

## Production Deployment

### Frontend (Vercel)

1. Push to GitHub.
2. Import project in Vercel.
3. Configure Environment Variable: `FLASK_API_URL` pointing to your deployed backend URL.
4. Deploy!

### Backend (Docker / Render / Railway)

Create a `Dockerfile` in `python-backend`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

---

## License

This project is licensed under the MIT License.
