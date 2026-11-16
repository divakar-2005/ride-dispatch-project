# Real-Time Ride Dispatch System

**Cloud-Native Event-Driven Architecture** — Docker · FastAPI · React · Jenkins · Kubernetes · AWS

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Machine                            │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Frontend UI  │    │ Backend API   │    │   Jenkins    │  │
│  │  React+Leaflet│───▶│  FastAPI      │    │   CI/CD      │  │
│  │  port: 8080   │    │  port: 8000   │    │  port: 9090  │  │
│  └──────────────┘    └──────┬───────┘    └──────────────┘  │
│          Docker Compose      │                               │
└─────────────────────────────│───────────────────────────────┘
                               │ (optional, if AWS creds set)
                               ▼
                    ┌─────────────────────┐
                    │      AWS Cloud      │
                    │  SNS → Lambda →     │
                    │  DynamoDB → API GW  │
                    └─────────────────────┘
```

---

## 🚀 Quick Start (One Command)

```powershell
cd "d:\Rithanya\Major Project\ride-dispatch"
.\scripts\start.ps1
```

This will:
1. Build Docker images for backend + frontend
2. Start all services via Docker Compose
3. Wait for health checks
4. Open **http://localhost:8080** in your browser

---

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:8080 | React map UI |
| **Backend API** | http://localhost:8000 | FastAPI dispatch engine |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger docs |
| **Jenkins** | http://localhost:9090 | CI/CD pipeline |

---

## 🐳 Docker Commands

```powershell
# Start everything
docker compose up -d

# Start with fresh rebuild
docker compose up -d --build

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Check status
docker compose ps
```

---

## ☸️ Kubernetes Deploy

```powershell
# Deploy to k8s (Docker Desktop Kubernetes)
kubectl apply -f k8s/

# Check status
kubectl get pods,services

# Access frontend via minikube
minikube service frontend-service
```

---

## 🔧 Jenkins CI/CD

1. Open **http://localhost:9090**
2. Create a Pipeline job
3. Set Source: *This repository* / Jenkinsfile path
4. Build triggers: GitHub webhook or manual
5. The pipeline will auto-build → test → deploy

---

## ☁️ AWS Integration

The backend optionally publishes to **AWS SNS** for real-time driver telemetry.

Add your credentials to `.env`:
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
```

**Without AWS credentials** — the system runs fully offline using the built-in driver simulator.

---

## 📁 Project Structure

```
ride-dispatch/
├── backend/
│   ├── main.py          ← FastAPI server + driver simulator
│   ├── requirements.txt
│   └── Dockerfile
├── frontend-ui/
│   ├── src/
│   │   ├── App.jsx      ← Main React app (OpenStreetMap tiles)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile       ← Multi-stage: Vite build → Nginx
│   ├── nginx.conf
│   └── package.json
├── k8s/
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── aws-secrets.yaml
├── scripts/
│   ├── start.ps1        ← One-click startup
│   ├── stop.ps1
│   └── logs.ps1
├── Jenkinsfile          ← CI/CD pipeline
├── docker-compose.yml   ← Orchestration
└── .env                 ← Environment config
```

---

## 🗺️ Map Tiles

This project uses **free OpenStreetMap tiles** — no API key required.
(The original CARTO tiles required a paid API key — this version fixes that.)
