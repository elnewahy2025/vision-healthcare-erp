# 🏥 Vision Healthcare ERP

**Enterprise Healthcare SaaS Platform** — A comprehensive, multi-tenant Electronic Medical Records (EMR) and Practice Management system designed for the Egyptian healthcare market. Covers the full patient lifecycle from appointment scheduling through billing, with AI-powered clinical decision support, real-time analytics, and multi-branch management.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites & Dependencies](#-prerequisites--dependencies)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Feature Modules](#-feature-modules)
- [Frontend Routes](#-frontend-routes)
- [Backend Modules](#-backend-modules)
- [Database Migrations](#-database-migrations)
- [Docker Deployment](#docker-deployment)
- [Free Tier Deployment](#free-tier-deployment)
- [Windows 11 Setup Guide](#-windows-11-setup-guide)
- [Testing](#-testing)
- [Egypt Market Features](#-egypt-market-features)
- [API Documentation](#-api-documentation)
- [Backup & Monitoring](#-backup--monitoring)
- [Contributing](#-contributing)

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite + TailwindCSS)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Staff   │ │  Kiosk   │ │ Patient  │ │Queue TV  │        │
│  │   PWA    │ │ Check-in │ │ Portal   │ │ Display  │        │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       │            │            │            │               │
│  82 Pages | Code-Split | Lazy-Loaded | Recharts Analytics    │
├──────────────┴────────────┴────────────┴────────────────────┤
│              Nginx Reverse Proxy (SSL + Rate Limiting)       │
├──────────────┬──────────────────────────────────────────────┤
│              │         Backend (Fastify + TypeScript)         │
│    ┌─────────┴─────────┐  ┌──────────────────────────────┐  │
│    │    61 Modules     │  │      Shared (Types/Utils)     │  │
│    │  Auth, Patient,   │  │  Zod Validators, Enums,       │  │
│    │  Billing, EMR,    │  │  i18n, Error Classes,         │  │
│    │  AI, MultiBranch, │  │  Currency/Date Formatters     │  │
│    │  Analytics, etc.  │  │  Egypt-specific Utilities     │  │
│    └─────────┬─────────┘  └──────────────────────────────┘  │
│              │                                               │
│    ┌─────────┴─────────┐                                    │
│    │  17 Services      │                                    │
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

## 🔧 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | UI library |
| **TypeScript** | 5.4+ | Type safety |
| **Vite** | 5.3+ | Build tool + dev server |
| **TailwindCSS** | 3.4+ | Utility-first CSS |
| **React Router DOM** | 6.23+ | Client-side routing |
| **React i18next** | 23.11+ | Arabic/English i18n |
| **Recharts** | 2.12+ | Analytics charting |
| **React Hook Form** | 7.52+ | Form management |
| **Zod** | 3.23+ | Schema validation |
| **Lucide React** | 0.395+ | Icons |
| **date-fns** | 3.6+ | Date utilities |
| **react-hot-toast** | 2.4+ | Toast notifications |
| **clsx** | 2.1+ | Class merging |
| **axios** | 1.7+ | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | Runtime |
| **Fastify** | latest | HTTP framework |
| **TypeScript** | 5.4+ | Type safety |
| **Knex.js** | latest | SQL query builder |
| **PostgreSQL** | 15 | Primary database |
| **Redis** | 7 | Caching, sessions |
| **Zod** | 3.23+ | Request validation |
| **JSON Web Token** | latest | Authentication |
| **tsx** | latest | TypeScript execution |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Compose** | Containerization |
| **Nginx** | Reverse proxy, SSL, rate limiting |
| **MinIO** | S3-compatible file storage |
| **Elasticsearch** | Search (optional) |
| **Sentry** | Error monitoring |
| **Vercel** | Frontend hosting |

---

## 📁 Project Structure

```
Vision Healthcare/
├── packages/
│   ├── shared/                    # Shared types, config, utils
│   │   └── src/
│   │       ├── config/            # Environment config
│   │       └── types/             # TypeScript types
│   ├── backend/                   # Fastify API server
│   │   ├── src/
│   │   │   ├── core/              # DB, Redis, migrations
│   │   │   ├── modules/           # 61 feature modules
│   │   │   ├── services/          # 17 service integrations
│   │   │   └── utils/             # Validators, helpers
│   │   ├── migrations/            # 20 database migrations
│   │   └── package.json
│   └── frontend/                  # React SPA
│       ├── src/
│       │   ├── pages/             # 82 page components
│       │   ├── components/        # Shared UI components
│       │   ├── stores/            # Auth, theme stores
│       │   ├── hooks/             # Custom hooks (RTL, etc.)
│       │   ├── i18n/              # en.json, ar.json
│       │   ├── styles/            # globals.css, rtl.css
│       │   └── lib/               # API client, utils
│       ├── public/                # PWA assets, SW, manifest
│       └── package.json
├── docker-compose.yml             # Development Docker setup
├── docker-compose.prod.yml        # Production Docker setup
├── Dockerfile.backend             # Backend multi-stage build
├── Dockerfile.frontend            # Frontend Nginx build
├── Dockerfile.backup              # Automated backup container
├── deployment/nginx/              # Nginx configs
├── scripts/                       # backup.sh, icon generation
├── package.json                   # Root workspace config
├── tsconfig.base.json             # Shared TS config
├── vercel.json                    # Vercel deployment config
└── README.md                      # This file
```

---

## 📦 Prerequisites & Dependencies

### Required Software

| Software | Version | Download URL |
|---|---|---|
| **Node.js** | 20+ LTS | https://nodejs.org |
| **npm** | 9+ (comes with Node) | https://www.npmjs.com |
| **PostgreSQL** | 15+ | https://www.postgresql.org/download/ |
| **Redis** | 7+ | https://redis.io/download |

### Optional (for Docker deployment)
| Software | Version | Download URL |
|---|---|---|
| **Docker** | 24+ | https://docs.docker.com/get-docker/ |
| **Docker Compose** | 2.20+ | https://docs.docker.com/compose/install/ |

### Windows-Specific Dependencies
| Software | Purpose | Download |
|---|---|---|
| **WSL2** | Redis on Windows | Enabled via Windows Features |
| **Memurai** | Redis alternative for Windows | https://www.memurai.com/ |
| **pgAdmin** | PostgreSQL GUI | https://www.pgadmin.org/ |

### npm Packages (auto-installed)

**Root workspace** (`npm install` at project root):
```json
{
  "concurrently": "latest",
  "typescript": "^5.4.0"
}
```

**Frontend** (`packages/frontend/package.json`):
```json
{
  "dependencies": {
    "@hookform/resolvers": "^3.6.0",
    "axios": "^1.7.2",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "i18next": "^23.11.5",
    "lucide-react": "^0.395.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.0",
    "react-hot-toast": "^2.4.1",
    "react-i18next": "^14.1.2",
    "react-router-dom": "^6.23.1",
    "recharts": "^2.12.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@tailwindcss/forms": "^0.5.7",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0",
    "vite": "^5.3.1"
  }
}
```

**Backend** (`packages/backend/package.json`):
```json
{
  "dependencies": {
    "fastify": "latest",
    "@fastify/cors": "latest",
    "@fastify/websocket": "latest",
    "@fastify/rate-limit": "latest",
    "@fastify/multipart": "latest",
    "@fastify/static": "latest",
    "knex": "latest",
    "pg": "latest",
    "ioredis": "latest",
    "jsonwebtoken": "latest",
    "bcryptjs": "latest",
    "zod": "^3.23.8",
    "otplib": "latest",
    "pdfmake": "latest",
    "nodemailer": "latest",
    "tsx": "latest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "latest"
  }
}
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
git clone <repo-url> vision-healthcare
cd vision-healthcare
cp .env.example .env  # Edit with your settings
docker compose up -d
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
# API Docs: http://localhost:3000/docs
```

### Option 2: Manual Setup
```bash
# 1. Install all dependencies
npm install

# 2. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE healthcare;"

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Build shared package (required first)
npm run build -w packages/shared

# 5. Run database migrations
npm run migrate

# 6. Start development servers
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### Production Build
```bash
# Build all packages
npm run build

# Start production server
npm run start -w packages/backend

# Serve frontend with Nginx (see Dockerfile.frontend)
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=healthcare
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# File Storage (MinIO)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=healthcare

# CORS
CORS_ORIGIN=http://localhost:5173

# === Optional Integrations ===

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxx

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_API_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx

# Payments - Egypt
FAWRY_MERCHANT_CODE=xxx
FAWRY_SECURITY_KEY=xxx
INSTAPAY_WALLET=xxx

# Payments - International (Stripe)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Error Monitoring (Sentry)
SENTRY_DSN=https://xxx@sentry.io/xxx

# Search (Elasticsearch - optional)
ELASTICSEARCH_URL=http://localhost:9200

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
```

---

## 🧩 Feature Modules

### Core Modules (Phases 1–8)
| Module | Description |
|---|---|
| **Authentication** | JWT auth, tenant isolation, role-based access |
| **Patients** | CRUD, MRN, Egyptian National ID validation |
| **Appointments** | Scheduling, calendar, status management |
| **EMR** | Electronic medical records, encounters, vitals |
| **Billing** | Invoices, payments, insurance claims |
| **Laboratory** | Test orders, results, reference ranges |
| **Radiology** | Imaging orders, reports, DICOM support |
| **Pharmacy** | Prescriptions, dispensing, inventory |
| **Queue** | Patient queue management, priority |
| **Referrals** | Inter-department referrals |
| **Nursing** | Nursing assessments, care plans |
| **Home Visits** | Home visit scheduling and tracking |
| **Telemedicine** | Video consultations |
| **Insurance** | Provider management, eligibility |
| **Inventory** | Stock management, reorder alerts |
| **HR & Payroll** | Staff management, schedules, payroll |
| **CRM** | Patient relationships, follow-ups |
| **DMS** | Document management system |
| **Workflow** | Custom workflow automation |
| **Forms** | Custom form builder |
| **Compliance** | Regulatory compliance tracking |
| **AI Hub** | AI-powered clinical decision support |
| **BI** | Business intelligence dashboards |
| **Reports** | Report generation and scheduling |

### Advanced Modules (Phases 9–10)
| Module | Description |
|---|---|
| **SaaS Billing** | Multi-tenant subscription management |
| **White-Label** | Custom branding per tenant |
| **Compliance Reports** | Audit-ready compliance reports |
| **DR Backup** | Disaster recovery automation |
| **Regions** | Multi-region/multi-currency support |
| **Patient Portal** | External patient-facing portal |
| **Online Booking** | Public appointment booking |
| **Patient Messages** | Secure patient messaging |
| **API Keys** | Developer API key management |
| **Data Export** | Full data export capabilities |
| **System Monitor** | Real-time system health |
| **Bulk Import** | Batch data import |
| **User Preferences** | Per-user settings |
| **Print Templates** | Customizable print layouts |
| **Communications** | Multi-channel messaging |

### Security & Communication (Phases 11–12)
| Module | Description |
|---|---|
| **Forgot/Reset Password** | Email-based password reset |
| **Two-Factor Auth (TOTP)** | Time-based OTP authentication |
| **OTP** | One-time password verification |
| **Audit Logging** | Comprehensive audit trail |
| **Email (SendGrid)** | Transactional email service |
| **SMS (Twilio)** | SMS notifications |
| **Template Engine** | Reusable notification templates |

### File & Document Management (Phase 13)
| Module | Description |
|---|---|
| **File Upload/Download** | MinIO/Supabase/local storage |
| **Image Viewer** | In-app image viewing |
| **Document Categories** | Organized file management |

### Financial & Insurance (Phase 14–15)
| Module | Description |
|---|---|
| **Stripe Payments** | International card payments |
| **Insurance Claims** | Full claims lifecycle |
| **Aging Reports** | Accounts receivable aging |
| **Revenue Reports** | Financial performance |
| **ICD-10 Browser** | 200+ ICD-10 codes with Arabic |
| **Medication DB** | 20+ medications with Arabic names |
| **Allergies** | Allergy tracking and alerts |
| **Patient Timeline** | Chronological patient history |

### Testing (Phase 16)
- 37 tests across 11 test files
- Unit tests for auth, patients, billing, clinical modules
- Service tests for audit, TOTP
- Utility tests for validators, formatters

### Egypt Market (Phase 17)
| Feature | Description |
|---|---|
| **Fawry** | Egyptian payment gateway integration |
| **InstaPay** | Mobile wallet payments |
| **ETA e-Invoice** | QR code for Egyptian Tax Authority |
| **Egyptian National ID** | 14-digit ID validation (00201...) |
| **8 Egyptian Insurers** | Misr Insurance, Allianz Egypt, AXA Egypt, etc. |

### Communication & Financial (Phases 18–19)
| Module | Description |
|---|---|
| **WhatsApp Business** | WhatsApp message sending |
| **Voice Calls (Twilio)** | Automated voice calls |
| **In-App Chat** | WebSocket real-time chat |
| **Expense Tracking** | Business expense management |
| **ETA e-Invoicing** | Electronic invoicing for Egypt |
| **P&L Reports** | Profit and loss statements |
| **Budget Plans** | Budget planning and tracking |

### AI & Intelligence (Phase 20)
| Module | Description |
|---|---|
| **Clinical Notes AI** | AI-generated clinical notes |
| **Diagnosis Assistant** | ICD-10 diagnosis suggestions |
| **Predictive Analytics** | Patient risk prediction |
| **Smart Scheduling** | AI-optimized scheduling |

### Infrastructure (Phase 21)
| Feature | Description |
|---|---|
| **Production Docker** | Multi-stage Docker builds |
| **CI/CD** | Automated deployment pipeline |
| **Sentry Monitoring** | Error tracking and alerts |
| **Backup Automation** | Daily automated backups |
| **Health Checks** | /health, /ready, /live endpoints |

### Patient Experience (Phase 22)
| Module | Description |
|---|---|
| **Kiosk Check-In** | Self-service patient check-in |
| **Queue TV Display** | Real-time queue display (WebSocket) |
| **Post-Visit Survey** | Patient satisfaction surveys |
| **Patient Mobile App** | Mobile-optimized patient shell |

### Enhancements (Completed)
| Enhancement | Description |
|---|---|
| **SMS/Email Reminders** | Automated appointment reminders |
| **WebSocket Chat** | Real-time messaging |
| **PDF Generation** | Invoice, prescription, lab report PDFs |
| **Dashboard Widgets** | Customizable per-role widgets |
| **Patient Self-Scheduling** | Online appointment booking |
| **Fine-Grained RBAC** | Role-based access control |
| **Arabic RTL Support** | Full right-to-left layout |
| **Offline PWA** | Service worker caching |
| **WhatsApp Templates** | Template management UI |
| **Data Import (CSV/Excel)** | Bulk data import |
| **Arabic Medical Content** | ICD-10 + medications in Arabic |
| **Advanced Audit Logs** | Exportable audit viewer |

### Strategic Higher-Effort (New)
| Module | Description |
|---|---|
| **Multi-Branch Management** | CRUD, stats, staff assignment, governorate filtering |
| **Analytics Dashboard** | Real-time charts (area, bar, pie, line) with Recharts |
| **Patient Self-Service Portal** | 3-step booking wizard, lab results, prescriptions, invoices |
| **Pharmacy Advanced** | Drug interaction checker, low-stock alerts |
| **Insurance Claims Lifecycle** | Full lifecycle, 12 Egypt insurers, bulk submit, analytics |
| **Advanced Reporting Engine** | 10 report types, scheduling, PDF/CSV export |
| **Developer API Portal** | API keys, 20 endpoint docs, webhooks, rate limits |

---

## 🛣 Frontend Routes

All 82 pages with lazy-loaded code splitting:

| Route | Page | Category |
|---|---|---|
| `/` | Dashboard | Core |
| `/login` | Login | Auth |
| `/register` | Register | Auth |
| `/forgot-password` | Forgot Password | Auth |
| `/reset-password` | Reset Password | Auth |
| `/patients` | Patients List | Clinical |
| `/patients/:id` | Patient Detail | Clinical |
| `/appointments` | Appointments | Clinical |
| `/emr` | Medical Records | Clinical |
| `/laboratory` | Laboratory | Clinical |
| `/radiology` | Radiology | Clinical |
| `/pharmacy` | Pharmacy | Clinical |
| `/pharmacy-advanced` | Pharmacy Advanced | Clinical |
| `/queue` | Queue Management | Operations |
| `/referrals` | Referrals | Operations |
| `/nursing` | Nursing | Operations |
| `/home-visits` | Home Visits | Operations |
| `/telemedicine` | Telemedicine | Operations |
| `/billing` | Billing | Financial |
| `/insurance` | Insurance | Financial |
| `/insurance-claims` | Insurance Claims | Financial |
| `/insurance-claims-lifecycle` | Claims Lifecycle | Financial |
| `/financial-reports` | Financial Reports | Financial |
| `/expenses` | Expense Tracking | Financial |
| `/eta-invoicing` | ETA Invoicing | Egypt |
| `/inventory` | Inventory | Operations |
| `/hr` | HR & Payroll | Operations |
| `/crm` | CRM | Operations |
| `/dms` | Documents | Operations |
| `/workflow` | Workflow | Operations |
| `/forms` | Forms | Operations |
| `/compliance` | Compliance | Operations |
| `/ai-hub` | AI Hub | Intelligence |
| `/clinical-ai` | Clinical AI | Intelligence |
| `/predictive-analytics` | Predictive Analytics | Intelligence |
| `/smart-scheduling` | Smart Scheduling | Intelligence |
| `/bi` | BI Dashboards | Intelligence |
| `/reports` | Reports | Intelligence |
| `/analytics-dashboard` | Analytics Dashboard | Intelligence |
| `/advanced-reporting` | Advanced Reporting | Intelligence |
| `/integrations` | Integrations | Platform |
| `/saas-billing` | SaaS Billing | Platform |
| `/white-label` | White-Label | Platform |
| `/compliance-reports` | Compliance Reports | Platform |
| `/dr-backup` | Backup & DR | Platform |
| `/regions` | Regions | Platform |
| `/branches` | Multi-Branch | Platform |
| `/branches/:id` | Branch Detail | Platform |
| `/patient-portal` | Patient Portal | Patient |
| `/online-booking` | Online Booking | Patient |
| `/patient-messages` | Patient Messages | Patient |
| `/patient-self-service` | Patient Self-Service | Patient |
| `/patient-app` | Patient Mobile App | Patient |
| `/kiosk` | Kiosk Check-In | Patient |
| `/queue-display` | Queue Display | Patient |
| `/post-visit-survey` | Post-Visit Survey | Patient |
| `/notifications` | Notifications | Communications |
| `/communications` | Communications | Communications |
| `/whatsapp` | WhatsApp | Communications |
| `/whatsapp-templates` | WhatsApp Templates | Communications |
| `/voice-calls` | Voice Calls | Communications |
| `/chat` | In-App Chat | Communications |
| `/api-keys` | API Keys | Developer |
| `/developer-portal` | Developer API | Developer |
| `/data-export` | Data Export | Developer |
| `/data-import-advanced` | Data Import | Developer |
| `/data-warehouse` | Data Warehouse | Developer |
| `/bulk-import` | Bulk Import | Developer |
| `/system-monitor` | System Monitor | Admin |
| `/audit-logs` | Audit Logs | Admin |
| `/audit-logs-advanced` | Advanced Audit Logs | Admin |
| `/security` | Security Settings | Admin |
| `/admin` | Administration | Admin |
| `/settings` | Settings | Admin |
| `/user-preferences` | User Preferences | Admin |
| `/print-templates` | Print Templates | Admin |
| `/notification-templates` | Notification Templates | Admin |
| `/notification-logs` | Notification Logs | Admin |
| `/automation` | Automation | Admin |
| `/barcodes` | Barcodes | Admin |
| `/sessions` | Sessions | Admin |

---

## 🔌 Backend Modules (61 registered)

All modules follow the pattern: `registerXxxModule(app: FastifyInstance)`

```
advanced-communication  ai-hub              ai-intelligence
api-gateway             appointment         auth
automation              barcodes            bi
billing                 bulk-import         clinical
common                  communications      compliance
compliance-reports      crm                 dashboard-widgets
data-export             data-warehouse      dms
dr-backup               emr                 financial-deepening
forms                   health              home-visits
hr                      insurance           insurance-claims
integrations            inventory           laboratory
medical-content         multi-branch        notification
nursing                 online-booking      patient
patient-experience      patient-messaging   patient-portal
patient-scheduling      pdf                 pdf-generator
pharmacy                print-templates     queue
radiology               rbac                referral
regions                 reports             saas-billing
session-manager         system-monitor      telemedicine
user-preferences        white-label         workflow
```

### Backend Services (17)
```
appointment-reminder    audit               chat
email                   notification        otp
payment                 pdf                 reminder
sentry                  sms                 storage
totp                    voice               whatsapp
```

---

## 📊 Database Migrations (20 files)

| Migration | Tables Created |
|---|---|
| 001_initial_schema | tenants, users, patients, appointments, invoices, etc. |
| 002_clinical_modules | encounters, vitals, lab_orders, lab_results, prescriptions |
| 003_operations | queue_entries, referrals, nursing_assessments, inventory |
| 004_intelligence | reports, workflows, forms, compliance_records |
| 005_scale | saas_subscriptions, white_label_configs, regions |
| 006_patient_experience | patient_portal_users, online_bookings, surveys |
| 007_platform_maturity | api_keys, data_exports, system_metrics |
| 008_experience | user_preferences, print_templates, notification_logs |
| 009_communications | communication_logs, email_templates |
| 010_intelligence | ai_models, ai_predictions, bi_dashboards |
| 011_automation_digital | automation_rules, barcodes, data_warehouse_tables |
| 012_security_communication | two_factor_secrets, whatsapp_messages, voice_calls |
| 013_missing | branches, report_schedules, webhooks |
| 014_clinical_reference | icd10_codes, medications, allergies |
| 015_egypt_market | fawry_payments, instapay_transactions, eta_invoices, egypt_insurers |
| 016_advanced_communication | whatsapp_templates, chat_messages, voice_recordings |
| 017_financial_deepening | expenses, budgets, eta_e_invoices |
| 018_ai_intelligence | ai_clinical_notes, ai_diagnoses, predictive_models |
| 019_patient_experience | kiosk_checkins, queue_displays, post_visit_surveys |
| 020_enhancements | dashboard_widgets |

---

## 🐳 Docker Deployment

### Development
```bash
docker compose up -d
# Starts: PostgreSQL, Redis, MinIO, Elasticsearch, Backend, Frontend, Nginx
```

### Production
```bash
# Set secrets in environment
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)

docker compose -f docker-compose.prod.yml up -d --build
```

### Services in Docker Compose
| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 15 |
| `redis` | 6379 | Redis 7 |
| `minio` | 9000/9001 | S3-compatible storage |
| `elasticsearch` | 9200 | Search engine (optional) |
| `backend` | 3000 | Fastify API |
| `frontend` | 5173 | React SPA (Nginx) |
| `nginx` | 80/443 | Reverse proxy with SSL |

---

## ☁️ Free Tier Deployment

### Recommended Stack (100% free)

| Service | Tier | Purpose |
|---|---|---|
| **Render** | Free | Backend API + PostgreSQL |
| **Vercel** | Hobby | Frontend (React SPA) |
| **Redis Cloud** | 30MB free | Caching |
| **Supabase** | Free | File storage (1GB) |
| **Cloudflare** | Free | CDN, SSL, DDoS |
| **GitHub** | Free | Source + CI/CD |
| **Sentry** | Free (5k events) | Error monitoring |

### Step-by-Step

1. **Database (Render):** Create PostgreSQL, copy connection URL
2. **Backend (Render Web Service):**
   - Build: `npm install && npm run build -w packages/shared && npm run build -w packages/backend`
   - Start: `npm run start -w packages/backend`
   - Health: `/api/v1/health`
3. **Frontend (Vercel):**
   ```bash
   cd packages/frontend
   vercel --prod
   ```
   - Set `VITE_API_URL` to backend URL
4. **SSL (Cloudflare):** Point DNS, enable proxy

---

## 🪟 Windows 11 Setup Guide

### Prerequisites
1. **Node.js 20+** — https://nodejs.org
2. **PostgreSQL 15** — https://www.postgresql.org/download/windows/ (port 5432)
3. **Redis** — Via WSL2 (`sudo apt install redis-server`) or Memurai
4. **VS Code** — https://code.visualstudio.com

### PowerShell Commands
```powershell
# Clone and enter project
git clone <repo-url> vision-healthcare
cd vision-healthcare

# Create database
psql -U postgres -c "CREATE DATABASE healthcare;"

# Configure environment
Copy-Item .env.example .env
notepad .env  # Set DB_PASSWORD

# Install and build
npm install
npm run build -w packages/shared

# Run migrations
npm run migrate

# Start development (two terminals)
npm run dev:backend   # Terminal 1
npm run dev:frontend  # Terminal 2
```

### Troubleshooting
- **Port 5432 in use:** `netstat -aon | findstr :5432` → stop conflicting service
- **Redis unavailable:** App degrades gracefully; Redis is optional for dev
- **pg_dump not found:** Add `C:\Program Files\PostgreSQL\15\bin` to PATH
- **Execution policy:** `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch -w packages/backend

# Run specific test
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

- **Fawry Payments** — Egyptian payment gateway
- **InstaPay** — Mobile wallet integration
- **ETA e-Invoice** — QR code generation for Egyptian Tax Authority
- **Egyptian National ID** — 14-digit validation (00201...)
- **8 Egyptian Insurers** — Misr Insurance, Allianz Egypt, AXA Egypt, GIG Egypt, Arab Misr Insurance, CIL, Royal Insurance, Egypt Life Takaful
- **Arabic ICD-10** — 25+ diagnosis codes with Arabic translations
- **Arabic Medications** — 20+ drugs with Arabic names and usage
- **Full RTL Support** — Complete right-to-left layout

---

## 📡 API Documentation

Backend runs Swagger/OpenAPI docs at:
```
http://localhost:3000/docs
```

### Key Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | User login |
| `POST` | `/api/v1/auth/register` | Register organization |
| `GET` | `/api/v1/patients` | List patients |
| `POST` | `/api/v1/patients` | Create patient |
| `GET` | `/api/v1/appointments` | List appointments |
| `POST` | `/api/v1/appointments` | Book appointment |
| `GET` | `/api/v1/billing/invoices` | List invoices |
| `POST` | `/api/v1/billing/invoices` | Create invoice |
| `GET` | `/api/v1/branches` | List branches |
| `GET` | `/api/v1/insurance-claims` | List claims |
| `POST` | `/api/v1/reports/generate` | Generate report |
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
5. Commit: `git commit -m 'Add my feature'`
6. Push: `git push origin feature/my-feature`
7. PR: Open pull request

### Code Conventions
- TypeScript strict mode
- All backend modules: `registerXxxModule(app)` pattern
- Frontend: Lazy-loaded pages, `useTranslation()` for i18n
- All nav items must have `en.json` and `ar.json` entries
- Mobile: `min-h-[44px]` touch targets, 16px font

---

## 📊 Project Statistics

| Metric | Count |
|---|---|
| Frontend Pages | 82 |
| Backend Modules | 61 |
| Backend Services | 17 |
| Database Migrations | 20 |
| UI Components | 16 |
| Frontend Lines (TSX) | ~14,500 |
| Backend Lines (TS) | ~11,800 |
| Migration Lines (TS) | ~3,100 |
| Tests | 37 (all passing) |
| Build Output | ~1.6 MB |
| i18n Languages | 2 (EN, AR) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for the Egyptian healthcare ecosystem — Vision Healthcare ERP v2.0*
