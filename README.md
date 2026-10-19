# ClearFlow — AI-Powered Facility Management System

A production-grade, unified Facility Management System (FMS) built with React.js, Node.js/Express, MongoDB Atlas, and Python Flask AI microservices. Developed for Pakistani institutions to automate facility workflows, smart crew dispatching, computer vision service verification, and real-time GPS fleet tracking.

---

## 🌟 Unified Single-Host Architecture

ClearFlow is packaged as **ONE solid unified project** served directly from a **single port and URL**:

```
🚀 Unified Web App:   http://localhost:3000
🔌 REST APIs:          http://localhost:3000/api
📖 Swagger API Docs:   http://localhost:3000/api-docs
💓 System Health:      http://localhost:3000/api/health
⚡ WebSockets:         ws://localhost:3000/socket.io
```

You do **not** need multiple links or ports. Everything—Frontend React UI, Backend Express REST APIs, Socket.IO real-time channels, PDF generator, and AI routing—is served simultaneously under **`http://localhost:3000`**.

---

## 🚀 One-Command Quick Start

### 1. Launch Everything (Windows PowerShell)
From the project root:
```powershell
.\run_all.ps1
```
This automatically:
1. Starts the Python AI verification service.
2. Seeds MongoDB Atlas with demo users, categories, field crews, and work orders.
3. Launches the unified server on `http://localhost:3000` and opens your default browser.

---

### Manual Launch Option

#### Build & Run Unified System:
```powershell
# Build both frontend and backend
npm run build

# Start the unified server
npm start
```
Then visit **`http://localhost:3000`**.

---

## 🔑 Demo Access Accounts

| Role | Email | Password | Primary Features |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@clearflow.pk` | `Admin@123` | Master Dashboard, Live Radar Fleet Tracking, All Work Orders, Team Manager, Analytics & ML Forecasting, Settings |
| **Client** | `ahmed@ucp.edu.pk` | `Demo@123` | Client Dashboard, 3-Step Request Wizard, My Orders, 5-Star Feedback Rating, PDF Reports |
| **Field Team** | `bilal@clearflow.pk` | `Demo@123` | Field Ops Dashboard, GPS Broadcast, Job Status Workflow, Before/After Photo Upload with AI Check |

*(1-click Quick-Fill buttons are available on the Login screen).*

---

## 🤖 AI Microservice (Verification & Forecasting)

The `ai-service/` directory contains an evidence-based computer vision classifier and demand forecaster.

### Run AI Microservice
```powershell
cd ai-service
.\.venv\Scripts\python.exe app.py
```
Health endpoint: `http://localhost:5001/health`

### Run Tests
```powershell
cd ai-service
.\.venv\Scripts\python.exe -m pytest tests -v
```

### Train / Retrain Models
```powershell
cd ai-service
# 1. Fetch public datasets (Kaggle & NYC 311)
.\.venv\Scripts\python.exe scripts\fetch_kaggle.py
.\.venv\Scripts\python.exe scripts\fetch_311.py

# 2. Train computer vision classifier and workload forecaster
.\.venv\Scripts\python.exe scripts\train_classifier.py
.\.venv\Scripts\python.exe scripts\train_forecaster.py
```

---

## 🛠️ Tech Stack & Key Modules
- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Shadcn/UI, Leaflet.js, Chart.js.
- **Backend**: Node.js 20, Express 5, TypeScript, Mongoose, Socket.IO, PDFKit, Jose JWT.
- **AI Microservice**: Python 3.11, Flask, PyTorch / Torchvision (MobileNetV3-Small), Scikit-learn, Pillow, NumPy, Pandas.
- **Database**: MongoDB Atlas (12 collections with compound indexes).
- **Documentation**: OpenAPI 3.0 Swagger at `http://localhost:3000/api-docs`.
