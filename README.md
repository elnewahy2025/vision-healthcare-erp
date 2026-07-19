# 🏥 Vision Healthcare ERP

**Enterprise Healthcare SaaS Platform** — A comprehensive, multi-tenant Electronic Medical Records (EMR) and Practice Management system designed for the **Egyptian healthcare market**. Covers the full patient lifecycle from appointment scheduling through billing, with AI-powered clinical decision support, real-time analytics, and multi-branch management.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites & Dependencies](#prerequisites--dependencies)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Feature Modules](#-feature-modules)
- [Frontend Routes](#-frontend-routes)
- [Backend Modules](#-backend-modules)
- [Database Migrations](#-database-migrations)
- [Docker Deployment](#docker-deployment)
- [Free Tier Deployment](#-free-tier-deployment)
- [Windows 11 Setup Guide](#-windows-11-setup-guide)
- [Testing](#-testing)
- [Egypt Market Features](#-egypt-market-features)
- [API Documentation](#-api-documentation)
- [Backup & Monitoring](#-backup--monitoring)
- [Contributing](#-contributing)
- [Project Statistics](#-project-statistics)

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React 18 + Vite + TailwindCSS)       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Staff   │ │  Kiosk   │ │ Patient  │ │Queue TV  │       │
│  │   PWA    │ │ Check-in │ │ Portal   │ │ Display  │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │            │            │            │              │
│  82 Pages | Code-Split | Lazy-Loaded | Recharts Analytics   │
│  2,646 i18n Keys (EN + AR) | 19 Shared UI Components       │
├──────────────┴────────────┴────────────┴────────────────────┤
│              Nginx Reverse Proxy (SSL + Rate Limiting)      │
├──────────────┬──────────────────────────────────────────────┤
│              │        Backend (Fastify 4 + TypeScript)       │
│    ┌─────────┴─────────┐  ┌──────────────────────────────┐  │
│    │    62 Modules     │  │      Shared (Types/Utils)     │  │
│    │  Auth, Patient,   │  │  Zod Validators, Enums,       │  │
│    │  Billing, EMR,    │  │  i18n, Error Classes,         │  │
│    │  AI, MultiBranch, │  │  Currency/Date Formatters     │  │
│    │  Analytics, etc.  │  │  Egypt-specific Utilities     │  │
│    └─────────┬─────────┘  └──────────────────────────────┘  │
│              │                                               │
│    ┌─────────┴─────────┐                                    │
│    │  18 Services      │                                    │
│    │ Email, SMS, Chat  │                                    │
│    │ Voice, PDF, Audit │                                    │
│    │ Reminder, Sentry  │                                    │
│    │ WhatsApp, TOTP    │                                    │
│    │ Storage, Payment  │                                    │
│    └─────────┬─────────┘                                    │
├──────────────┴──────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │PostgreSQL│ │  Redis   │ │  MinIO   │ │   ES     │       │
│  │  15      │ │  7       │ │ Storage  │ │(optional)│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 5.x | Build tool + dev server |
| TailwindCSS | 3.4 | Utility-first styling |
| React Router | 6.x | Client-side routing |
| Recharts | 2.x | Data visualization |
| react-i18next | 14.x | Internationalization (EN/AR) |
| react-hot-toast | 2.x | Toast notifications |
| lucide-react | 0.4x | Icons |
| axios | 1.7 | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Fastify | 4.x | HTTP framework |
| TypeScript | 5.x | Type safety |
| Knex.js | 3.x | SQL query builder + migrations |
| PostgreSQL | 15 | Primary database |
| Redis | 7.x | Caching, sessions, rate limiting |
| MinIO | Latest | S3-compatible object storage |
| Swagger | @fastify/swagger | API documentation |
| Zod | 3.x | Schema validation |

### DevOps
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerization |
| Nginx | Reverse proxy, SSL, rate limiting |
| GitHub Actions | CI/CD (ready) |
| Sentry | Error monitoring |

---

## 📁 Project Structure

```
vision-healthcare-erp/
├── packages/
│   ├── shared/              # Shared types, validators, utils
│   │   ├── src/
│   │   │   ├── types/       # TypeScript interfaces
│   │   │   ├── validators/  # Zod schemas
│   │   │   ├── utils/       # Formatters, helpers
│   │   │   └── constants/   # Enums, config
│   │   └── package.json
│   │
│   ├── backend/             # Fastify API server
│   │   ├── src/
│   │   │   ├── core/        # Database, Redis, error handler, migrations
│   │   │   ├── modules/     # 62 feature modules
│   │   │   ├── services/    # 18 service layer
│   │   │   └── index.ts     # App entry point
│   │   ├── migrations/      # 20 database migrations
│   │   └── package.json
│   │
│   └── frontend/            # React SPA
│       ├── src/
│       │   ├── pages/       # 82 page components
│       │   ├── components/  # 19 shared UI components
│       │   ├── stores/      # Zustand state stores
│       │   ├── lib/         # API client, validators, sanitize
│       │   ├── i18n/        # Translation files (en.json, ar.json)
│       │   └── App.tsx      # Router + layout
│       ├── public/
│       └── package.json
│
├── docker-compose.yml       # Full stack orchestration
├── nginx/                   # Reverse proxy config
├── .env.example             # Environment template
└── package.json             # Root workspace config
```

---

## Prerequisites & Dependencies

### Required Software
| Software | Version | Download |
|---|---|---|
| **Node.js** | ≥ 18.x | https://nodejs.org |
| **PostgreSQL** | 15+ | https://www.postgresql.org/download/windows/ |
| **Git** | Latest | https://git-scm.com |

### Optional Software
| Software | Purpose | Download |
|---|---|---|
| **Redis** | Caching (app degrades gracefully without it) | Via WSL2 or Memurai |
| **Docker Desktop** | Containerized deployment | https://docker.com/products/docker-desktop |
| **pgAdmin** | Database GUI | https://www.pgadmin.org |
| **VS Code** | Code editor | https://code.visualstudio.com |

### Node.js Packages (auto-installed)
All dependencies are managed via npm workspaces. Running `npm install` at the root installs everything.

---

## 🚀 Quick Start

### Option 1: Local Development (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/elnewahy2025/vision-healthcare-erp.git
cd vision-healthcare-erp

# 2. Install all dependencies
npm install

# 3. Build shared package first
npm run build -w packages/shared

# 4. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 5. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE healthcare2;"

# 6. Run database migrations
npm run migrate

# 7. Start development servers (in two terminals)
npm run dev:backend    # Terminal 1 — API on port 3000
npm run dev:frontend   # Terminal 2 — UI on port 5173
```

### Option 2: Docker Compose

```bash
# 1. Clone and configure
git clone https://github.com/elnewahy2025/vision-healthcare-erp.git
cd vision-healthcare-erp
cp .env.example .env

# 2. Start all services
docker compose up -d --build

# 3. Run migrations inside the backend container
docker exec visionhc-backend npm run migrate

# 4. Access the application
# Frontend: http://localhost:80
# Backend:  http://localhost:3000
# API Docs: http://localhost:3000/docs
# MinIO:    http://localhost:9001
```

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# === DATABASE ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=healthcare2
DB_USER=postgres
DB_PASSWORD=your_password

# === REDIS ===
REDIS_HOST=localhost
REDIS_PORT=6379

# === AUTH ===
JWT_SECRET=your_64_char_random_secret
JWT_REFRESH_SECRET=your_64_char_random_secret

# === STORAGE (MinIO) ===
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_minio_secret
MINIO_BUCKET=healthcare

# === EMAIL (SMTP or SendGrid) ===
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_FROM=noreply@visionhealthcare.com
SENDGRID_API_KEY=your_sendgrid_key

# === SMS (Twilio) ===
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+201234567890

# === WHATSAPP BUSINESS API ===
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# === PAYMENTS ===
STRIPE_SECRET_KEY=sk_test_xxx
FAWRY_MERCHANT_CODE=your_fawry_code
FAWRY_SECURITY_KEY=your_fawry_key

# === SUPABASE (File Storage) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# === SENTRY (Error Monitoring) ===
SENTRY_DSN=https://your_dsn@sentry.io/project_id
APP_VERSION=1.0.0

# === APP ===
CORS_ORIGIN=https://yourdomain.com
APP_URL=https://yourdomain.com
NODE_ENV=development
PORT=3000
```

---

## 📦 Feature Modules

### Clinical
- **EMR (Electronic Medical Records)** — Patient charts, vitals, SOAP notes
- **AI Diagnosis** — Differential diagnosis suggestions from symptoms
- **AI Clinical Notes** — Automated clinical note generation
- **ICD-10 Arabic** — 25+ diagnosis codes with Arabic translations
- **Arabic Medications** — 20+ drugs with Arabic names and dosages
- **Lab Orders & Results** — Lab management with result tracking
- **Radiology** — Imaging orders and reports
- **Prescriptions** — Digital prescription management
- **Allergies** — Patient allergy tracking with interaction checks
- **Referrals** — Inter-department and external referrals

### Operations
- **Appointments** — Scheduling with calendar view
- **Smart Scheduling** — AI-optimized appointment scheduling
- **Queue Management** — Real-time queue with WebSocket updates
- **Multi-Branch** — Multi-location management with branch switching
- **Home Visits** — Home visit scheduling and tracking
- **Inventory** — Medical supplies and pharmacy inventory
- **Pharmacy** — Prescription dispensing and stock management

### Financial
- **Billing** — Invoice generation and payment tracking
- **ETA e-Invoice** — Egyptian Tax Authority QR code invoices
- **Insurance Claims** — Full claims lifecycle management
- **Expense Tracking** — Operational expense management
- **Financial Reports** — P&L, budget tracking, financial analytics
- **SaaS Billing** — Subscription management for multi-tenant

### Patient Experience
- **Patient Portal** — Self-service web portal for patients
- **Kiosk Check-In** — Self-service check-in with queue assignment
- **Queue Display** — Real-time TV display with WebSocket updates
- **Post-Visit Surveys** — Patient satisfaction feedback
- **WhatsApp Integration** — Appointment reminders and notifications
- **SMS/Email Notifications** — Automated communication

### AI & Analytics
- **Clinical AI Hub** — AI-powered clinical decision support
- **Predictive Analytics** — No-show prediction, revenue forecasting, patient risk
- **BI Dashboard** — Business intelligence with interactive charts
- **Advanced Reporting** — Custom report generation
- **Data Import/Export** — CSV/Excel data management

### Administration
- **User Management** — Staff accounts with role-based access
- **Security Settings** — Password policies, 2FA, session management
- **Audit Logs** — Complete activity trail with filtering and export
- **System Monitor** — Server health, CPU, memory, database metrics
- **Developer Portal** — API keys, webhooks, integration management
- **Compliance** — Regulatory compliance tracking

### Communication
- **WhatsApp Business** — Template management and messaging
- **Voice Calls** — Call logging and tracking
- **Chat** — Internal messaging system
- **Notification Templates** — Customizable notification templates
- **Notification Logs** — Delivery tracking and analytics

---

## 🗺 Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Main dashboard with KPIs |
| `/patients` | Patients | Patient list and management |
| `/patients/:id` | Patient Detail | Individual patient record |
| `/appointments` | Appointments | Calendar scheduling |
| `/emr` | EMR | Electronic medical records |
| `/clinical-ai` | Clinical AI | AI diagnosis and notes |
| `/billing` | Billing | Invoices and payments |
| `/insurance` | Insurance | Insurance management |
| `/insurance-claims` | Insurance Claims | Claims lifecycle |
| `/pharmacy` | Pharmacy | Prescription management |
| `/inventory` | Inventory | Stock management |
| `/lab` | Laboratory | Lab orders and results |
| `/radiology` | Radiology | Imaging management |
| `/hr` | Human Resources | Staff management |
| `/reports` | Reports | Report generation |
| `/analytics` | Analytics | BI dashboard |
| `/predictive-analytics` | Predictive Analytics | AI predictions |
| `/smart-scheduling` | Smart Scheduling | AI-optimized scheduling |
| `/kiosk` | Kiosk Check-In | Self-service check-in |
| `/queue-display` | Queue Display | Real-time queue TV |
| `/survey` | Post-Visit Survey | Patient feedback |
| `/patient-app` | Patient Mobile App | Mobile portal preview |
| `/notification-templates` | Notification Templates | Template management |
| `/notification-logs` | Notification Logs | Delivery tracking |
| `/security` | Security Settings | Password, 2FA |
| `/admin` | Administration | System admin hub |
| `/settings` | Settings | App preferences |
| `/audit-logs` | Audit Logs | Activity tracking |
| `/audit-logs-advanced` | Audit Logs Advanced | Advanced audit with export |
| `/developer-portal` | Developer Portal | API management |
| `/data-import` | Data Import | CSV/Excel import |
| `/whatsapp` | WhatsApp | Business messaging |
| `/voice-calls` | Voice Calls | Call management |
| `/chat` | Chat | Internal messaging |
| `/expense-tracking` | Expense Tracking | Expense management |
| `/eta-invoicing` | ETA Invoicing | Egyptian tax invoices |
| `/financial-reports` | Financial Reports | P&L and budgets |
| `/multi-branch` | Multi-Branch | Branch management |
| `/system-monitor` | System Monitor | Server health |
| `/compliance` | Compliance | Regulatory tracking |
| `/regions` | Regions | Regional settings |
| `/print-templates` | Print Templates | Document templates |
| `/user-preferences` | User Preferences | Profile settings |
| `/integrations` | Integrations | Third-party connections |
| `/data-export` | Data Export | Export management |
| `/data-warehouse` | Data Warehouse | Advanced analytics |
| `/dms` | Document Management | Document storage |
| `/automation` | Automation | Workflow automation |
| `/saas-billing` | SaaS Billing | Subscription management |
| `/compliance-reports` | Compliance Reports | Compliance analytics |
| `/pharmacy-advanced` | Pharmacy Advanced | Advanced pharmacy |
| `/patient-self-service` | Patient Self-Service | Patient portal |
| `/portal` | Patient Portal | Patient login |

---

## 🔌 Backend Modules (62)

| Module | Description |
|---|---|
| `auth` | JWT authentication, login, register, password reset |
| `patient` | Patient CRUD, search, medical history |
| `appointment` | Scheduling, calendar, availability |
| `emr` | Electronic medical records, SOAP notes |
| `ai-intelligence` | AI diagnosis, clinical notes, predictions, smart scheduling |
| `billing` | Invoices, payments, financial transactions |
| `insurance` | Insurance providers, claims processing |
| `insurance-claims` | Claims lifecycle management |
| `pharmacy` | Prescription management, dispensing |
| `pharmacy-advanced` | Advanced pharmacy operations |
| `inventory` | Stock management, reorder alerts |
| `lab` | Lab orders, results, templates |
| `radiology` | Imaging orders, reports |
| `clinical` | Allergies, timeline, clinical data |
| `hr` | Staff management, roles, permissions |
| `rbac` | Role-based access control, permissions |
| `reports` | Report generation, analytics |
| `analytics` | Dashboard widgets, KPI calculations |
| `multi-branch` | Multi-location management |
| `communications` | Notification templates, delivery logs |
| `patient-messaging` | Patient communication, reminders |
| `patient-experience` | Kiosk, queue, surveys |
| `patient-portal` | Patient self-service portal with OTP auth |
| `whatsapp` | WhatsApp Business API integration |
| `voice` | Voice call logging and tracking |
| `chat` | Internal messaging system |
| `audit` | Audit logging and compliance |
| `system-monitor` | Server health, CPU, memory metrics |
| `dms` | Document management and storage |
| `automation` | Workflow automation rules |
| `data-import` | CSV/Excel data import |
| `data-export` | Data export functionality |
| `compliance` | Regulatory compliance tracking |
| `integrations` | Third-party service connections |
| `regions` | Regional settings, currencies, timezones |
| `print-templates` | Document template management |
| `developer-portal` | API keys, webhooks management |
| `saas-billing` | Subscription and tenant billing |
| `home-visit` | Home visit scheduling |
| `referral` | Referral management |
| `nursing` | Nursing workflows |
| `medications` | Medication catalog |
| `icd10` | ICD-10 diagnosis codes |
| `form-builder` | Custom form builder |
| `sessions` | Session management |
| `user-preferences` | User profile settings |
| `notifications` | Push notifications |
| `audit-logs-advanced` | Advanced audit with filtering |
| `expense-tracking` | Expense management |
| `eta-invoicing` | Egyptian Tax Authority invoicing |
| `financial-reports` | Financial report generation |
| `compliance-reports` | Compliance report generation |
| `insurance-claims-lifecycle` | Claims lifecycle analytics |
| `barcode` | Barcode generation and scanning |
| `ai-hub` | AI feature hub |
| `clinical-reference` | Clinical reference data |
| `egypt-market` | Egypt-specific features |
| `data-warehouse` | Data warehouse analytics |
| `bi` | Business intelligence |

---

## 🗃 Database Migrations (20)

| Migration | Description |
|---|---|
| `001_initial_schema` | Core tables: tenants, users, patients, appointments, invoices |
| `002_clinical_modules` | EMR, prescriptions, lab, radiology, allergies |
| `003_operations` | Inventory, pharmacy, HR, referrals |
| `004_intelligence` | AI features, analytics, predictions |
| `005_scale` | Multi-branch, advanced features |
| `006_patient_experience` | Kiosk, queue, surveys |
| `007_platform_maturity` | SaaS billing, developer portal |
| `008_experience` | Enhanced patient experience |
| `009_communications` | Notification templates and logs |
| `010_intelligence` | AI intelligence features |
| `011_automation_digital` | Automation rules, digital workflows |
| `012_security_communication` | Security enhancements, communication |
| `013_missing` | Missing tables and columns |
| `014_clinical_reference` | Clinical reference data |
| `015_egypt_market` | Egypt-specific tables and data |
| `016_advanced_communication` | Advanced messaging features |
| `017_financial_deepening` | Financial deepening features |
| `018_ai_intelligence` | AI intelligence tables |
| `019_patient_experience` | Patient experience tables |
| `020_enhancements` | Latest enhancements |

---

## 🐳 Docker Deployment

### Services
| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 15 database |
| `redis` | 6379 | Redis 7 cache |
| `minio` | 9000/9001 | S3-compatible object storage |
| `backend` | 3000 | Fastify API server |
| `frontend` | 5173 | Vite dev server |
| `nginx` | 80/443 | Reverse proxy |

### Commands
```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f backend

# Stop all services
docker compose down

# Reset database
docker compose down -v
docker compose up -d postgres
npm run migrate
```

---

## ☁️ Free Tier Deployment

### Option 1: Railway (Recommended)
1. Push to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub repo
4. Add PostgreSQL plugin
5. Set environment variables
6. Deploy

### Option 2: Render
1. Push to GitHub
2. Go to https://render.com
3. New Web Service → Connect repo
4. Build: `npm install && npm run build`
5. Start: `npm run start -w packages/backend`
6. Add PostgreSQL database

### Option 3: Vercel (Frontend) + Railway (Backend)
- Frontend: Deploy to Vercel (free tier)
- Backend: Deploy to Railway with PostgreSQL

---

## 🪟 Windows 11 Setup Guide

### Required Software
1. **Node.js 18+** — https://nodejs.org (LTS version)
2. **PostgreSQL 15** — https://www.postgresql.org/download/windows/ (port 5432)
3. **Git** — https://git-scm.com
4. **Redis** — Via WSL2 (`sudo apt install redis-server`) or Memurai
5. **VS Code** — https://code.visualstudio.com
6. **pgAdmin** — https://www.pgadmin.org (database GUI)

### PowerShell Commands
```powershell
# Clone the repository
git clone https://github.com/elnewahy2025/vision-healthcare-erp.git
cd vision-healthcare-erp

# Install dependencies
npm install

# Build shared package
npm run build -w packages/shared

# Create database (open pgAdmin or use psql)
psql -U postgres -c "CREATE DATABASE healthcare2;"

# Configure environment
Copy-Item .env.example .env
notepad .env  # Set DB_PASSWORD, DB_NAME=healthcare2

# Run migrations
npm run migrate

# Start development (two PowerShell terminals)
npm run dev:backend    # Terminal 1
npm run dev:frontend   # Terminal 2

# Open in browser
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
# API Docs: http://localhost:3000/docs
```

### Troubleshooting
| Issue | Solution |
|---|---|
| Port 5432 in use | `netstat -aon | findstr :5432` → stop conflicting service |
| Redis unavailable | App degrades gracefully; Redis is optional for dev |
| `psql` not recognized | Add `C:\Program Files\PostgreSQL\15\bin` to PATH |
| SSL connection error | Set `DB_SSL=false` in `.env` for local PostgreSQL |
| Password auth failed | Verify password in pgAdmin → Properties → Connection |
| Migration table exists | Drop and recreate the database, then re-run migration |
| `ERR_MODULE_NOT_FOUND` | Run `npm run build -w packages/shared` first |
| `FST_ERR_DUPLICATED_ROUTE` | Pull latest code: `git pull origin main` |
| `ECONNREFUSED` on Redis | Redis is optional; app continues without it |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch -w packages/backend

# Run specific test file
npx vitest run packages/backend/src/modules/__tests__/patients.test.ts
```

### Test Coverage (37 tests, 11 files)
| File | Tests |
|---|---|
| `auth.test.ts` | 3 |
| `patients.test.ts` | 4 |
| `billing.test.ts` | 4 |
| `icd10.test.ts` | 4 |
| `medications.test.ts` | 5 |
| `allergies.test.ts` | 4 |
| `timeline.test.ts` | 3 |
| `totp.test.ts` | 3 |
| `validators.test.ts` | 4 |
| `audit.test.ts` | 1 |
| `formatters.test.ts` | 2 |

---

## 🇪🇬 Egypt Market Features

- **Fawry Payments** — Egyptian payment gateway integration
- **InstaPay** — Mobile wallet integration
- **ETA e-Invoice** — QR code generation for Egyptian Tax Authority compliance
- **Egyptian National ID** — 14-digit validation (00201...)
- **Egyptian Phone Validation** — +20 format mobile number validation
- **8 Egyptian Insurers** — Misr Insurance, Allianz Egypt, AXA Egypt, GIG Egypt, Arab Misr Insurance, CIL, Royal Insurance, Egypt Life Takaful
- **Arabic ICD-10** — 25+ diagnosis codes with Arabic translations
- **Arabic Medications** — 20+ drugs with Arabic names and usage instructions
- **Full RTL Support** — Complete right-to-left layout for Arabic
- **EGP Currency** — All financial operations in Egyptian Pounds
- **Arabic UI** — Complete Arabic translation (2,644 keys)

---

## 📡 API Documentation

Backend runs Swagger/OpenAPI docs at:
```
http://localhost:3000/docs
```

### Key Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | User login (JWT) |
| `POST` | `/api/v1/auth/register` | Register organization |
| `POST` | `/api/v1/auth/forgot-password` | Password reset request |
| `POST` | `/api/v1/auth/change-password` | Change password |
| `POST` | `/api/v1/auth/mfa/setup` | Setup 2FA |
| `POST` | `/api/v1/auth/mfa/enable` | Enable 2FA |
| `GET` | `/api/v1/patients` | List patients |
| `POST` | `/api/v1/patients` | Create patient |
| `GET` | `/api/v1/patients/:id` | Get patient |
| `PUT` | `/api/v1/patients/:id` | Update patient |
| `GET` | `/api/v1/appointments` | List appointments |
| `POST` | `/api/v1/appointments` | Book appointment |
| `GET` | `/api/v1/billing/invoices` | List invoices |
| `POST` | `/api/v1/billing/invoices` | Create invoice |
| `GET` | `/api/v1/branches` | List branches |
| `POST` | `/api/v1/ai/diagnosis` | AI diagnosis |
| `POST` | `/api/v1/ai/clinical-notes` | AI clinical notes |
| `POST` | `/api/v1/ai/predictions/no-show` | No-show prediction |
| `POST` | `/api/v1/ai/schedule/optimize` | Smart scheduling |
| `POST` | `/api/v1/portal/login` | Patient portal OTP login |
| `GET` | `/api/v1/portal/dashboard` | Patient portal dashboard |
| `POST` | `/api/v1/kiosk/checkin` | Kiosk check-in |
| `GET` | `/api/v1/audit-logs` | Audit logs |
| `GET` | `/api/v1/health` | Health check |

---

## 🔒 Backup & Monitoring

### Automated Backups
```bash
# Manual backup
docker exec visionhc-backup /scripts/backup.sh

# Features:
# - pg_dump (custom format, compression level 9)
# - SHA256 checksum
# - Optional AES-256-CBC encryption
# - Optional S3 upload
# - Automatic retention (7 days default)
```

### Health Checks
| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | Full status: DB/Redis latency, CPU, memory |
| `GET /api/v1/ready` | Readiness probe |
| `GET /api/v1/live` | Liveness probe |

### Sentry Monitoring
- Automatic 5xx error capture
- User context (ID, email, tenant)
- Breadcrumbs for request flow
- Environment-aware sampling (30% production)

---

## 📄 PWA Support

- **Service Worker** — Offline caching (static + API)
- **Manifest** — Installable as desktop/mobile app
- **Push Notifications** — Browser push support
- **Responsive** — Mobile-first, bottom nav, 44px touch targets

---

## 🤝 Contributing

1. Fork → `git checkout -b feature/my-feature`
2. Code: Follow existing module patterns
3. Test: `npm test`
4. Lint: `npm run lint`
5. Commit: `git commit -m 'feat: Add my feature'`
6. Push: `git push origin feature/my-feature`
7. PR: Open pull request

### Code Conventions
- TypeScript strict mode — no `any` types
- All backend modules: `registerXxxModule(app)` pattern
- Frontend: Lazy-loaded pages, `useTranslation()` for i18n
- All text: EN + AR translation keys (no hardcoded English)
- Security: `sanitizeString()` on all user inputs and API responses
- Forms: Validation with error display on every form
- Actions: `try/catch` with `toast.error()` on every async action
- Components: Use shared UI components (Modal, Button, Input, Select, Badge, PageLoader, EmptyState, Card)
- Mobile: `min-h-[44px]` touch targets, 16px font minimum

---

## 📊 Project Statistics

| Metric | Count |
|---|---|
| Frontend Pages | 82 |
| Backend Modules | 62 |
| Backend Services | 18 |
| Database Migrations | 20 |
| Shared UI Components | 19 |
| Frontend Lines (TSX) | ~29,600 |
| Backend Lines (TS) | ~12,300 |
| i18n Translation Keys | 2,646 (EN) + 2,644 (AR) |
| Tests | 37 (all passing) |
| Build Output | ~1.6 MB |
| i18n Languages | 2 (English, Arabic) |
| Target Market | Egypt 🇪🇬 |
| Currency | EGP (Egyptian Pound) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for the Egyptian healthcare ecosystem — Vision Healthcare ERP v2.0*
