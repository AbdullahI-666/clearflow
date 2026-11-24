# ClearFlow — Facility Management System (FMS)

**A Unified Digital Platform for Smarter Facility Operations**

ClearFlow is a modern, web-based Facility Management System designed to simplify, manage, and streamline facility maintenance operations. It connects administrators, clients, and field teams through a centralized platform, providing an organized environment for service requests, workforce management, job assignments, communication, payments, and operational monitoring.

Built with a modern full-stack architecture, ClearFlow brings essential facility management operations together in one responsive application.

---

## 🌐 Platform Overview

ClearFlow provides three dedicated portals, each designed around specific operational responsibilities.

| Portal | Theme | Purpose |
|---|---|---|
| Admin Portal | Purple / Indigo | Centralized management, monitoring, approvals, dispatching, and system administration |
| Client Portal | Green / Emerald | Service requests, quotations, job tracking, communication, and payments |
| Field Team Portal | Orange / Amber | Job assignments, service execution, navigation, reporting, and earnings |

All three portals operate within the same platform and share synchronized operational data.

---

## 🏢 Available Facility Management Services

ClearFlow supports multiple facility maintenance and management categories.

- 🧹 Cleaning Services
- ⚡ Electrical Repairs
- 🚰 Plumbing Services
- ♻️ General Waste Collection
- 🐛 Pest Control
- 🌱 Gardening and Landscaping
- 🔋 E-Waste Recycling
- 🧼 Sanitation Services
- ❄️ HVAC Maintenance
- 🔥 Fire Safety Services

The platform is designed to support additional service categories as operational requirements evolve.

---

## ⚡ Core Platform Features

### 1. Centralized Administration

The Admin Portal provides a centralized environment for managing the entire facility management operation.

- Administrative dashboard and operational analytics.
- Multiple administrator accounts and role management.
- Client and field team management.
- Account approvals and profile management.
- Service category management.
- Service request monitoring and management.
- Work order assignment and dispatching.
- Payment and financial monitoring.
- System configuration and operational settings.
- Activity tracking and audit records.

### 2. Client Service Management

Clients can access a dedicated dashboard to manage their facility maintenance requirements.

- Create and submit service requests.
- Select service categories and describe requirements.
- Provide service locations and preferred schedules.
- Upload supporting photographs.
- View estimated service costs.
- Receive quotations and service updates.
- Track assigned field teams.
- Communicate with administrators and technicians.
- View invoices and payment information.
- Submit ratings and service reviews.
- Access service completion reports.

### 3. Field Team Operations

The Field Team Portal provides technicians and service personnel with the tools required to manage their assigned work.

- Dedicated field operations dashboard.
- View and manage assigned service requests.
- Accept and update work assignments.
- Access client and job information.
- View GPS-based navigation and job locations.
- Update service progress and completion status.
- Upload before-and-after service photographs.
- Submit service completion reports.
- Monitor earnings, points, and wallet activity.
- Access payment and payout information.

### 4. Real-Time Communication & Notifications

ClearFlow includes communication capabilities designed to keep all stakeholders informed.

- Real-time in-app notifications.
- Client, administrator, and field team communication.
- Direct messaging and chat channels.
- Unread message indicators.
- Service request status notifications.
- Assignment and acceptance notifications.
- Payment and completion updates.
- Notification synchronization across relevant portals.

### 5. GPS & Workforce Tracking

Location-based functionality helps administrators and clients monitor field operations.

- Interactive map integration.
- Worker location visualization.
- Client service location identification.
- Navigation and route visualization.
- Proximity-based arrival detection.
- Job location and workforce monitoring.

### 6. Service Verification & Reporting

ClearFlow supports documented service verification through before-and-after photographs and completion records.

- Before-and-after image uploads.
- Service completion evidence.
- Image comparison and verification workflows.
- Verification results where supported by the configured analysis service.
- Service completion documentation.
- Downloadable PDF reports and invoices.

### 7. Payments, Wallets & Rewards

The platform includes financial management functionality for service operations.

- Client payment records.
- Field team earnings.
- Administrative financial monitoring.
- Worker wallet management.
- Points and reward mechanisms.
- Milestone-based incentives.
- Bank and payout information.
- Support for local Pakistani payment workflows, including JazzCash and Easypaisa, subject to payment integration configuration.

---

## 🏗️ System Architecture

ClearFlow uses a centralized application architecture.

**Main Application**

```text
ClearFlow/
│
├── client/                 # React frontend
│
├── server/                 # Node.js / Express backend
│
├── ai-service/             # Python analysis service
│
├── public/                 # Public assets
│
├── scripts/                # Utility and automation scripts
│
├── run_all.ps1             # Windows startup script
│
├── package.json
│
└── README.md
```

*Directory names may vary depending on the current project structure.*

### Application Endpoints

| Component | Local Address |
|---|---|
| Main Web Application | http://localhost:3000 |
| REST API | http://localhost:3000/api |
| Swagger Documentation | http://localhost:3000/api-docs |
| System Health | http://localhost:3000/api/health |
| Socket.IO | http://localhost:3000/socket.io |
| Python Service | http://localhost:5001 |

The React frontend and Express backend are served through the unified application. The Python service runs separately when enabled.

---

## 🚀 Installation & Quick Start

### Prerequisites

Install the following software before running ClearFlow:

- Node.js 20 or later.
- npm.
- Python 3.11.
- Git.
- Supabase account or configured local persistence environment.

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd ClearFlow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create the required environment files using the project's example configuration.

Configure your:

- Supabase database credentials.
- Authentication and JWT secrets.
- Image storage credentials.
- Email / SMTP configuration.
- API configuration.
- Optional AI service settings.

**Important:** Never commit `.env` files, passwords, private API keys, or production credentials to GitHub.

### 4. Launch the Application (Windows)

From the project root:

```powershell
.\run_all.ps1
```

The startup script is designed to:

1. Initialize the Python analysis service.
2. Check database connectivity.
3. Initialize required application data.
4. Start the main application server.
5. Open the application in your browser.

### 5. Manual Startup

Build the application:

```bash
npm run build:all
```

Start the production server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

### 6. Development Mode

Run the frontend and backend development processes in separate terminals:

```bash
npm run dev:client
```

```bash
npm run dev:server
```

---

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide Icons |
| Backend | Node.js, Express 5 |
| Programming Language | TypeScript |
| Database | Supabase PostgreSQL |
| Real-Time Communication | Socket.IO |
| Maps | Leaflet.js |
| Charts & Analytics | Recharts |
| PDF Generation | PDFKit |
| Image Processing | Sharp |
| Authentication | JWT / Jose |
| Background Scheduling | Node-Cron |
| Analysis Service | Python, Flask |
| Image Analysis | PyTorch, Torchvision |
| Data Processing | NumPy, Pandas, Scikit-learn |
| Image Storage | Cloudinary |

---

## 🗄️ Database & Data Management

ClearFlow uses Supabase PostgreSQL as its primary database infrastructure.

The database architecture supports centralized management of:

- User accounts and administrative roles.
- Client profiles.
- Field team profiles.
- Service categories.
- Service requests.
- Work orders and assignments.
- Communication and notifications.
- Payment records and wallets.
- Reviews and feedback.
- Operational activity and audit records.

The application also includes configured persistence and fallback mechanisms where supported by the implementation.

---

## 🔐 Security & Access Management

ClearFlow is designed around role-specific access and centralized authentication.

- Separate administrator, client, and field team experiences.
- Role-based access control.
- Protected application routes.
- Authenticated API access.
- Account management and approval workflows.
- Secure environment-based configuration.
- Controlled access to operational information.

Production deployments should use strong credentials, HTTPS, secure session handling, and appropriately configured database permissions.

---

## ☁️ Deployment

ClearFlow supports a deployment-oriented architecture with configuration for:

- **Frontend:** Netlify (`netlify.toml`)
- **Backend:** Render
- **Database:** Supabase PostgreSQL
- **Image Storage:** Cloudinary

Deployment configuration and environment variables must be adjusted according to the target hosting environment.

The Python service must also be deployed or configured separately if its functionality is required in production.

---

## 🎯 Project Vision

ClearFlow aims to bring clients, administrators, and field service professionals together through a unified facility management ecosystem.

By centralizing service requests, workforce coordination, communication, reporting, and financial workflows, the platform provides a structured approach to managing facility operations.

**One Platform. Three Portals. Connected Facility Operations.**

---

## 📌 Project Information

**Project:** ClearFlow  
**Category:** Facility Management System (FMS)  
**Architecture:** Full-Stack Web Application  
**Primary Database:** Supabase PostgreSQL  
**Frontend:** React & TypeScript  
**Backend:** Node.js & Express  
**Additional Services:** Python & Flask  

---

*ClearFlow — Simplifying Facility Management Through Connected Operations.*
