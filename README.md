# ClearFlow — AI-Powered Facility Management System

A production-grade, unified Facility Management System (FMS) built with React 19, Node.js/Express 5, Supabase PostgreSQL / In-Memory resilient persistence, and Python Flask AI microservices. Developed for Pakistani institutions to automate facility workflows, smart crew dispatching, computer vision service verification, real-time GPS fleet tracking, and automated wallet milestones.

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
1. Starts the Python AI verification service on port `5001`.
2. Verifies local / cloud database connectivity and seeds master categories, teams, and administrative roles.
3. Launches the unified server on `http://localhost:3000` and opens your default browser.

---

### Manual Launch Option

#### Build & Run Unified System:
```powershell
# Build both frontend client and backend server
npm run build:all

# Start the unified server
npm start
```
Then visit **`http://localhost:3000`**.

#### Development Mode (Concurrent Hot-Reload):
```powershell
# Run frontend and backend concurrently
npm run dev:client
npm run dev:server
```

---

## 🔑 Access Accounts & Role Personas

ClearFlow features tailored, role-specific UI themes and workflows:

| Role | Email / Username | Password | Role Theme | Primary Features |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@clearflow.com`<br>*(alias: `admin@clearflow.pk`)* | `Admin@123` | Royal Purple / Indigo | Master Dashboard, Live Radar Fleet Tracking, Dispatch Console, Team Management, ML Demand Forecasting, Operations & System Settings |
| **Admin (Secondary)** | `adminn@clearflow.com` | `Adminn@123` | Royal Purple / Indigo | Backup Enterprise Administrator with full CRUD, user approval, and financial wallet privileges |
| **Client** | `ahmed@ucp.edu.pk`<br>*(or self-register)* | `Demo@123` | Mint / Emerald Green | Client Dashboard, Request Wizard with Location Picker, Direct Chat, Live Crew Radar, 5-Star Reviews & PDF Completion Reports |
| **Field Team** | `bilal@clearflow.pk`<br>*(or self-register)* | `Demo@123` | Amber / Deep Orange | Field Ops Dashboard, GPS Navigation Route, Automated Arrival Detection, Before/After AI Inspection Photo Upload, Worker Wallet |

*(Instant role-switching and 1-click Quick-Fill controls are available directly on the login screen).*

---

## ⚡ Core Platform Capabilities

- **🛰️ Live Worker Telemetry & GPS Radar**: Real-time worker-to-client navigation routes rendered on interactive Leaflet maps. Features automated arrival detection when the crew reaches within 50 meters of the client job site.
- **💬 Direct In-App Chat Channels**: Real-time Socket.IO chat linking clients, assigned technicians, and facility administrators with unread badges, active conversation status, and photo attachments.
- **📸 Dual-Stage AI Vision Verification**: Computer vision service verification comparing Before and After photos with structural similarity index (SSIM) and deep classification to detect authentic repairs before closing work orders.
- **💼 Field Team & Admin Wallets**: Milestone inspection incentives, points rewards, bank payout selector, and integration for local Pakistani payment channels (JazzCash, EasyPaisa, and local banks).
- **⏱️ Automated SLA Daemon & Scheduler**: Background cron engine continuously monitoring dispatch response SLAs, daily predictive demand, and EPA waste diversion recycling manifests.
- **📄 Instant PDF Dispatch & Invoicing**: Automated PDF invoice and service completion certificate generation powered by PDFKit.

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

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Leaflet.js, Recharts, Sonner.
- **Backend**: Node.js 20+, Express 5, TypeScript, Socket.IO 4.8, Supabase / PostgreSQL (`pg`), PDFKit, Jose JWT, Sharp (libvips), Node-Cron.
- **AI Microservice**: Python 3.11, Flask, PyTorch / Torchvision (MobileNetV3-Small), Scikit-learn, Pillow, NumPy, Pandas.
- **Database & Storage**: Supabase PostgreSQL with resilient fallback persistence, JSON audit logging, and Cloudinary image storage.
- **Cloud Deployments**: Production-ready configuration for **Netlify** (Client: `netlify.toml`) and **Render** (API: `clearflow-bcab.onrender.com`).
- **Documentation**: Interactive OpenAPI 3.0 Swagger at `http://localhost:3000/api-docs`.
