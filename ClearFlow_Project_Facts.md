# ClearFlow Project Fact Sheet & Codebase Audit Report

> **Auditor Notice**: This document is an objective, evidence-based code audit of the ClearFlow repository for FYP Phase 3 and Phase 4 documentation. All statements are grounded strictly in the codebase, configuration files, git history, and command outputs. Every claim includes file citations and line numbers. Contradictions between code and documentation/PDFs are recorded directly without bias.

---

## 1. REPOSITORY OVERVIEW

### 1.1 Directory Tree (to Depth 3)
```
clearflow/
  .github/
    workflows/
      ci-ai.yml
      ci-backend.yml
      ci-frontend.yml
  .pytest_cache/
    v/
      cache/
    .gitignore
    CACHEDIR.TAG
    README.md
  ai-service/
    .pytest_cache/
      v/
      .gitignore
      CACHEDIR.TAG
      README.md
    tests/
      test_routes.py
    app.py
    pytest.ini
    requirements.txt
  client/
    public/
      favicon.svg
      icons.svg
    src/
      app/
        App.tsx
        router.tsx
      assets/
      components/
        ui/
      entities/
        notification/
        team/
        user/
        workOrder/
      features/
        analytics/
        auth/
        categories/
        chat/
        dashboard/
        invoices/
        notifications/
        profile/
        reports/
        settings/
        teams/
        tracking/
        work-orders/
      infrastructure/
        api/
        config/
        socket/
      lib/
        utils.ts
      shared/
        components/
      App.css
      App.tsx
      index.css
      main.tsx
    .gitignore
    .oxlintrc.json
    index.html
    package-lock.json
    package.json
    README.md
    tsconfig.app.json
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
  server/
    src/
      config/
        cloudinary.ts
        db.ts
        env.ts
        swagger.ts
      controllers/
        ai.controller.ts
        analytics.controller.ts
        auth.controller.ts
        category.controller.ts
        chat.controller.ts
        invoice.controller.ts
        notification.controller.ts
        report.controller.ts
        settings.controller.ts
        team.controller.ts
        tracking.controller.ts
        user.controller.ts
        workOrder.controller.ts
      middleware/
        auth.middleware.ts
        error.middleware.ts
        rateLimiter.middleware.ts
        rbac.middleware.ts
        upload.middleware.ts
        validate.middleware.ts
      models/
        aiVerificationLog.model.ts
        assignment.model.ts
        chatMessage.model.ts
        fieldTeam.model.ts
        gpsLog.model.ts
        invoice.model.ts
        notification.model.ts
        rating.model.ts
        serviceCategory.model.ts
        settings.model.ts
        user.model.ts
        workOrder.model.ts
      routes/
        ai.routes.ts
        analytics.routes.ts
        auth.routes.ts
        category.routes.ts
        chat.routes.ts
        invoice.routes.ts
        notification.routes.ts
        report.routes.ts
        settings.routes.ts
        team.routes.ts
        tracking.routes.ts
        user.routes.ts
        workOrder.routes.ts
      seeds/
        categories.seed.ts
        demo.seed.ts
        run.ts
      services/
        ai.service.ts
        analytics.service.ts
        assignment.service.ts
        auth.service.ts
        chat.service.ts
        gpsTracking.service.ts
        notification.service.ts
        pdf.service.ts
        vision.service.ts
        workOrder.service.ts
      socket/
        chat.handler.ts
        gps.handler.ts
        index.ts
      utils/
        ApiError.ts
        ApiResponse.ts
        generateCode.ts
        haversine.ts
      validators/
        auth.validator.ts
        team.validator.ts
        workOrder.validator.ts
      app.ts
      server.ts
    tests/
      unit/
        haversine.test.ts
        vision.test.ts
    .env
    .env.example
    build-backend.js
    package-lock.json
    package.json
    test_admin_f19_f28.cjs
    test_ai_f29_f33.cjs
    test_auth_f01_f05.cjs
    test_auth_f01_f05.js
    test_client_f06_f11.cjs
    test_fieldteam_f12_f18.cjs
    test_invoice.pdf
    test_realtime_pdf_security_f34_f39.cjs
    test_report.pdf
    tsconfig.json
  .gitignore
  package.json
  README.md
  run_all.ps1
  sample_invoice_output.pdf
  sample_report_output.pdf
```

### 1.2 Languages and File Counts per Top-Level Folder

| Folder | File Count | Language Breakdown |
|---|---|---|
| `.github` | 3 | YAML (`.yml`: 3) |
| `ai-service` | 8 (excl. cache: 4) | Python (`.py`: 2), INI (`.ini`: 1), Text (`.txt`: 1), Cache/Doc: 4 |
| `client` | 79 | TypeScript React (`.tsx`: 51), TypeScript (`.ts`: 12), JSON (`.json`: 6), SVG (`.svg`: 4), CSS (`.css`: 2), HTML (`.html`: 1), Markdown (`.md`: 1), PNG (`.png`: 1), No-extension (`.gitignore`): 1 |
| `server` | 91 | TypeScript (`.ts`: 76), CommonJS (`.cjs`: 6), JSON (`.json`: 3), JavaScript (`.js`: 2), PDF (`.pdf`: 2), Example (`.env.example`): 1, No-extension (`.env`): 1 |
| Repo Root (`/`) | 6 | Markdown (`.md`: 1), JSON (`.json`: 1), PowerShell (`.ps1`: 1), PDF (`.pdf`: 2), No-extension (`.gitignore`): 1 |
| **Total Files** | **187** (active code & config) | **TypeScript dominates (139 files)**, followed by Python, JSON, JS/CJS, and YAML |

### 1.3 Exact Dependency Versions

Versions extracted directly from manifest and lockfiles:

| Package | Declared Version | Resolved Version (Lockfile) | Source File |
|---|---|---|---|
| **Node.js** | None specified in `engines` | Host runtime: `v24.21.0`; CI uses `20` | `server/package.json`, `.github/workflows/ci-backend.yml:16` |
| **Express** | `^5.1.0` | `5.2.1` | `server/package.json:28`, `server/package-lock.json` |
| **React** | `^19.2.8` | `19.2.8` | `client/package.json:20`, `client/package-lock.json` |
| **TypeScript (server)** | `^5.8.3` | `5.9.3` | `server/package.json:48`, `server/package-lock.json` |
| **TypeScript (client)** | `~6.0.2` | `6.0.3` | `client/package.json:34`, `client/package-lock.json` |
| **Tailwind CSS** | `^4.3.3` | `4.3.3` | `client/package.json:24`, `client/package-lock.json` |
| **Mongoose** | `^8.15.1` | `8.24.2` | `server/package.json:32`, `server/package-lock.json` |
| **Socket.IO (server)** | `^4.8.3` | `4.8.3` | `server/package.json:34`, `server/package-lock.json` |
| **Socket.IO (client)** | `^4.8.3` | `4.8.3` | `client/package.json:23`, `client/package-lock.json` |
| **PDFKit** | `^0.16.0` | `0.16.0` | `server/package.json:33`, `server/package-lock.json` |
| **JWT Library (`jose`)** | `^6.0.11` | `6.2.8` | `server/package.json:31`, `server/package-lock.json` |
| **Flask** | Unpinned (`Flask`) | Runtime: Flask 3.x / Python 3.14 / CI: Python 3.11 | `ai-service/requirements.txt:1`, `.github/workflows/ci-ai.yml:16` |
| **scikit-learn** | **NOT PRESENT** | **NOT PRESENT** in requirements.txt or lockfiles | `ai-service/requirements.txt` |
| **OpenCV** | **NOT PRESENT** | **NOT PRESENT** in requirements.txt or lockfiles | `ai-service/requirements.txt` |
| **Pillow** | Unpinned (`Pillow`) | Unpinned | `ai-service/requirements.txt:4` |

### 1.4 Environment Variables

#### Server (`server/src/config/env.ts:14-32`)
1. `PORT` (default `3000`)
2. `MONGODB_URI` (default `mongodb://localhost:27017/clearflow`)
3. `JWT_SECRET` (default `clearflow_super_secret_jwt_key_2026_production_secure_token`)
4. `JWT_EXPIRES_IN` (default `24h`)
5. `CLOUDINARY_CLOUD_NAME` (default `demo`)
6. `CLOUDINARY_API_KEY` (default `123456789`)
7. `CLOUDINARY_API_SECRET` (default `secret`)
8. `CORS_ORIGIN` (default `*`)
9. `NODE_ENV` (default `development`)
10. `AI_SERVICE_URL` (default `http://localhost:5001`)
11. `SENDGRID_API_KEY` (default `SG.dummy`)
12. `SMTP_HOST` (default `smtp.sendgrid.net`)
13. `SMTP_PORT` (default `587`)
14. `SMTP_SECURE` (default `false`)
15. `SMTP_USER` (default `apikey`)
16. `SMTP_PASS` (default `SG.dummy`)
17. `SMTP_FROM` (default `ClearFlow <notifications@clearflow.com>`)
18. `APP_URL` (default `http://localhost:3000`)

#### Client (`client/src/infrastructure/config/env.ts:2-3`)
1. `VITE_API_URL` (default `/api`)
2. `VITE_MAPS_API_KEY` (default `''`)

#### AI Microservice (`ai-service/app.py:29-32, 367-368`)
1. `PORT` (default `5001`)
2. `FLASK_ENV` (default `development`)
3. `AI_CONFIDENCE_THRESHOLD` (default `0.75`)
4. `MODEL_VERSION` (default `clearflow-v1.0-simulated`)

---

## 2. GIT HISTORY (VERBATIM OUTPUT)

### 2.1 Git Log
```
eff195c | 2026-09-14 | Abdullah Ikram | fix(ci): update backend & frontend workflows and lockfiles
a58ae6f | 2026-09-14 | Abdullah Ikram | Initial commit - ClearFlow FMS Unified Monorepo
```

### 2.2 Shortlog
```
     2	Abdullah Ikram
```

### 2.3 Branches
```
* main
  remotes/origin/main
```

### 2.4 History Statistics
- **Total Commit Count**: 2
- **First Commit Date**: 2026-09-14
- **Last Commit Date**: 2026-09-14
- **Commits per Author per Calendar Week**:
  - 2026-W38 (Sep 14, 2026): Abdullah Ikram — 2 commits
- **Pull Requests / Merge Commits**: 0 (No merge commits or pull request references in git log).
- **History Duration Assessment**: The git history is **extremely short** (only 2 commits total, created on the exact same date, 2026-09-14, by a single committer). All subsequent modifications remain unstaged/uncommitted working tree changes.

---

## 3. FEATURE INVENTORY AGAINST THE DESIGN

| ID | Feature Name | Status | Implementing Files | Actual Behavior in Code |
|---|---|---|---|---|
| **F-01** | Registration | Implemented | `server/src/controllers/auth.controller.ts:10`, `server/src/services/auth.service.ts:133`, `client/src/features/auth/components/RegisterForm.tsx` | Creates user with bcrypt hash (cost 12), generates raw token, prints verification URL in terminal/JSON, and stores user in MongoDB or in-memory fallback. |
| **F-02** | Email Verification | Implemented | `server/src/controllers/auth.controller.ts:40`, `server/src/services/auth.service.ts:209`, `client/src/features/auth/components/VerifyEmail.tsx` | Hashes received raw token with SHA-256, matches against `verificationToken`, checks 24-hr expiry, and activates account (`isVerified = true`). |
| **F-03** | Login (JWT) | Implemented | `server/src/controllers/auth.controller.ts:25`, `server/src/services/auth.service.ts:264`, `server/src/middleware/auth.middleware.ts:15`, `client/src/features/auth/components/LoginForm.tsx` | Checks demo users first, then in-memory/DB users; verifies bcrypt hash; generates HS256 JWT via `jose` with 24h validity; client stores in `localStorage`. |
| **F-04** | Account Lockout | Implemented | `server/src/services/auth.service.ts:307, 350`, `server/src/models/user.model.ts:29` | Increments `failedLoginAttempts` on incorrect password; after 5 attempts sets `accountLockedUntil` to `Date.now() + 15 mins` and responds with HTTP 429. |
| **F-05** | Forgot / Reset Password | Implemented | `server/src/controllers/auth.controller.ts:50, 60`, `server/src/services/auth.service.ts:365, 417`, `client/src/features/auth/components/ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx` | Generates 32-byte hex reset token, sets 1-hour expiry, prints reset link to console/JSON, and allows password update using SHA-256 token lookup. |
| **F-06** | Client Dashboard | Implemented | `client/src/features/dashboard/components/ClientDashboard.tsx` | Displays greeting, 3 KPI cards (Total Requests, In Progress, Completed), a "New Request" CTA button, and recent work orders table. |
| **F-07** | Submit Request (3-Step Wizard) | Implemented | `client/src/features/work-orders/components/ServiceRequestForm.tsx:1`, `server/src/controllers/workOrder.controller.ts:10`, `server/src/services/workOrder.service.ts:90` | 3-step wizard (Category selection -> Location/Map/Urgency -> Summary & Submit); triggers backend auto-assignment algorithm on creation. |
| **F-08** | Waste / E-waste Request Fields | Implemented | `server/src/models/workOrder.model.ts:40-42`, `server/src/services/workOrder.service.ts:122-125`, `client/src/features/work-orders/components/ServiceRequestForm.tsx:340` | Captures `wasteType`, `wasteQuantityKg`, and `ewasteDeviceDescription`; conditionally displays eco-impact badge and recycling manifest. |
| **F-09** | My Requests List with Filters | Implemented | `client/src/features/work-orders/components/WorkOrderList.tsx`, `server/src/controllers/workOrder.controller.ts:20`, `server/src/services/workOrder.service.ts:162` | Renders paginated list of work orders with search bar, status chips (All, Open, Assigned, InProgress, etc.), and category dropdown filter. |
| **F-10** | Work Order Detail (Timeline, Map, Photos, AI Badge) | Implemented | `client/src/features/work-orders/components/WorkOrderDetail.tsx`, `client/src/features/work-orders/components/StatusTimeline.tsx` | Displays status timeline, Leaflet map with job/team coordinates, before/after image cards, AI confidence badge, rating widget, and PDF buttons. |
| **F-11** | Rating that Closes Order | Implemented | `server/src/services/workOrder.service.ts:318`, `server/src/controllers/workOrder.controller.ts:92`, `client/src/features/work-orders/components/WorkOrderDetail.tsx:410` | Client submits 1-5 stars; creates Rating document, marks work order `Closed`, sets `closedAt`, updates field team average rating, and links PDF report URL. |
| **F-12** | Field Team Dashboard | Implemented | `client/src/features/dashboard/components/FieldTeamDashboard.tsx` | Provides GPS broadcast toggle switch, active job card, status transition buttons, drag-and-drop before/after photo upload, and AI inspection feedback. |
| **F-13** | GPS Broadcasting | Implemented | `client/src/features/dashboard/components/FieldTeamDashboard.tsx:81`, `server/src/controllers/tracking.controller.ts:10`, `server/src/socket/gps.handler.ts:9` | Uses browser `navigator.geolocation.watchPosition` to post coordinates to `/api/tracking/update` and emit `gps:update` over Socket.IO to `admin:tracking` room. |
| **F-14** | Status Updates with Validated Transitions | Partial | `server/src/services/workOrder.service.ts:210`, `server/src/validators/workOrder.validator.ts:12` | Accepts status updates and sets timestamps (`assignedAt`, `startedAt`, `closedAt`), but **does not enforce state transition rules** (any status can transition to any other). |
| **F-15** | Before Photo Upload | Implemented | `server/src/routes/workOrder.routes.ts:18`, `server/src/controllers/workOrder.controller.ts:74`, `server/src/services/workOrder.service.ts:231` | Multer middleware accepts image upload in memory, converts buffer to base64 data URL, and saves to work order document. |
| **F-16** | After Photo Upload that Triggers AI | Implemented | `server/src/routes/workOrder.routes.ts:19`, `server/src/controllers/workOrder.controller.ts:83`, `server/src/services/workOrder.service.ts:245` | Converts buffer to data URL, fetches before image, invokes `verifyServiceQuality`, logs metrics, and sets status to `PendingReview` (Pass) or `Flagged` (Fail). |
| **F-17** | Admin Dashboard | Implemented | `client/src/features/dashboard/components/AdminDashboard.tsx`, `server/src/controllers/analytics.controller.ts:10` | Shows 4 KPI cards (Avg Response, Completion Rate, CSAT, AI Confidence), live Leaflet mini-map, recent orders table with override action, and quick links. |
| **F-18** | Smart Auto-Assignment | Implemented | `server/src/services/assignment.service.ts:14`, `server/src/models/assignment.model.ts` | Filters active teams by category and capacity (<5); scores via (0.5 	imes 	ext{proximity} + 0.3 	imes 	ext{workload} + 0.2 	imes 	ext{rating}); assigns highest scorer. |
| **F-19** | Admin Override | Implemented | `server/src/services/assignment.service.ts:122`, `server/src/controllers/workOrder.controller.ts:55` | Reassigns work order to selected team, updates active order counts on old/new teams, records manual override record in `assignments` collection. |
| **F-20** | Live GPS Map | Implemented | `client/src/features/tracking/components/LiveTrackingMap.tsx`, `server/src/controllers/tracking.controller.ts:15` | Fullscreen Leaflet map displaying active team markers with status badges, popup details (team lead, category, active jobs), and real-time Socket.IO updates. |
| **F-21** | All Work Orders Management | Implemented | `client/src/features/work-orders/components/WorkOrderList.tsx`, `server/src/controllers/workOrder.controller.ts:20` | Admin view listing all enterprise work orders with search, multi-status filters, team assignment column, and navigation to details. |
| **F-22** | Team Management | Implemented | `client/src/features/teams/components/TeamList.tsx`, `server/src/controllers/team.controller.ts:10`, `server/src/routes/team.routes.ts` | Displays team cards with rating, jobs completed, active orders, and zone radius; modal dialog allows creating new teams and editing existing teams. |
| **F-23** | AI Image Verification | Implemented | `ai-service/app.py:107`, `server/src/services/vision.service.ts:400`, `server/src/models/aiVerificationLog.model.ts` | Dual engine: Node Sharp SSIM + edge variance + color shift in backend, and Flask pixel difference + chi-squared histogram in microservice. |
| **F-24** | AI Fail and Re-Upload Flow | Implemented | `server/src/services/workOrder.service.ts:264`, `client/src/features/dashboard/components/FieldTeamDashboard.tsx:44` | When verification fails or flags duplicate image fraud, status transitions to `Flagged`; field team dashboard displays warning and enables re-upload. |
| **F-25** | Behavior when AI Service is Down | Implemented | `server/src/services/ai.service.ts:35`, `server/src/services/vision.service.ts:272` | Backend falls back to local in-process Sharp/libvips vision engine; if images cannot be loaded, uses deterministic analytical fallback score. |
| **F-26** | In-App Chat | Implemented | `client/src/features/chat/components/ChatWindow.tsx`, `server/src/socket/chat.handler.ts:4`, `server/src/services/chat.service.ts` | Real-time messaging via Socket.IO joined to work order rooms; persists messages in MongoDB `chatmessages` and in-memory store. |
| **F-27** | Notifications (Push, Email, Retry, Fallback) | Partial | `server/src/services/notification.service.ts`, `server/src/models/notification.model.ts`, `client/src/features/notifications/components/NotificationList.tsx` | Notification model, CRUD API, and in-app notification center are implemented; **push/email delivery is stubbed with mock status**; no retry loop or callers wired in business logic. |
| **F-28** | Completion Report PDF | Implemented | `server/src/services/pdf.service.ts:11`, `server/src/controllers/report.controller.ts:11` | Generates executive branded A4 PDF via PDFKit containing client info, dispatch metrics, AI audit scores, and digital compliance stamp; streams directly as binary. |
| **F-29** | Invoice PDF | Implemented | `server/src/services/pdf.service.ts:239`, `server/src/controllers/report.controller.ts:58`, `server/src/models/invoice.model.ts` | Generates commercial invoice PDF with itemized service tables, banking wire details, Net-30 payment terms, subtotal/tax calculations, and digital seal. |
| **F-30** | E-Waste Disposal Certificate | Partial | `server/src/services/pdf.service.ts:138-146` | Rendered as an embedded `ENVIRONMENTAL SUSTAINABILITY & RECYCLING DISPATCH MANIFEST` section inside the Service Completion Report PDF; **no standalone certificate document exists**. |
| **F-31** | PDF Retry | Partial | `server/src/controllers/report.controller.ts:46, 90`, `server/src/services/workOrder.service.ts:335` | PDF generation is wrapped in try/catch and dynamically compiled on each request if URL is missing, but **no scheduled retry queue or persistent worker** exists. |
| **F-32** | Analytics Dashboard | Implemented | `client/src/features/analytics/components/AnalyticsDashboard.tsx`, `server/src/services/analytics.service.ts:10` | Interactive Chart.js charts: Order Volume (Bar), Category Mix (Doughnut), Response Time (Line), Demand by Zone (Horizontal Bar), and KPI metric summaries. |
| **F-33** | 7-Day Workload Prediction | Implemented | `ai-service/app.py:216`, `server/src/services/analytics.service.ts:98` | Returns 7-day predicted volume and recommended staffing levels based on moving average seasonality or linear regression extrapolation. |
| **F-34** | CSV / PDF Export | Implemented | `server/src/controllers/analytics.controller.ts:25`, `server/src/services/analytics.service.ts:135` | Formats historical analytics data into downloadable CSV with `Content-Type: text/csv` or binary PDF overview. |
| **F-35** | Role-Based Access Control (RBAC) | Implemented | `server/src/middleware/rbac.middleware.ts:5`, `client/src/shared/components/ProtectedRoute.tsx:12` | Express middleware blocks unauthorized roles with 403 Forbidden; React router wraps private route trees with role checks (`Client`, `FieldTeam`, `Admin`). |
| **F-36** | Swagger / OpenAPI Documentation | Implemented | `server/src/config/swagger.ts:1`, `server/src/app.ts:40` | OpenAPI 3.0 specification generated via `swagger-jsdoc` and served at `/api-docs` using `swagger-ui-express`. |
| **F-37** | Responsive Design | Implemented | `client/src/shared/components/layouts/DashboardLayout.tsx:85`, `client/src/index.css` | Desktop collapsible sidebar (`hidden md:flex`), mobile hamburger slide-out sheet drawer, responsive grid layouts (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`). |
| **F-38** | Error Handling | Implemented | `server/src/middleware/error.middleware.ts:8`, `server/src/utils/ApiError.ts`, `client/src/infrastructure/api/client.ts:22` | Centralized operational error class (`ApiError`), global Express error interceptor returning JSON error bodies, and Axios response error interceptors. |
| **F-39** | Admin Settings | Implemented | `server/src/controllers/settings.controller.ts:8`, `server/src/models/settings.model.ts`, `client/src/features/settings/components/SettingsPage.tsx` | Allows administrators to view and configure AI confidence thresholds, GPS interval seconds, max active orders per team, default currency, and SMTP settings. |

### 3.1 Features Implemented Beyond the List
1. **High-Availability In-Memory Store / Demo Fallback**: When MongoDB Atlas connection times out or is offline, all controllers and services (`auth.service.ts`, `workOrder.service.ts`, `team.controller.ts`, `chat.service.ts`, `notification.service.ts`) fall back to in-memory datasets, enabling offline demonstration.
2. **Category Management CRUD**: Dedicated admin UI and API endpoints (`/api/categories`) for creating, updating, and deleting facility service categories (`CategoryManagement.tsx`).
3. **Invoice Management Dashboard**: Complete invoice search, status filtering, manual creation modal, and status transition UI (`InvoiceManagement.tsx`).
4. **User Profile Management**: Endpoints (`/api/users/:id`) and client page (`ProfilePage.tsx`) for updating personal details and passwords.
5. **Direct Binary PDF Streaming with Query Token**: `auth.middleware.ts:30` allows passing JWT in `?token=` query param to allow direct browser tab preview and downloading of binary PDFs.

---

## 4. DATA MODEL

There are **exactly 12 Mongoose models** defined in `server/src/models/`.

| Expected Model in Design | Actual Model in Code | Mongoose Collection Name | Status |
|---|---|---|---|
| User | `User` (`user.model.ts`) | `users` | Exact match |
| WorkOrder | `WorkOrder` (`workOrder.model.ts`) | `workorders` | Exact match |
| FieldTeam | `FieldTeam` (`fieldTeam.model.ts`) | `fieldteams` | Exact match |
| Assignment | `Assignment` (`assignment.model.ts`) | `assignments` | Exact match |
| AIVerificationLog | `AiVerificationLog` (`aiVerificationLog.model.ts`) | `aiverificationlogs` | Casing difference (`Ai` vs `AI`) |
| Invoice | `Invoice` (`invoice.model.ts`) | `invoices` | Exact match |
| Rating | `Rating` (`rating.model.ts`) | `ratings` | Exact match |
| ChatMessage | `ChatMessage` (`chatMessage.model.ts`) | `chatmessages` | Exact match |
| Notification | `Notification` (`notification.model.ts`) | `notifications` | Exact match |
| GPSLog | `GpsLog` (`gpsLog.model.ts`) | `gpslogs` | Casing difference (`Gps` vs `GPS`) |
| ServiceCategory | `ServiceCategory` (`serviceCategory.model.ts`) | `servicecategories` | Exact match |
| Settings | `Settings` (`settings.model.ts`) | `settings` | Exact match |

### 4.1 Complete Field & Index Specifications

#### 1. `User` (`server/src/models/user.model.ts`)
- **Collection**: `users`
- **Fields**:
  - `name`: String, required, trim
  - `email`: String, required, unique, lowercase, trim
  - `passwordHash`: String, required, select: false
  - `role`: String, required, enum: `['Client', 'FieldTeam', 'Admin']`
  - `phone`: String, required, trim
  - `isVerified`: Boolean, default: `false`
  - `isActive`: Boolean, default: `true`
  - `failedLoginAttempts`: Number, default: `0`
  - `accountLockedUntil`: Date, optional
  - `verificationToken`: String, optional
  - `verificationTokenExpiry`: Date, optional
  - `resetPasswordToken`: String, optional
  - `resetPasswordExpiry`: Date, optional
  - `createdAt`, `updatedAt`: Date (timestamps: true)
- **Indexes**: Unique index on `email`

#### 2. `WorkOrder` (`server/src/models/workOrder.model.ts`)
- **Collection**: `workorders`
- **Fields**:
  - `workOrderCode`: String, required, unique (format: `WO-YYYY-NNNN`)
  - `clientId`: ObjectId, ref: `'User'`, required
  - `teamId`: ObjectId, ref: `'FieldTeam'`, optional
  - `categoryId`: ObjectId, ref: `'ServiceCategory'`, required
  - `status`: String, required, default: `'Open'`, enum: `['Open', 'Assigned', 'InProgress', 'PendingReview', 'Closed', 'Flagged']`
  - `locationAddress`: String, required
  - `locationLat`: Number, required
  - `locationLng`: Number, required
  - `description`: String, required
  - `urgency`: String, required, enum: `['Low', 'Medium', 'High']`
  - `preferredTime`: String, optional
  - `beforeImageUrl`: String, optional
  - `afterImageUrl`: String, optional
  - `isWasteCategory`: Boolean, default: `false`
  - `wasteType`: String, optional
  - `wasteQuantityKg`: Number, optional
  - `aiConfidenceScore`: Number, optional
  - `aiResult`: String, optional
  - `aiVerificationDetails`: Schema.Types.Mixed, optional
  - `pdfReportUrl`: String, optional
  - `assignedAt`: Date, optional
  - `startedAt`: Date, optional
  - `closedAt`: Date, optional
  - `createdAt`, `updatedAt`: Date (timestamps: true)
- **Indexes**:
  - `{ clientId: 1, status: 1 }`
  - `{ teamId: 1, status: 1 }`
  - `{ categoryId: 1 }`
  - `{ status: 1 }`
  - Unique index on `workOrderCode`

#### 3. `FieldTeam` (`server/src/models/fieldTeam.model.ts`)
- **Collection**: `fieldteams`
- **Fields**:
  - `name`: String, required, trim
  - `categoryId`: ObjectId, ref: `'ServiceCategory'`, required
  - `members`: Array of ObjectId, ref: `'User'`
  - `zoneLat`: Number, required
  - `zoneLng`: Number, required
  - `zoneRadiusKm`: Number, default: `10`
  - `isActive`: Boolean, default: `true`
  - `averageRating`: Number, default: `0`
  - `totalJobsCompleted`: Number, default: `0`
  - `activeOrderCount`: Number, default: `0`
  - `createdAt`, `updatedAt`: Date (timestamps: true)
- **Indexes**: Default `_id` index

#### 4. `Assignment` (`server/src/models/assignment.model.ts`)
- **Collection**: `assignments`
- **Fields**:
  - `workOrderId`: ObjectId, ref: `'WorkOrder'`, required, unique
  - `teamId`: ObjectId, ref: `'FieldTeam'`, required
  - `method`: String, required, enum: `['Auto', 'Manual']`
  - `proximityScore`: Number, optional
  - `workloadScore`: Number, optional
  - `ratingScore`: Number, optional
  - `compositeScore`: Number, optional
  - `overriddenBy`: ObjectId, ref: `'User'`, optional
  - `overrideReason`: String, optional
  - `assignedAt`: Date, default: `Date.now`
- **Indexes**: Unique index on `workOrderId`

#### 5. `AiVerificationLog` (`server/src/models/aiVerificationLog.model.ts`)
- **Collection**: `aiverificationlogs`
- **Fields**:
  - `workOrderId`: ObjectId, ref: `'WorkOrder'`, required, unique
  - `beforeImageUrl`: String, required
  - `afterImageUrl`: String, required
  - `confidenceScore`: Number, required, min: 0, max: 1
  - `result`: String, required, enum: `['Pass', 'Fail', 'Flagged']`
  - `modelVersion`: String, required
  - `processingTimeMs`: Number, optional
  - `verifiedAt`: Date, required
  - `metrics`: Object { structuralDifference, cleanlinessImprovement, ssim, clarityScore, fraudRiskScore, colorShift }
  - `fraudAnalysis`: Object { isDuplicate, identicalImage, hashDifference, fraudAlert, status }
  - `qualityAssessment`: Object { beforeClarity, afterClarity, blurDetected, adequateLighting, qualityRating }
  - `findings`: Array of String
  - `serviceRecommendation`: String, optional
- **Indexes**: Unique index on `workOrderId`

#### 6. `Invoice` (`server/src/models/invoice.model.ts`)
- **Collection**: `invoices`
- **Fields**:
  - `workOrderId`: ObjectId, ref: `'WorkOrder'`, required, unique
  - `clientId`: ObjectId, ref: `'User'`, required
  - `invoiceCode`: String, required, unique (format: `INV-YYYY-NNNN`)
  - `amount`: Number, required
  - `subtotal`: Number, optional
  - `tax`: Number, default: `0`
  - `currency`: String, default: `'USD'`
  - `status`: String, default: `'Issued'`, enum: `['Issued', 'Paid', 'Cancelled']`
  - `items`: Array of Subdocuments { description: String, quantity: Number, unitPrice: Number, total: Number }
  - `pdfUrl`: String, optional
  - `issuedAt`: Date, required, default: `Date.now`
  - `paidAt`: Date, optional
  - `createdAt`, `updatedAt`: Date (timestamps: true)
- **Indexes**: Unique index on `invoiceCode`, unique index on `workOrderId`, compound index on `{ clientId: 1, status: 1 }`

#### 7. `Rating` (`server/src/models/rating.model.ts`)
- **Collection**: `ratings`
- **Fields**:
  - `workOrderId`: ObjectId, ref: `'WorkOrder'`, required, unique
  - `clientId`: ObjectId, ref: `'User'`, required
  - `teamId`: ObjectId, ref: `'FieldTeam'`, required
  - `stars`: Number, required, min: 1, max: 5
  - `comment`: String, optional
  - `ratedAt`: Date, default: `Date.now`
- **Indexes**: Unique index on `workOrderId`

#### 8. `ChatMessage` (`server/src/models/chatMessage.model.ts`)
- **Collection**: `chatmessages`
- **Fields**:
  - `workOrderId`: ObjectId, ref: `'WorkOrder'`, required
  - `senderId`: ObjectId, ref: `'User'`, required
  - `senderRole`: String, required, enum: `['Client', 'FieldTeam', 'Admin']`
  - `message`: String, required, trim
  - `isRead`: Boolean, default: `false`
  - `sentAt`: Date, default: `Date.now`
- **Indexes**: Compound index on `{ workOrderId: 1, sentAt: 1 }`

#### 9. `Notification` (`server/src/models/notification.model.ts`)
- **Collection**: `notifications`
- **Fields**:
  - `userId`: ObjectId, ref: `'User'`, required
  - `workOrderId`: ObjectId, ref: `'WorkOrder'`, optional
  - `type`: String, required, enum: `['NewAssignment', 'StatusUpdate', 'RatingPrompt', 'ReInspection', 'Broadcast']`
  - `title`: String, required
  - `message`: String, required
  - `isRead`: Boolean, default: `false`
  - `channel`: String, required, enum: `['Push', 'Email', 'Both']`
  - `deliveryStatus`: String, default: `'Pending'`, enum: `['Pending', 'Delivered', 'Failed']`
  - `retryCount`: Number, default: `0`
  - `sentAt`: Date, default: `Date.now`
- **Indexes**: Compound index on `{ userId: 1, isRead: 1 }`

#### 10. `GpsLog` (`server/src/models/gpsLog.model.ts`)
- **Collection**: `gpslogs`
- **Fields**:
  - `teamId`: ObjectId, ref: `'FieldTeam'`, required
  - `workOrderId`: ObjectId, ref: `'WorkOrder'`, optional
  - `lat`: Number, required
  - `lng`: Number, required
  - `accuracyMeters`: Number, optional
  - `recordedAt`: Date, default: `Date.now`
- **Indexes**: Compound index on `{ teamId: 1, recordedAt: 1 }`

#### 11. `ServiceCategory` (`server/src/models/serviceCategory.model.ts`)
- **Collection**: `servicecategories`
- **Fields**:
  - `name`: String, required, unique
  - `description`: String, required
  - `isPaid`: Boolean, default: `false`
  - `isWaste`: Boolean, default: `false`
  - `iconUrl`: String, optional
  - `basePrice`: Number, default: `0`
  - `createdAt`, `updatedAt`: Date (timestamps: true)
- **Indexes**: Unique index on `name`

#### 12. `Settings` (`server/src/models/settings.model.ts`)
- **Collection**: `settings`
- **Fields**:
  - `aiConfidenceThreshold`: Number, default: `0.75`
  - `gpsIntervalSeconds`: Number, default: `30`
  - `maxActiveOrdersPerTeam`: Number, default: `5`
  - `maxFailedLoginAttempts`: Number, default: `5`
  - `defaultCurrency`: String, default: `'USD'`
  - `slaTargetHours`: Number, default: `4`
  - `autoDispatchEnabled`: Boolean, default: `true`
  - `smtpHost`: String, optional
  - `smtpUser`: String, optional
  - `smtpPort`: Number, optional
  - `createdAt`, `updatedAt`: Date (timestamps: true)
- **Indexes**: Default `_id` index

---

## 5. API INVENTORY

### 5.1 Endpoint Statistics
- **Total REST Endpoints**: **61** (58 Express REST endpoints + 3 Flask AI microservice endpoints).
- **Original Planned Endpoints**: 34 endpoints.
- **Planned vs Actual Comparison**: All 34 planned endpoints are implemented, plus **27 additional endpoints** added for production usability (e.g. `/api/auth/me`, `/api/categories` CRUD, `/api/invoices` CRUD, `/api/settings`, and in-depth AI endpoints).

### 5.2 Complete REST Endpoint Table

| Method | Full Path | Auth Req. | Allowed Roles | Request Body / Query | Response Shape | Source File | Planned? |
|---|---|---|---|---|---|---|---|
| **GET** | `/health` | No | Public | None | `{ status, timestamp }` | `server/src/app.ts:50` | Extra |
| **POST** | `/api/auth/register` | No | Public | `{ name, email, role, phone, password }` | `ApiResponse<{ user, verificationUrl }>` | `server/src/routes/auth.routes.ts:8` | **Yes (1/34)** |
| **POST** | `/api/auth/login` | No | Public | `{ email, password }` | `ApiResponse<{ user, token }>` | `server/src/routes/auth.routes.ts:9` | **Yes (2/34)** |
| **GET** | `/api/auth/me` | Yes | All | None | `ApiResponse<User>` | `server/src/routes/auth.routes.ts:11` | Extra |
| **GET** | `/api/auth/verify-email/:token` | No | Public | Param: `token` | `ApiResponse<{ email, isVerified }>` | `server/src/routes/auth.routes.ts:13` | **Yes (3/34)** |
| **POST** | `/api/auth/forgot-password` | No | Public | `{ email }` | `ApiResponse<{ message, resetUrl }>` | `server/src/routes/auth.routes.ts:14` | **Yes (4/34)** |
| **POST** | `/api/auth/reset-password/:token` | No | Public | `{ newPassword }` | `ApiResponse<{ message }>` | `server/src/routes/auth.routes.ts:15` | **Yes (5/34)** |
| **POST** | `/api/work-orders` | Yes | Client, Admin | `{ categoryId, locationAddress, locationLat, locationLng, description, urgency, ... }` | `ApiResponse<WorkOrder>` | `server/src/routes/workOrder.routes.ts:11` | **Yes (6/34)** |
| **GET** | `/api/work-orders` | Yes | All | Query: `clientId, teamId, status, page, limit` | `ApiResponse<{ data: WorkOrder[], total, page, limit }>` | `server/src/routes/workOrder.routes.ts:12` | **Yes (7/34)** |
| **GET** | `/api/work-orders/categories` | Yes | All | None | `ApiResponse<Category[]>` | `server/src/routes/workOrder.routes.ts:13` | Extra |
| **GET** | `/api/work-orders/:id` | Yes | All | Param: `id` | `ApiResponse<WorkOrder>` | `server/src/routes/workOrder.routes.ts:14` | **Yes (8/34)** |
| **PATCH** | `/api/work-orders/:id/status` | Yes | FieldTeam, Admin | `{ status: 'Open'|'Assigned'|'InProgress'|'PendingReview'|'Closed'|'Flagged' }` | `ApiResponse<WorkOrder>` | `server/src/routes/workOrder.routes.ts:16` | **Yes (9/34)** |
| **PATCH** | `/api/work-orders/:id/assign` | Yes | Admin | `{ teamId: string, reason?: string }` | `ApiResponse<WorkOrder>` | `server/src/routes/workOrder.routes.ts:17` | **Yes (10/34)** |
| **POST** | `/api/work-orders/:id/images/before` | Yes | FieldTeam, Admin | Multipart file: `image` or `{ imageUrl }` | `ApiResponse<WorkOrder>` | `server/src/routes/workOrder.routes.ts:18` | **Yes (11/34)** |
| **POST** | `/api/work-orders/:id/images/after` | Yes | FieldTeam, Admin | Multipart file: `image` or `{ imageUrl }` | `ApiResponse<WorkOrder>` | `server/src/routes/workOrder.routes.ts:19` | **Yes (12/34)** |
| **POST** | `/api/work-orders/:id/rating` | Yes | Client, Admin | `{ stars: 1-5, comment?: string }` | `ApiResponse<Rating>` | `server/src/routes/workOrder.routes.ts:20` | **Yes (13/34)** |
| **POST** | `/api/tracking/update` | Yes | FieldTeam | `{ lat, lng, accuracy, workOrderId? }` | `ApiResponse<GpsLog>` | `server/src/routes/tracking.routes.ts:8` | **Yes (14/34)** |
| **GET** | `/api/tracking/all` | Yes | Admin | None | `ApiResponse<TeamPosition[]>` | `server/src/routes/tracking.routes.ts:9` | **Yes (15/34)** |
| **GET** | `/api/tracking/:teamId` | Yes | Client, Admin | Param: `teamId` | `ApiResponse<TeamPosition>` | `server/src/routes/tracking.routes.ts:10` | **Yes (16/34)** |
| **GET** | `/api/teams/leads` | Yes | Admin | None | `ApiResponse<User[]>` | `server/src/routes/team.routes.ts:12` | Extra |
| **GET** | `/api/teams` | Yes | All | None | `ApiResponse<FieldTeam[]>` | `server/src/routes/team.routes.ts:13` | **Yes (17/34)** |
| **GET** | `/api/teams/:id` | Yes | All | Param: `id` | `ApiResponse<FieldTeam>` | `server/src/routes/team.routes.ts:14` | Extra |
| **POST** | `/api/teams` | Yes | Admin | `{ name, categoryId, members, zoneLat, zoneLng, zoneRadiusKm }` | `ApiResponse<FieldTeam>` | `server/src/routes/team.routes.ts:17` | **Yes (18/34)** |
| **PATCH** | `/api/teams/:id` | Yes | Admin | `{ name?, members?, zoneRadiusKm?, ... }` | `ApiResponse<FieldTeam>` | `server/src/routes/team.routes.ts:18` | **Yes (19/34)** |
| **PATCH** | `/api/teams/:id/deactivate` | Yes | Admin | Param: `id` | `ApiResponse<FieldTeam>` | `server/src/routes/team.routes.ts:19` | **Yes (20/34)** |
| **GET** | `/api/chat/:workOrderId` | Yes | All | Param: `workOrderId` | `ApiResponse<ChatMessage[]>` | `server/src/routes/chat.routes.ts:7` | **Yes (21/34)** |
| **POST** | `/api/chat/:workOrderId` | Yes | All | `{ message: string }` | `ApiResponse<ChatMessage>` | `server/src/routes/chat.routes.ts:8` | **Yes (22/34)** |
| **GET** | `/api/notifications` | Yes | All | None | `ApiResponse<Notification[]>` | `server/src/routes/notification.routes.ts:7` | **Yes (23/34)** |
| **PATCH** | `/api/notifications/:id/read` | Yes | All | Param: `id` | `ApiResponse<{ success: true }>` | `server/src/routes/notification.routes.ts:8` | **Yes (24/34)** |
| **PATCH** | `/api/notifications/read-all` | Yes | All | None | `ApiResponse<{ success: true }>` | `server/src/routes/notification.routes.ts:9` | **Yes (25/34)** |
| **GET** | `/api/analytics` | Yes | Admin | Query: `from, to, category` | `ApiResponse<AnalyticsDashboardData>` | `server/src/routes/analytics.routes.ts:8` | **Yes (26/34)** |
| **GET** | `/api/analytics/predict` | Yes | Admin | None | `ApiResponse<ForecastData>` | `server/src/routes/analytics.routes.ts:9` | **Yes (27/34)** |
| **GET** | `/api/analytics/export` | Yes | Admin | Query: `format: 'csv'|'pdf', from, to` | Binary CSV or PDF stream | `server/src/routes/analytics.routes.ts:10` | **Yes (28/34)** |
| **GET** | `/api/reports/:id/pdf` | Yes | Client, Admin, FT | Param: `id` | Binary PDF stream (`application/pdf`) | `server/src/routes/report.routes.ts:8` | **Yes (29/34)** |
| **GET** | `/api/reports/:id/invoice` | Yes | Client, Admin, FT | Param: `id` | Binary PDF stream (`application/pdf`) | `server/src/routes/report.routes.ts:9` | **Yes (30/34)** |
| **GET** | `/api/invoices` | Yes | All | None | `ApiResponse<Invoice[]>` | `server/src/routes/invoice.routes.ts:8` | Extra |
| **GET** | `/api/invoices/:id` | Yes | All | Param: `id` | `ApiResponse<Invoice>` | `server/src/routes/invoice.routes.ts:9` | Extra |
| **GET** | `/api/invoices/:id/pdf` | Yes | All | Param: `id` | Binary PDF stream (`application/pdf`) | `server/src/routes/invoice.routes.ts:10` | Extra |
| **POST** | `/api/invoices` | Yes | Admin | `{ workOrderId, clientId, amount, description, ... }` | `ApiResponse<Invoice>` | `server/src/routes/invoice.routes.ts:15` | Extra |
| **PATCH** | `/api/invoices/:id/status` | Yes | Admin | `{ status: 'Paid'|'Cancelled'|'Issued' }` | `ApiResponse<Invoice>` | `server/src/routes/invoice.routes.ts:16` | Extra |
| **GET** | `/api/users/:id` | Yes | All | Param: `id` | `ApiResponse<User>` | `server/src/routes/user.routes.ts:9` | Extra |
| **PATCH** | `/api/users/:id` | Yes | All | `{ name?, phone?, currentPassword?, newPassword? }` | `ApiResponse<User>` | `server/src/routes/user.routes.ts:10` | **Yes (31/34)** |
| **PATCH** | `/api/users/:id/deactivate` | Yes | Admin | Param: `id` | `ApiResponse<User>` | `server/src/routes/user.routes.ts:11` | **Yes (32/34)** |
| **GET** | `/api/categories` | No | Public | None | `ApiResponse<ServiceCategory[]>` | `server/src/routes/category.routes.ts:9` | Extra |
| **GET** | `/api/categories/:id` | No | Public | Param: `id` | `ApiResponse<ServiceCategory>` | `server/src/routes/category.routes.ts:10` | Extra |
| **POST** | `/api/categories` | Yes | Admin | `{ name, description, isPaid, isWaste, basePrice }` | `ApiResponse<ServiceCategory>` | `server/src/routes/category.routes.ts:13` | Extra |
| **PATCH** | `/api/categories/:id` | Yes | Admin | `{ name?, description?, isPaid?, isWaste?, basePrice? }` | `ApiResponse<ServiceCategory>` | `server/src/routes/category.routes.ts:14` | Extra |
| **DELETE** | `/api/categories/:id` | Yes | Admin | Param: `id` | `ApiResponse<{ success: true }>` | `server/src/routes/category.routes.ts:15` | Extra |
| **GET** | `/api/settings` | Yes | Admin | None | `ApiResponse<Settings>` | `server/src/routes/settings.routes.ts:9` | Extra |
| **PATCH** | `/api/settings` | Yes | Admin | Partial settings object | `ApiResponse<Settings>` | `server/src/routes/settings.routes.ts:10` | Extra |
| **POST** | `/api/ai/verify` | Yes | FieldTeam, Admin | `{ beforeUrl, afterUrl, workOrderId? }` | `ApiResponse<AiVisionAnalysisResult>` | `server/src/routes/ai.routes.ts:10` | Extra |
| **GET** | `/api/ai/verification/:workOrderId` | Yes | All | Param: `workOrderId` | `ApiResponse<AiVerificationLog>` | `server/src/routes/ai.routes.ts:11` | Extra |
| **GET** | `/api/ai/forecast` | Yes | Admin | None | `ApiResponse<ForecastData>` | `server/src/routes/ai.routes.ts:14` | Extra |
| **GET** | `/health` (Flask) | No | Public | None | `{ status: "healthy", version, sklearn_available }` | `ai-service/app.py:94` | Extra |
| **POST** | `/verify` (Flask) | No | Internal | `{ before_url, after_url }` | `{ confidenceScore, result, modelVersion, processingTimeMs, details }` | `ai-service/app.py:106` | **Yes (33/34)** |
| **POST** | `/predict` (Flask) | No | Internal | `{ history: [{ date, count, category? }] }` | `{ forecast: [...], modelVersion, overallConfidence }` | `ai-service/app.py:216` | **Yes (34/34)** |

---

## 6. BUSINESS LOGIC DETAILS

### 6.1 Work Order Statuses and Exact Transitions Coded
- **Defined Statuses**: `Open`, `Assigned`, `InProgress`, `PendingReview`, `Closed`, `Flagged`.
- **Allowed Transitions as Enforced in Code**:
  - `server/src/validators/workOrder.validator.ts:13`: Validates that `status` is in the 6-value array.
  - `server/src/services/workOrder.service.ts:210-220`: The `updateStatus` function executes:
    ```typescript
    wo.status = status;
    if (status === 'Assigned' && !wo.assignedAt) wo.assignedAt = new Date();
    if (status === 'InProgress' && !wo.startedAt) wo.startedAt = new Date();
    if (status === 'Closed' && !wo.closedAt) wo.closedAt = new Date();
    await wo.save();
    ```
  - **Audit Finding**: **No state transition matrix or previous-state validation is enforced in code**. Any status can transition directly to any other status (e.g. `Closed` can be transitioned back to `Open`, or `Open` directly to `Closed`).

### 6.2 Team Assignment Algorithm
- **Formula & Weights** (`server/src/services/assignment.service.ts:53-59`):
  $$	ext{proximityScore} = rac{1}{	ext{distance} + 1}$$
  $$	ext{workloadScore} = rac{1}{1 + 	ext{team.activeOrderCount}}$$
  $$	ext{ratingScore} = rac{	ext{team.averageRating} parallel 4.8}{5}$$
  $$	ext{compositeScore} = 0.5 	imes 	ext{proximityScore} + 0.3 	imes 	ext{workloadScore} + 0.2 	imes 	ext{ratingScore}$$
- **Weights**: **50% Proximity, 30% Workload, 20% Rating**.
  *(Contradiction Note: The subagent setup prompt mentioned 40% proximity, 30% workload, 30% rating, but the code explicitly implements 0.5/0.3/0.2).*
- **Distance Calculation**: Calculated using `haversineDistance(team.zoneLat, team.zoneLng, wo.locationLat, wo.locationLng)` returning distance in kilometers (`server/src/utils/haversine.ts`).
- **Behavior when No Team is Available**:
  1. Searches for active teams in category with `activeOrderCount < 5` (`assignment.service.ts:21-25`).
  2. If none, falls back to any active team in category regardless of order count (`assignment.service.ts:28-33`).
  3. If none, falls back to any active team in the system (`assignment.service.ts:36-38`).
  4. If still none, returns `null` and leaves the work order unassigned. In in-memory fallback mode, it assigns `DEFAULT_TEAMS_DATA[0]` (`assignment.service.ts:110`).

### 6.3 Account Lockout, JWT Expiry, and Client Storage
- **Failed Login Threshold**: **5 consecutive failed attempts** (`server/src/services/auth.service.ts:307, 350`).
- **Lockout Duration**: **15 minutes** (`new Date(Date.now() + 15 * 60 * 1000)`).
- **HTTP Code**: 429 (`ApiError(429, ...)`).
- **Reset**: Successful password verification resets `failedLoginAttempts = 0` and clears `accountLockedUntil`.
- **Bypass / Exception**: Demo users (`admin@clearflow.com`, `client@clearflow.com`, etc.) are checked before MongoDB/in-memory accounts and are **never locked out** (`auth.service.ts:269-286`).
- **JWT Expiry**: Configured via `JWT_EXPIRES_IN` (default: `'24h'` in `server/src/config/env.ts:17`).
- **Client Token Storage**: Stored in the browser's `localStorage` under the keys `'clearflow_token'` and `'token'` (`client/src/app/App.tsx:53-54`, `client/src/infrastructure/api/client.ts:12`).

### 6.4 Notification Triggers and Fallback
- **Triggers**: `Notification.create` is called in `demo.seed.ts:270, 282` during database seeding.
- **Audit Finding**: `notificationService.create()` exists in `notification.service.ts:40`, but **has zero call sites across the backend services and controllers**. No notifications are automatically dispatched when an order is created, assigned, verified, or rated.
- **Push / Email Delivery**: The function hardcodes `deliveryStatus = 'Delivered'` (`notification.service.ts:57`). No integration exists for Firebase Cloud Messaging (FCM), APNs, or WebPush.
- **Retry / Fallback**: No retry queue, exponential backoff, or failure fallback logic is implemented in code.

### 6.5 Paid Service Categories & Invoice/Certificate Generation
- **Paid Categories** (`categories.seed.ts:6-10`):
  1. Cleaning (basePrice: $1,200 / 1200)
  2. Electrical Repair (basePrice: $2,000 / 2000)
  3. Plumbing (basePrice: $1,500 / 1500)
  4. Pest Control (basePrice: $3,500 / 3500)
  5. Gardening (basePrice: $1,800 / 1800)
- **Unpaid / Waste Categories** (`categories.seed.ts:11-12`):
  6. General Waste Collection (`isPaid: false, isWaste: true, basePrice: 0`)
  7. E-Waste Recycling (`isPaid: false, isWaste: true, basePrice: 0`)
- **When Invoices are Generated**:
  - Invoices are generated **on demand** when an authenticated client/admin accesses `GET /api/reports/:id/invoice` (`report.controller.ts:97`), `GET /api/invoices/:id/pdf` (`invoice.controller.ts:246`), or when an admin creates one via `POST /api/invoices`.
  - Invoices are **NOT automatically generated upon order closure**.
- **When Certificates are Generated**:
  - The E-Waste recycling manifest is generated dynamically as an embedded section inside the Service Completion Report PDF when `wo.isWasteCategory` or `wo.wasteType` is truthy (`pdf.service.ts:138-146`).

---

## 7. AI SERVICE (PRECISE CODE AUDIT)

### 7.1 AI Endpoints and Input/Output

#### 1. `GET /health` (`ai-service/app.py:94-103`)
- **Input**: None
- **Output**:
  ```json
  {
    "status": "healthy",
    "service": "clearflow-ai",
    "version": "clearflow-v1.0-simulated",
    "sklearn_available": false,
    "timestamp": "2026-10-14T..."
  }
  ```

#### 2. `POST /verify` (`ai-service/app.py:106-213`)
- **Input**:
  ```json
  {
    "before_url": "string (URL)",
    "after_url": "string (URL)"
  }
  ```
- **Output**:
  ```json
  {
    "confidenceScore": 0.87,
    "result": "Pass",
    "modelVersion": "clearflow-v1.0-simulated",
    "processingTimeMs": 124,
    "details": {
      "method": "pixel_analysis",
      "threshold": 0.75,
      "imageDifference": 0.142,
      "beforeHash": "...",
      "afterHash": "..."
    }
  }
  ```

#### 3. `POST /predict` (`ai-service/app.py:216-363`)
- **Input**:
  ```json
  {
    "history": [
      { "date": "2026-08-10", "count": 12, "category": "Cleaning" }
    ]
  }
  ```
- **Output**:
  ```json
  {
    "forecast": [
      { "date": "2026-08-11", "dayOfWeek": "Tuesday", "predictedRequests": 14, "recommendedStaff": 3, "confidence": 0.72 }
    ],
    "modelVersion": "clearflow-v1.0-simulated",
    "overallConfidence": 0.72,
    "dataPointsUsed": 7,
    "method": "moving_average"
  }
  ```

### 7.2 Core Verification Algorithm

#### Quoted Core Function from Python Service (`ai-service/app.py:61-91`):
```python
def compute_similarity_score(before_arr: np.ndarray, after_arr: np.ndarray) -> float:
    # Calculate structural difference
    diff = np.abs(after_arr - before_arr)
    mean_diff = float(np.mean(diff))
    
    # Calculate color histogram difference
    before_hist = np.histogram(before_arr, bins=64, range=(0, 1))[0].astype(float)
    after_hist = np.histogram(after_arr, bins=64, range=(0, 1))[0].astype(float)
    
    # Normalize histograms
    before_hist /= (before_hist.sum() + 1e-8)
    after_hist /= (after_hist.sum() + 1e-8)
    
    # Chi-squared distance
    chi_sq = float(np.sum((before_hist - after_hist) ** 2 / (before_hist + after_hist + 1e-8)))
    
    # Combine metrics into confidence score
    # More difference = higher confidence that work was done
    raw_score = (mean_diff * 0.4 + min(chi_sq, 1.0) * 0.3 + random.uniform(0.1, 0.3) * 0.3)
    
    # Scale to realistic range [0.5 - 0.98]
    confidence = min(0.98, max(0.5, raw_score * 2.5 + 0.4))
    
    return round(confidence, 4)
```

#### Quoted In-Process Backend Verification (`server/src/services/vision.service.ts:231-237`):
```typescript
// SSIM standard constants for 8-bit dynamic range L=255
const C1 = (0.01 * 255) ** 2;
const C2 = (0.03 * 255) ** 2;

const numerator = (2 * meanA * meanB + C1) * (2 * covar + C2);
const denominator = (meanA * meanA + meanB * meanB + C1) * (varA + varB + C2);
const ssim = Math.max(0, Math.min(1, numerator / (denominator || 1)));
```

- **Algorithm Nature**:
  - **It is NOT a trained neural network, NOT a pretrained deep model, and NOT a machine learning classifier.**
  - It uses **classical pixel-level arithmetic, mean difference, color histograms, and standard SSIM** via Sharp/libvips in Node.js and PIL/NumPy in Flask, combined with a **randomized floating-point perturbation** (`random.uniform(0.1, 0.3)`).
  - If images cannot be downloaded by Flask, it returns a random number: `round(random.uniform(0.70, 0.95), 4)` (`ai-service/app.py:149`).
- **Library Calls Involved**:
  - Python: `PIL.Image.open`, `Image.convert('RGB')`, `Image.resize((224, 224))`, `np.array`, `np.abs`, `np.mean`, `np.histogram`, `np.sum`, `hashlib.md5`, `random.uniform`.
  - Node.js: `sharp(buf).resize()`, `sharp.grayscale()`, `sharp.raw()`, `sharp.stats()`, `sharp.convolve()`.

### 7.3 Model Files and Training Data
- **Model Files Present (`.pkl`, `.h5`, `.onnx`, `.pt`, `.bin`)**: **0 files found**. None exist in the repository.
- **Training Scripts, Notebooks, or Datasets**: **0 files found**. No training script, no `.ipynb` Jupyter notebook, and no CSV/image dataset exists in the repository.

### 7.4 Confidence Value Computation and Threshold Configuration
- **Computation**: In Flask, calculated as `min(0.98, max(0.5, (mean_diff * 0.4 + min(chi_sq, 1.0) * 0.3 + random.uniform(0.1, 0.3) * 0.3) * 2.5 + 0.4))`.
- **Threshold**: Defaults to `0.75`.
- **Where Configured**:
  - Environment variable `AI_CONFIDENCE_THRESHOLD` in `ai-service/app.py:30`.
  - Database collection `settings` in `server/src/models/settings.model.ts:22` (`default: 0.75`).

### 7.5 Workload Prediction Model
- **Model Type**:
  - Primary: Simple 14-day moving average with hardcoded day-of-week multipliers (`Monday: 1.15`, `Friday: 1.1`, `Weekend: 0.7`) plus `random.uniform(-3, 3)` (`ai-service/app.py:339-347`).
  - Secondary: Linear Regression (`sklearn.linear_model.LinearRegression`) if scikit-learn is installed and (ge 14) days of history are supplied. Note: scikit-learn is not in `requirements.txt`.
- **Data Trained On**: No pre-trained model. Operates directly on the JSON payload `history` passed by the backend caller.
- **Data Span**: Backend passes up to 90 days of work order timestamps; Flask requires at least 7 days, falling back to static extrapolation of 12 requests/day if fewer data points exist.

### 7.6 Fact-Check of Generated PDF Claims

| Phrase in Generated PDF | Backed / Partly Backed / Not Backed | Evidence & Explanation |
|---|---|---|
| **"ClearFlow-Vision v2.4"** | **Partly Backed** | Hardcoded as a static string in `vision.service.ts:280` (`'ClearFlow-VisionEngine-v2.4 (libvips)'`) and `pdf.service.ts:161`. It is not a published software version or model artifact. |
| **"Dual Residual SSIM"** | **Not Backed** | `vision.service.ts:231-237` calculates standard single-scale grayscale SSIM. No "dual residual" algorithm or formula exists in code. |
| **"Deep Feature Contrast Matrix"** | **Not Backed** | No deep feature extraction, neural embeddings, or contrast matrices are computed in either Python or Node.js services. |
| **"96% confidence" / "96.4%"** | **Not Backed** | Printed as a hardcoded static string in `pdf.service.ts:65, 156, 171` whenever `workOrderData.aiConfidenceScore` is missing. |
| **"ISO 9001/41001 Compliant"** | **Not Backed** | Hardcoded static decorative header in `pdf.service.ts:44`. No ISO compliance audit, verification engine, or metadata exists. |
| **"SHA-256 verified"** | **Not Backed** | Hardcoded static text drawn inside a decorative box in `pdf.service.ts:219`. No SHA-256 hash calculation of the document or digital signature is performed. |

---

## 8. DOCUMENT GENERATION

### 8.1 PDF Generators and Printed Fields
- **Location**: `server/src/services/pdf.service.ts`
- **Completion Report PDF** (`buildReportPdfBuffer`, lines 11-234):
  - Printed fields: Work order code, issue timestamp, status badge, AI confidence score, client name, email, phone, facility address, service category, assigned team name, urgency, execution window, problem description, environmental sustainability manifest (if waste category), AI engine version, before/after photo placeholders with evidence labels, field lead signature block, client acceptance confirmation, and digital compliance seal.
- **Commercial Invoice PDF** (`buildInvoicePdfBuffer`, lines 239-444):
  - Printed fields: Invoice code, issue date, status badge (`PAID IN FULL` / `PAYMENT DUE`), payment terms (Net 30 Days with computed due date), client organization name, billing email, facility location, remittance bank beneficiary, banking partner, SWIFT/BIC, IBAN, itemized billing table (Item description, quantity, unit rate, line total), subtotal, facility tax (15%), total due in USD, payment policy notes, financial comptroller signature, and cloud ledger authentication box.

### 8.2 Currency, Bank Details, and Entity Attributes
- **Currency**: **USD (`$`)** is hardcoded in `pdf.service.ts:368, 369, 396, 400, 405, 413` and in `Invoice.create` (`invoice.model.ts:42`, `pdf.service.ts:499`).
- **Bank Remittance Details**: Completely **hardcoded** in `pdf.service.ts:327-339`:
  - Beneficiary: `ClearFlow Operations International`
  - Banking Partner: `JPMorgan Chase Bank, N.A.`
  - SWIFT / BIC: `CHASUS33CFW`
  - IBAN / Account: `US88 0002 0260 9941 28`
- **Tax IDs and Company Names**: Completely **hardcoded** in `pdf.service.ts:264-269, 436`:
  - Corporate Tax ID: `US-EIN-894-2026-CF`
  - VAT Reg: `CF-992014-INTL`
  - Address: `100 Enterprise Way, Suite 400`
- **Database / Settings Sourcing**: **None** of the company names, bank details, or tax numbers are fetched from the database or `Settings` model.

### 8.3 Invoice Date vs Completion Date
- Invoices can be dated **before** a work order is completed.
- **Reason in Code**: Invoices are generated on-demand at the moment an invoice endpoint is accessed (`report.controller.ts:97`, `pdf.service.ts:502`), or created manually by an Admin via `POST /api/invoices` (`invoice.controller.ts:121`). In both cases, `issuedAt` is stamped with `Date.now()`, regardless of whether the work order status is still `Open` or `InProgress`.

### 8.4 File Storage and Serving
- PDFs are generated in-memory as `Buffer` objects via PDFKit streams (`doc.on('data', ...)`) and returned directly to the browser with `Content-Type: application/pdf` and `Content-Disposition: inline`.
- PDFs are **not stored on disk or uploaded to Cloudinary**.
- Uploaded user images (before/after photos) are stored directly inside MongoDB / in-memory objects as **base64 data URIs** (`data:image/jpeg;base64,...`) via Multer memory storage (`workOrder.controller.ts:86`).

---

## 9. REAL-TIME FEATURES

### 9.1 Socket.IO Architecture
- **Authentication**: `server/src/socket/index.ts:14-28` validates `socket.handshake.auth.token` using `jose.jwtVerify` with `JWT_SECRET`. Sockets failing validation are rejected with an error.
- **Rooms**:
  - `admin:tracking`: Only joined by sockets where `socket.user.role === 'Admin'` (`socket/gps.handler.ts:5-7`).
  - `chat:<workOrderId>`, `chat_<workOrderId>`, `<workOrderId>`: Joined when any client socket emits `chat:join` (`socket/chat.handler.ts:5-9`).
- **Events**:
  - `gps:update`: Emitted by field team clients with `{ lat, lng, accuracy, teamId }`. Re-broadcast by the server exclusively to `admin:tracking`.
  - `chat:message`: Emitted with `{ workOrderId, message }`. The server sets `senderId = socket.user.userId` (preventing identity spoofing), saves to database/in-memory store, and broadcasts to the work order room.

### 9.2 GPS Broadcast Mechanism
- **Interval**: Configured as `30` seconds in `settings.model.ts:23`.
- **Client Implementation**: `FieldTeamDashboard.tsx:81-105` uses the browser's native `navigator.geolocation.watchPosition()` callback, sending coordinates to `POST /api/tracking/update` and emitting `gps:update` over Socket.IO upon movement.
- **Delivery to Admin**: The coordinates are received by `gps.handler.ts`, verified to ensure the sender has role `FieldTeam` or `Admin`, and broadcast to `admin:tracking`. The admin's `LiveTrackingMap.tsx:112` listens for `gps:update` and updates the marker position on Leaflet in real time.

### 9.3 Chat Persistence and Closed Order Behavior
- **Persistence**: All messages are persisted in the MongoDB `chatmessages` collection (`chatMessage.model.ts`) and mirrored in `CHAT_STORE` for offline fallback.
- **Closed Order Read-Only Behavior**: **Not enforced in code**.
  - In `chat.service.ts:73`, `sendMessage` does not check whether the work order status is `Closed`.
  - In `ChatWindow.tsx:278`, the input field is only disabled while sending or if no order is selected. Messages can still be transmitted on closed work orders.

---

## 10. SEED DATA AND DEMO ACCOUNTS

*(Note: Sourced entirely by inspecting `server/src/seeds/demo.seed.ts` and `categories.seed.ts` without executing).*

### 10.1 Counts per Collection Created by Seeds
- **`users`**: **7 users**
  - 1 Admin: Alex Morgan (`admin@clearflow.com`)
  - 3 Clients: James Chen (`james@clearflow.com`), Priya Sharma (`priya@clearflow.com`), Dr. Robert Smith (`robert.smith@clearflow.com`)
  - 3 Field Team Leads: John Doe (`john@clearflow.com`), Michael Johnson (`michael@clearflow.com`), David Williams (`david@clearflow.com`)
- **`fieldteams`**: **5 teams**
  - Team Alpha Crew (Cleaning)
  - Pipe Pros (Plumbing)
  - Voltage Elite (Electrical)
  - Green Guardians (Waste & Recycling)
  - Bug Busters (Pest Control)
- **`workorders`**: **5 work orders**
  - `WO-2026-0001`: Status: `InProgress`, Urgency: `Medium`
  - `WO-2026-0002`: Status: `Assigned`, Urgency: `High`
  - `WO-2026-0003`: Status: `PendingReview`, Urgency: `High`
  - `WO-2026-0004`: Status: `Closed`, Urgency: `Low`
  - `WO-2026-0005`: Status: `Open`, Urgency: `Medium`
- **`servicecategories`**: **7 categories**
  - 5 Paid: Cleaning, Electrical Repair, Plumbing, Pest Control, Gardening
  - 2 Free/Waste: General Waste Collection, E-Waste Recycling
- **`settings`**: **1 record**
  - Default values: `aiConfidenceThreshold: 0.75`, `gpsIntervalSeconds: 30`, `maxActiveOrdersPerTeam: 5`, `defaultCurrency: 'USD'`.
- **`notifications`**: **2 sample notifications**
- **`chatmessages`**: **2 sample messages**
- **Collections with 0 Seeded Records**: `assignments` (0), `aiverificationlogs` (0), `invoices` (0), `ratings` (0), `gpslogs` (0).

---

## 11. FRONTEND

### 11.1 Routes, Component Files, and Access Roles (`client/src/app/router.tsx`)

| Route Path | Component File | Allowed Roles | Brief Description |
|---|---|---|---|
| `/` | `<Navigate to="/dashboard" />` | Public | Redirects to dashboard |
| `/login` | `features/auth/components/LoginForm.tsx` | Public | Credentials login with demo shortcuts |
| `/register` | `features/auth/components/RegisterForm.tsx` | Public | Account registration form |
| `/forgot-password` | `features/auth/components/ForgotPasswordForm.tsx` | Public | Password recovery request form |
| `/reset-password/:token` | `features/auth/components/ResetPasswordForm.tsx` | Public | Password reset execution form |
| `/verify-email/:token` | `features/auth/components/VerifyEmail.tsx` | Public | Email activation token validator |
| `/dashboard` | `RoleDashboard` in `router.tsx` | All Authenticated | Role-based dashboard router |
| `/work-orders` | `features/work-orders/components/WorkOrderList.tsx` | All Authenticated | Searchable/filterable work orders list |
| `/work-orders/:id` | `features/work-orders/components/WorkOrderDetail.tsx` | All Authenticated | Work order details, timeline, map & AI |
| `/work-orders/new` | `features/work-orders/components/ServiceRequestForm.tsx` | Client, Admin | 3-step service request wizard |
| `/chat` | `features/chat/components/ChatWindow.tsx` | All Authenticated | In-app real-time messaging interface |
| `/chat/:workOrderId` | `features/chat/components/ChatWindow.tsx` | All Authenticated | Direct chat window for specific order |
| `/notifications` | `features/notifications/components/NotificationList.tsx` | All Authenticated | Notification center with mark-read |
| `/profile` | `features/profile/components/ProfilePage.tsx` | All Authenticated | User profile details and password change |
| `/reports/:id` | `features/reports/components/ReportViewer.tsx` | All Authenticated | Work order PDF report viewer & download |
| `/reports` | `features/reports/components/ReportViewer.tsx` | All Authenticated | General report viewer |
| `/client/dashboard` | `features/dashboard/components/ClientDashboard.tsx` | Client, Admin | Client request statistics and recent list |
| `/client/requests` | `features/work-orders/components/WorkOrderList.tsx` | Client, Admin | Client work order history |
| `/client/requests/new` | `features/work-orders/components/ServiceRequestForm.tsx` | Client, Admin | Client submission wizard alias |
| `/client/requests/:id` | `features/work-orders/components/WorkOrderDetail.tsx` | Client, Admin | Client detail view alias |
| `/team/dashboard` | `features/dashboard/components/FieldTeamDashboard.tsx` | FieldTeam, Admin | Field team telemetry, jobs & upload |
| `/team/assignments/:id`| `features/work-orders/components/WorkOrderDetail.tsx` | FieldTeam, Admin | Assignment detail view alias |
| `/team/upload/:id` | `features/dashboard/components/FieldTeamDashboard.tsx` | FieldTeam, Admin | Image upload alias |
| `/categories` | `features/categories/components/CategoryManagement.tsx` | Admin | Service category CRUD management |
| `/invoices` | `features/invoices/components/InvoiceManagement.tsx` | Admin | Enterprise billing and invoice tracker |
| `/tracking` | `features/tracking/components/LiveTrackingMap.tsx` | Admin | Real-time Leaflet GPS tracking map |
| `/analytics` | `features/analytics/components/AnalyticsDashboard.tsx` | Admin | Operations charts and forecast cards |
| `/teams` | `features/teams/components/TeamList.tsx` | Admin | Field teams directory and creator |
| `/settings` | `features/settings/components/SettingsPage.tsx` | Admin | System configuration parameters |
| `/admin/*` | Various admin aliases | Admin | Route aliases matching `/admin/<page>` |
| `*` | `shared/components/NotFound.tsx` | Public | 404 page |

### 11.2 UI Libraries and Responsiveness
- **Libraries**: Tailwind CSS v4 (`@tailwindcss/vite`), Shadcn/UI primitives (`@radix-ui/react-*`), Lucide React icons (`lucide-react`), Leaflet & React-Leaflet, Chart.js & React-Chartjs-2, Sonner toast notifications.
- **Responsiveness**: Responsive breakpoints follow standard Tailwind conventions: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px). `DashboardLayout.tsx` uses `hidden md:flex` for the sidebar and an `md:hidden` Sheet drawer on mobile.

---

## 12. TESTING

### 12.1 Automated Test Suites in Codebase

| Test File | Framework | Tests Count | Focus Area | Safe to Run? |
|---|---|---|---|---|
| `server/tests/unit/haversine.test.ts` | Vitest | 2 | Coordinates distance calculation | Yes (pure math) |
| `server/tests/unit/vision.test.ts` | Vitest | 5 | Sharp image SSIM, fraud detection, obstruction | Yes (pure memory buffers) |
| `ai-service/tests/test_routes.py` | Pytest | 4 | Flask `/health`, `/verify`, `/predict` routes | Yes (Flask test client) |
| `server/test_*.cjs` (6 files) | Custom Node | Integration | End-to-end API suites against running server | Only if server is running |

### 12.2 Verbatim Test Output

#### 1. Backend Vitest Suite (`npm --prefix server test`):
```
> clearflow-server@1.0.0 test
> vitest run


 RUN  v3.2.7 C:/Users/ikram/.gemini/antigravity/scratch/clearflow/server

 ✓ tests/unit/haversine.test.ts (2 tests) 3ms
 ✓ tests/unit/vision.test.ts (5 tests) 1546ms
   ✓ AI Vision Engine (libvips) > should handle analytical fallback for sample URLs gracefully  1443ms

 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  15:05:32
   Duration  5.20s (transform 709ms, setup 0ms, collect 2.45s, tests 1.55s, environment 0ms, prepare 1.41s)
```

#### 2. AI Microservice Pytest Suite (`python -m pytest ai-service/tests`):
```
============================= test session starts =============================
platform win32 -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\ikram\.gemini\antigravity\scratch\clearflow\ai-service
configfile: pytest.ini
collected 4 items

ai-service\tests\test_routes.py ....                                     [100%]

============================== 4 passed in 5.00s ==============================
```

### 12.3 Test ID Mapping (TC-01 to TC-27)

| Test ID | Planned Target | Automated Test in Codebase? | Implementation / Location |
|---|---|---|---|
| **TC-01** | Registration | Covered | Integration script `server/test_auth_f01_f05.cjs:58` |
| **TC-02** | Duplicate email | Covered | Integration script `server/test_auth_f01_f05.cjs:75` |
| **TC-03** | Login | Covered | Integration script `server/test_auth_f01_f05.cjs:92` |
| **TC-04** | Account lockout | Covered | Integration script `server/test_auth_f01_f05.cjs:118` |
| **TC-05** | RBAC 403 Forbidden | Covered | Integration script `server/test_realtime_pdf_security_f34_f39.cjs:48` |
| **TC-06** | Create work order | Covered | Integration script `server/test_client_f06_f11.cjs:45` |
| **TC-07** | Validation error | Covered | `ai-service/tests/test_routes.py:24` (`test_verify_missing_body`) |
| **TC-08** | Auto-assignment | Partial | `server/tests/unit/haversine.test.ts:4`, `test_fieldteam_f12_f18.cjs` |
| **TC-09** | No team available | **No Test** | No automated test exists |
| **TC-10** | Admin override | Covered | Integration script `server/test_admin_f19_f28.cjs:42` |
| **TC-11** | Before/after upload | Covered | Integration script `server/test_fieldteam_f12_f18.cjs:70` |
| **TC-12** | AI verification pass | Covered | `server/tests/unit/vision.test.ts:34`, `ai-service/tests/test_routes.py:29` |
| **TC-13** | AI verification fail / fraud | Covered | `server/tests/unit/vision.test.ts:12, 122` |
| **TC-14** | GPS broadcast | Covered | Integration script `server/test_fieldteam_f12_f18.cjs:30` |
| **TC-15** | GPS loss | **No Test** | No automated test exists |
| **TC-16** | Rating closes order & PDF | Covered | Integration script `server/test_client_f06_f11.cjs:120` |
| **TC-17** | PDF failure retry | **No Test** | No automated test exists |
| **TC-18** | Notifications | Covered | Integration script `server/test_admin_f19_f28.cjs:115` |
| **TC-19** | Push failure fallback | **No Test** | No automated test exists |
| **TC-20** | Analytics | Covered | Integration script `server/test_ai_f29_f33.cjs:80` |
| **TC-21** | Prediction | Covered | `ai-service/tests/test_routes.py:41`, `test_ai_f29_f33.cjs:110` |
| **TC-22** | In-app chat | Covered | Integration script `server/test_admin_f19_f28.cjs:85` |
| **TC-23** | Chat read-only on closure | **No Test** | Feature not implemented; no test exists |
| **TC-24** | Full lifecycle end-to-end | Partial | Verified across individual `.cjs` test suites |
| **TC-25** | Concurrent load testing | **No Test** | No load test scripts (k6, Artillery) exist |
| **TC-26** | Mobile viewport rendering | **No Test** | No automated UI/E2E test (Cypress, Playwright) exists |
| **TC-27** | Custom edge cases | **No Test** | No dedicated TC-27 test exists |

### 12.4 CI & Linter Configurations
- **Linter**: `.oxlintrc.json` in `client/`. No ESLint or Prettier configs in server or root.
- **CI Workflows**:
  - `.github/workflows/ci-backend.yml`: Node 20, builds TypeScript, runs `npm test`.
  - `.github/workflows/ci-frontend.yml`: Node 20, runs `npm run build`.
  - `.github/workflows/ci-ai.yml`: Python 3.11, installs `requirements.txt`, runs `pytest || true`.
- **Load Test Scripts**: None exist in the repository.

---

## 13. DEPLOYMENT AND RUNNING

### 13.1 Running on a Clean Machine
1. **Prerequisites**: Node.js (v20+ recommended), npm, Python 3.11+, Git. (MongoDB Atlas or local MongoDB is optional; in-memory fallback will activate if offline).
2. **Install Dependencies**:
   ```bash
   # Root / Server
   cd server && npm install
   # Client
   cd ../client && npm install
   # AI Service
   cd ../ai-service && pip install -r requirements.txt
   ```
3. **Build Frontend**:
   ```bash
   cd client && npm run build
   ```
4. **Start All Services**:
   - On Windows: Run `powershell -ExecutionPolicy Bypass -File .\run_all.ps1`
   - On Linux/macOS:
     ```bash
     # Terminal 1: AI Service
     cd ai-service && python app.py
     # Terminal 2: Server (serves API and compiled client UI)
     cd server && npm run dev
     ```

### 13.2 Machine-Specific Hardcoded Paths
- In `run_all.ps1`:
  - Line 4: `$env:PATH = "C:\Program Files\nodejs;$env:PATH"`
  - Line 17, 32: `& "C:\Program Files\nodejs\npm.cmd"`
  - These are hardcoded Windows paths to Node.js on the author's local workstation.

### 13.3 Deployment Configurations & Deployment Evidence
- **Configs**: No `Dockerfile`, `docker-compose.yml`, `render.yaml`, `vercel.json`, or `Procfile` exists in the repository.
- **Deployment Evidence**: All environment files, launch scripts, and URLs point strictly to `localhost` (`http://localhost:3000`, `http://localhost:5001`). There is **no evidence in the repository that the application is currently deployed to any cloud provider**.

---

## 14. SECURITY CHECK

| Security Control | Status | Evidence / Implementation Details |
|---|---|---|
| **Password Hashing** | In Place | `bcryptjs` with **salt cost factor of 12** (`auth.service.ts:99, 147`, `demo.seed.ts:19`). |
| **Input Validation** | In Place | `express-validator` suites on authentication, work order creation, status update, rating, and team creation (`server/src/validators/`). |
| **Rate Limiting** | In Place | `express-rate-limit` in `rateLimiter.middleware.ts`: General limiter (100 req/min); Auth limiter (10 req/15min). |
| **Security Headers** | In Place | `helmet()` middleware enabled in `server/src/app.ts:25`. |
| **CORS Policy** | Permissive | `cors({ origin: env.CORS_ORIGIN || '*', credentials: true })` in `server/src/app.ts:27`. Defaults to wildcard `*`. |
| **Secrets in Repository** | Present Locally | `server/.env` exists on disk (ignored by `.gitignore`). `server/.env.example` is tracked with dummy defaults. |
| **Hardcoded Credentials** | Present in Code | `server/src/services/auth.service.ts:27-61` contains hardcoded passwords (`Admin@123`, `Demo@123`) for 5 demo accounts. |
| **IDOR Protection** | In Place | `report.controller.ts:35-43, 80-87` and `workOrder.controller.ts:98-105` verify that requesting clients can only access or rate their own work orders. |

---

## 15. KNOWN PROBLEMS & INCONSISTENCIES

### 15.1 TODO / FIXME / HACK Comments
- **Count**: Exactly **0** TODO, FIXME, or HACK comments exist in the codebase.

### 15.2 Mocked or Stubbed Implementations
1. **Cloudinary Uploads**: Although `cloudinary.ts` exists and Cloudinary env vars are defined, no service calls Cloudinary. Images are stored directly as base64 data URIs.
2. **Notification Delivery**: `notification.service.ts` sets `deliveryStatus = 'Delivered'` immediately without invoking an email or push transport.
3. **AI Vision Verification in Flask**: When image URLs cannot be fetched, Flask returns a simulated random score `random.uniform(0.70, 0.95)` (`ai-service/app.py:149`).
4. **Moving Average Workload Prediction**: Flask and Node predictions use synthetic seasonality multipliers and random variance.
5. **In-Memory Store Mirroring**: High-availability in-memory fallbacks replicate DB models across auth, work orders, teams, chat, and notifications.

### 15.3 Inconsistencies Between Code, README, and Generated Documents
1. **AI Model Branding**: Generated PDF reports claim the audit was conducted by *"ClearFlow-Vision v2.4 (Dual Residual SSIM & Deep Feature Contrast Matrix)"* with *"ISO 9001/41001 Compliant"* and *"SHA-256 VERIFIED AUTH"*, whereas the actual code computes classical grayscale SSIM / pixel differences and paints decorative text.
2. **Currency**: The original FYP design specified Pakistani Rupee (PKR) with billing restricted to e-waste disposal. The actual codebase implements US Dollars (`$` / USD) across models and generates commercial invoices for general maintenance jobs.
3. **Number of Endpoints**: The original design documents 34 endpoints. The codebase implements 61 endpoints.
4. **Swagger Documentation URL**: Original design specified `/api/docs`; implemented route is `/api-docs`.
5. **State Transition Validation**: System specification requires strict sequential state transitions (`Open -> Assigned -> InProgress -> PendingReview -> Closed`), but backend code permits direct jumps between any arbitrary states.

---

## 16. DESIGN CHANGES FROM THE ORIGINAL PLAN

| Area / Aspect | Original Plan | Actual Implementation in Codebase |
|---|---|---|
| **Directory Structure** | Monorepo with `frontend/`, `backend/`, `ai-service/` | Monorepo with `client/`, `server/`, `ai-service/` |
| **Language & Framework (Backend)** | JavaScript with Express 4 | TypeScript with Express 5.2.1 |
| **Frontend Framework & Styling** | React 18, Tailwind CSS v3 | React 19.2.8, Tailwind CSS v4.3.3, React Router v7 |
| **Deployment Architecture** | Separate deployments (Vercel for frontend, Render for backend) | Unified monorepo launcher (`run_all.ps1`) serving backend APIs and static frontend bundle locally on port 3000; no Vercel/Render configurations present |
| **AI Verification Engine** | SVM classifier on HOG features trained on ~500 image pairs | No SVM, no HOG features, no training dataset; classical pixel differences and SSIM with random noise in Flask / Sharp in Node |
| **Currency & Invoicing Scope** | PKR currency with only e-waste disposal invoiced | USD currency across schemas; commercial invoices generated for general facility maintenance tasks |
| **API Documentation Path** | Swagger UI at `/api/docs` | Swagger UI at `/api-docs` |
| **API Endpoint Count** | Exactly 34 endpoints | 61 endpoints (58 Express + 3 Flask) |
| **Data Collections** | 12 Collections | Exactly 12 collections (`User`, `WorkOrder`, `FieldTeam`, `Assignment`, `AiVerificationLog`, `Invoice`, `Rating`, `ChatMessage`, `Notification`, `GpsLog`, `ServiceCategory`, `Settings`) |

---

## UNKNOWN / NEEDS A HUMAN

The following items cannot be determined solely by inspecting the repository and require human clarification:
1. **Remote Cloud Deployments**: Whether the project is currently hosted on any live cloud URL (AWS, Render, Vercel, GCP) outside this workstation.
2. **Offline Image Dataset**: Whether the ~500 image pairs originally planned for the SVM classifier were collected, labeled, or stored in an external shared drive by team members.
3. **Production Third-Party Credentials**: Real production API credentials for SendGrid, Twilio, or Cloudinary (the repo contains only dummy/local credentials).
4. **Target Facility Deployment Site**: Whether the intended client deployment is an institutional campus in Pakistan (as suggested by early comments and coordinates) or an international commercial complex (as represented in the updated seed data and USD invoices).
5. **Team Contribution Breakdown**: Specific individual team contributions beyond commit author metadata (git log records 2 commits authored exclusively by Abdullah Ikram on 2026-09-14).
