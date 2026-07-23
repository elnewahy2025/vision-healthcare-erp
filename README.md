# 🏥 Vision Healthcare ERP

**Enterprise Healthcare SaaS Platform** — A multi-tenant Electronic Medical Records (EMR) and Practice Management system designed for the **Egyptian healthcare market**. Covers the full patient lifecycle from appointment scheduling through billing, with AI-powered clinical decision support, real-time analytics, and multi-branch management.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Backend Modules](#backend-modules)
- [Database Migrations](#database-migrations)
- [API Endpoints](#api-endpoints)
- [Frontend](#frontend)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [Security](#security)
- [Egypt Market Features](#egypt-market-features)
- [Project Statistics](#project-statistics)

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React 18 + Vite + TailwindCSS)       │
│  82 Pages | Code-Split | Lazy-Loaded | Recharts Analytics   │
│  2,674 i18n Keys (EN + AR) | 19 Shared UI Components       │
├─────────────────────────────────────────────────────────────┤
│              Nginx Reverse Proxy (SSL + Rate Limiting)      │
├─────────────────────────────────────────────────────────────┤
│              Backend (Fastify 4 + TypeScript)                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐     │
│  │ 57 Modules   │  │ 17 Services  │  │ Shared Package│     │
│  │ (Clean Arch  │  │ Email, SMS,  │  │ Types, Zod,   │     │
│  │  for core    │  │ Audit, PDF,  │  │ Errors, i18n, │     │
│  │  modules)    │  │ Reminder,    │  │ Validators    │     │
│  │              │  │ TOTP, etc.   │  │               │     │
│  └──────────────┘  └──────────────┘  └───────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │PostgreSQL│ │  Redis   │ │  MinIO   │ │Playwright│       │
│  │  15+     │ │  7       │ │ Storage  │ │  E2E     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Monorepo Layout

```
vision-healthcare-erp/
├── packages/
│   ├── backend/           # Fastify 4 + TypeScript
│   │   ├── src/
│   │   │   ├── core/      # Database, Redis, error handler, versioning
│   │   │   ├── modules/   # 57 domain modules
│   │   │   ├── services/  # Cross-cutting services (email, SMS, audit, etc.)
│   │   │   └── utils/     # Helpers, validation schemas, rate limiter
│   │   └── migrations/    # 25 Knex migrations
│   ├── frontend/          # React 18 + Vite + TypeScript
│   │   └── src/
│   │       ├── pages/     # 82 page components
│   │       ├── components/# 19 shared UI components
│   │       ├── hooks/     # React Query hooks
│   │       ├── lib/       # API clients, query config
│   │       └── i18n/      # EN + AR translations
│   └── shared/            # Shared types, errors, config, utils
├── docs/security/         # OWASP Top 10 security audit
├── playwright.config.ts   # E2E test configuration
├── .eslintrc.json         # ESLint config (strict rules)
├── docker-compose.yml     # Development Docker setup
└── docker-compose.prod.yml# Production Docker setup
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, React Router v6, React Query (TanStack) |
| **Backend** | Fastify 4, TypeScript, Knex.js (query builder), Zod (validation) |
| **Database** | PostgreSQL 15+ (with pg_trgm, btree_gist extensions) |
| **Cache** | Redis 7 |
| **Object Storage** | MinIO (S3-compatible) |
| **Auth** | JWT (access + refresh tokens), HttpOnly cookies, CSRF protection, MFA/TOTP, account lockout |
| **Logging** | Pino (structured JSON), pino-http middleware, redaction |
| **Testing** | Vitest (unit/integration), Playwright (E2E) |
| **CI/CD** | Docker multi-stage builds |
| **Monitoring** | Sentry integration, health checks |

---

## 📦 Prerequisites

- **Node.js** ≥ 18.x
- **PostgreSQL** 15+
- **Redis** 7+
- **MinIO** (optional, for file storage)
- **npm** ≥ 9.x

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/elnewahy2025/vision-healthcare-erp.git
cd vision-healthcare-erp
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database, Redis, and JWT secrets
```

### 3. Run Migrations & Start

```bash
# Backend
cd packages/backend
npx knex migrate:latest
npm run dev

# Frontend (separate terminal)
cd packages/frontend
npm run dev
```

### 4. Docker (Alternative)

```bash
docker-compose up -d
```

Backend: `http://localhost:3000`
Frontend: `http://localhost:5173`
Swagger docs: `http://localhost:3000/docs`

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | `development` / `production` / `test` |
| `PORT` | Yes | `3000` | Backend server port |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | `vision_hc` | Database name |
| `DB_USER` | Yes | — | Database user |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_SSL` | No | `false` | Enable DB SSL (production) |
| `REDIS_HOST` | Yes | `localhost` | Redis host |
| `REDIS_PORT` | Yes | `6379` | Redis port |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token secret |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` | Allowed CORS origins |
| `SMTP_HOST` | Yes | — | Email server |
| `SMTP_PORT` | Yes | `587` | SMTP port |
| `SMTP_USER` | Yes | — | SMTP username |
| `SMTP_PASS` | Yes | — | SMTP password |

See `packages/shared/src/config/environment.ts` for the full schema.

---

## 🧩 Backend Modules

57 registered modules, organized by domain:

### Core Clinical
`auth` · `patient` · `appointment` · `emr` · `billing` · `laboratory` · `radiology` · `pharmacy` · `clinical`

### Operations
`queue` · `referral` · `notification` · `nursing` · `home-visits` · `telemedicine` · `patient-scheduling` · `online-booking` · `patient-portal`

### Financial
`insurance` · `insurance-claims` · `saas-billing` · `financial-deepening` · `billing`

### Analytics & AI
`ai-hub` · `ai-intelligence` · `bi` · `reports` · `dashboard-widgets` · `clinical`

### Compliance & Security
`compliance` · `compliance-reports` · `audit` · `rbac` · `session-manager` · `data-export`

### Infrastructure
`api-gateway` · `data-warehouse` · `dr-backup` · `system-monitor` · `integrations` · `automation` · `barcodes` · `bulk-import`

### Multi-tenancy & White-label
`multi-branch` · `white-label` · `regions` · `workflow` · `forms` · `print-templates`

### CRM & Communication
`crm` · `dms` · `communications` · `advanced-communication` · `patient-messaging` · `patient-experience` · `medical-content`

### HR & Inventory
`hr` · `inventory`

### Other
`common` · `health` · `pdf-generator` · `user-preferences`

### Clean Architecture Decomposition

The following modules have been fully decomposed into Clean Architecture (types, schema, repository, controller, routes, mapper):

| Module | Files | Notes |
|--------|-------|-------|
| **auth** | `auth.service.ts`, `auth.repository.ts`, `auth.controller.ts`, `auth.routes.ts`, `schema.ts`, `types.ts` | Account lockout, MFA, CSRF, HttpOnly cookies, email verification |
| **patient** | `patient.repository.ts`, `patient.controller.ts`, `patient.routes.ts`, `types.ts`, `patient.mapper.ts` | Audit logging, optimistic concurrency, merge, bulk import, trigram search |
| **appointment** | `appointment.repository.ts`, `appointment.controller.ts`, `appointment.routes.ts`, `types.ts`, `appointment.mapper.ts` | Conflict detection, status state machine, working hours, cancellation policy, timezone |
| **inventory** | `inventory.repository.ts`, `inventory.controller.ts`, `inventory.routes.ts`, `inventory.schema.ts`, `types.ts`, `inventory.mapper.ts` | Atomic stock updates, FEFO, dispensing, transfers, suppliers, bulk receipt, valuation |

All other modules use a single `index.ts` file with inline route handlers.

---

## 🗃 Database Migrations

25 Knex migrations covering:

| Migration | Description |
|-----------|------------|
| 001 | Initial schema (tenants, users, patients, appointments, billing, EMR) |
| 002 | Clinical modules |
| 003 | Operations (warehouses, inventory, HR, queues) |
| 004–010 | Intelligence, AI, analytics |
| 011–017 | Insurance, pharmacy, telemedicine, compliance |
| 018–021 | Refresh token rotation, auth hardening |
| 022 | Auth hardening (lockout, MFA, email verification) |
| 023 | Patient RLS, pg_trgm search, pagination index |
| 024 | Appointment scheduling constraints, timezone |
| 025 | Inventory enhancements (suppliers, barcode, controlled substances, transfers, valuation) |

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/v1/` and require JWT authentication (except `/auth/login`, `/auth/register`, `/health`).

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | User login (JWT + HttpOnly cookie refresh token) |
| `POST` | `/auth/register` | Register organization |
| `POST` | `/auth/logout` | Logout (invalidate refresh token) |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/forgot-password` | Password reset request |
| `POST` | `/auth/change-password` | Change password |
| `POST` | `/auth/mfa/setup` | Setup TOTP 2FA |
| `POST` | `/auth/mfa/enable` | Enable 2FA |
| `POST` | `/auth/mfa/verify` | Verify 2FA code |
| `GET` | `/auth/sessions` | List active sessions |
| `GET` | `/auth/verify-email` | Email verification |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/patients` | List patients (paginated, searchable) |
| `GET` | `/patients/search/quick` | Quick search by name/phone/MRN |
| `POST` | `/patients` | Create patient |
| `GET` | `/patients/:id` | Get patient with related data |
| `PUT` | `/patients/:id` | Update patient (optimistic concurrency) |
| `DELETE` | `/patients/:id` | Soft delete patient |
| `POST` | `/patients/merge` | Merge duplicate patients |
| `POST` | `/patients/bulk-import` | Bulk import patients |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/appointments` | List appointments (filter by date, status, doctor) |
| `GET` | `/appointments/today/summary` | Today's appointment summary |
| `POST` | `/appointments` | Book appointment (with conflict detection) |
| `GET` | `/appointments/:id` | Get appointment |
| `PUT` | `/appointments/:id` | Update appointment (status validation) |
| `POST` | `/appointments/:id/check-in` | Check in patient |
| `POST` | `/appointments/:id/complete` | Complete appointment |
| `POST` | `/appointments/:id/cancel` | Cancel (with policy: >24h free, ≤24h requires reason) |
| `POST` | `/appointments/bulk` | Bulk create (max 50) |
| `POST` | `/appointments/bulk/cancel` | Bulk cancel |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inventory/items` | List items (filter by category, warehouse, search) |
| `GET` | `/inventory/items/:id` | Get item |
| `GET` | `/inventory/barcode/:barcode` | Lookup by barcode |
| `POST` | `/inventory/items` | Create item |
| `PUT` | `/inventory/items/:id/stock` | Update stock (atomic, race-condition safe) |
| `POST` | `/inventory/dispense` | Dispense (FEFO, expired-item prevention) |
| `POST` | `/inventory/adjustments` | Record adjustment (with reason codes) |
| `POST` | `/inventory/transfers` | Inter-warehouse transfer |
| `POST` | `/inventory/bulk-receipt` | Bulk stock receipt (max 100) |
| `GET` | `/inventory/warehouses` | List warehouses |
| `POST` | `/inventory/warehouses` | Create warehouse |
| `GET` | `/inventory/suppliers` | List suppliers |
| `POST` | `/inventory/suppliers` | Create supplier |
| `PUT` | `/inventory/suppliers/:id` | Update supplier |
| `GET` | `/inventory/alerts/low-stock` | Low stock alerts |
| `GET` | `/inventory/alerts/expired` | Expired items |
| `GET` | `/inventory/reports/controlled-substances` | Controlled substance inventory |
| `GET` | `/inventory/reports/valuation` | Stock valuation (FIFO / weighted average) |
| `GET` | `/inventory/transactions` | Transaction history |
| `GET` | `/inventory/pos` | List purchase orders |
| `POST` | `/inventory/pos` | Create purchase order |
| `PUT` | `/inventory/pos/:id/receive` | Receive PO (auto-updates stock) |

---

## 🖥 Frontend

### Pages (82)
- **Auth**: Login, Register, Forgot Password, MFA Setup
- **Dashboard**: Analytics, Widgets
- **Patients**: Patient List, Patient Detail, Patient Portal
- **Appointments**: Calendar, Scheduling, Telemedicine
- **EMR**: Clinical Notes, Vitals, Medications, Allergies, Lab Results
- **Billing**: Invoices, Payments, Insurance Claims
- **Inventory**: Items, Stock, Warehouses, Suppliers, Purchase Orders
- **Laboratory**: Orders, Results
- **Radiology**: Orders, Results
- **Pharmacy**: Medications, Dispensing
- **HR**: Employees, Departments
- **Admin**: Tenants, Branches, Users, Roles, Audit Logs
- **Reports**: Clinical, Financial, Operational
- **Settings**: Profile, Preferences, Integrations

### Shared UI Components (19)
`Badge` · `Button` · `Card` · `EmptyState` · `ErrorBoundary` · `FileUpload` · `FormField` · `ImageViewer` · `Input` · `Modal` · `PageLoader` · `PageTransition` · `PatientSearchField` · `PwaInstallPrompt` · `Select` · `SkipToContent` · `Spinner` · `Table`

### State Management
- **React Query (TanStack)** — Server state with `QueryClient` + domain hooks (`usePatients`, `useAppointments`, `useAuth`)
- **React Context** — Auth state (`authStore.tsx` with HttpOnly cookies, no localStorage for tokens)
- **Zustand** — Client state where needed

---

## 🐳 Docker Deployment

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Services
| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 5173 | React + Vite dev server |
| `backend` | 3000 | Fastify API server |
| `postgres` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis cache |
| `minio` | 9000 | S3-compatible object storage |

### Production Features
- Multi-stage Docker builds (smaller images)
- Database SSL for production connections
- Graceful shutdown handlers (SIGTERM/SIGINT)
- Structured logging with Pino (JSON, redaction)
- Error handler strips stack traces in production

---

## 🧪 Testing

### Backend Tests

```bash
cd packages/backend
npm run test          # Run all tests
npm run test:watch    # Watch mode
```

**20 test files, 139 tests** covering:

| Module | Tests | Coverage |
|--------|-------|----------|
| `auth` | 20 | Login, register, lockout, MFA, refresh tokens, CSRF |
| `patients` | 10 | DOB validation, age calculation, MRN, search, NID |
| `appointment` | 25 | Conflict detection, status transitions, working hours, cancellation policy, timezone, bulk ops |
| `inventory` | 26 | Stock updates, FEFO, expiration, low stock, adjustments, transfers, valuation, bulk receipt |
| `billing` | 4 | Invoice creation, totals, status |
| `laboratory` | 3 | Lab orders, results |
| `pharmacy` | 4 | Medications, dispensing |
| `hr` | 4 | Employees, departments |
| `ai` | 3 | Predictions, risk scores |
| `compliance` | 3 | HIPAA audit, retention, consent |
| `notifications` | 3 | Multi-channel, preferences, batching |
| `reports` | 3 | Revenue, visits, date ranges |
| `timeline` | 3 | Event sorting, empty, mixed types |
| `allergies` | 4 | Allergy validation |
| `icd10` | 3 | ICD-10 code validation |
| `medications` | 4 | Medication validation |
| `validators` | 4 | ICD-10, password strength |
| `formatters` | 2 | Currency, BMI |
| `audit` | 1 | Audit logging |
| `totp` | 3 | TOTP secret, QR, verify |

### E2E Tests (Playwright)

```bash
npx playwright install chromium
npx playwright test
```

Configured in `playwright.config.ts` with Chromium.

### TypeScript

```bash
cd packages/backend
npx tsc --noEmit    # Type checking (0 errors in decomposed modules)
```

---

## 🔒 Security

### Auth Hardening
- **Password hashing**: bcrypt with configurable rounds
- **Account lockout**: 5 failed attempts → 15-minute lock
- **MFA/TOTP**: Two-factor authentication with QR code setup
- **Refresh token rotation**: Tokens invalidated on password change
- **HttpOnly cookies**: Refresh tokens stored in HttpOnly, Secure cookies (not localStorage)
- **CSRF protection**: CSRF middleware + SameSite cookies
- **Email verification**: Token-based email verification flow
- **Session tracking**: Max 5 concurrent sessions per user
- **IP-based login tracking**: Failed attempts logged by IP
- **Honeypot detection**: Bot detection on registration

### API Security
- **JWT**: Access tokens with minimal payload (no permissions/roles embedded)
- **Rate limiting**: Redis-backed distributed rate limiter with in-memory fallback
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers
- **Input validation**: Zod schemas on all endpoints
- **Error handler**: Stack traces stripped in production

### Data Protection
- **RLS**: Row Level Security enabled on patients table
- **Soft deletes**: Patient and inventory data preserved
- **Audit logging**: All write operations logged to `audit_logs`
- **Controlled substances**: Enhanced audit for class I–V medications
- **Password complexity**: Uppercase + lowercase + digit + special character + 8+ chars

### Security Audit
- OWASP Top 10 (2021) audit documented in `docs/security/SECURITY_AUDIT.md`

### ESLint Rules
- `no-debugger`: error
- `@typescript-eslint/no-explicit-any`: error
- `curly`: ["error", "all"]
- `eqeqeq`: ["error", "always"]
- `no-var`: error
- `prefer-const`: error

---

## 🇪🇬 Egypt Market Features

- **Fawry Payments** — Egyptian payment gateway integration
- **InstaPay** — Mobile wallet integration
- **ETA e-Invoice** — QR code generation for Egyptian Tax Authority compliance
- **Egyptian National ID** — 14-digit validation (century, governorate, birth date, checksum)
- **Egyptian Phone Validation** — Egyptian mobile number format
- **8 Egyptian Insurers** — Misr Insurance, Allianz Egypt, AXA Egypt, GIG Egypt, Arab Misr Insurance, CIL, Royal Insurance, Egypt Life Takaful
- **Arabic ICD-10** — 25+ diagnosis codes with Arabic translations
- **Arabic Medications** — 20+ drugs with Arabic names and usage instructions
- **Full RTL Support** — Complete right-to-left layout for Arabic
- **EGP Currency** — All financial operations in Egyptian Pounds
- **Arabic UI** — Complete Arabic translation (2,674 keys)
- **Default timezone** — Africa/Cairo

---

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| Backend modules | 57 |
| Clean Architecture modules | 4 (auth, patient, appointment, inventory) |
| Backend services | 17 |
| Database migrations | 25 |
| API endpoints | 200+ |
| Frontend pages | 82 |
| Shared UI components | 19 |
| React Query hooks | Domain-specific (usePatients, useAppointments, useAuth) |
| i18n keys | 2,674 (EN) |
| Backend test files | 20 |
| Backend tests | 139 |
| ESLint rules | Strict (no any, curly, eqeqeq, no-debugger error) |
| Git commits | 146 |
| Target market | Egypt 🇪🇬 |
| Currency | EGP (Egyptian Pound) |

---

## 🤝 Contributing

1. Fork → `git checkout -b feature/my-feature`
2. Code: Follow existing module patterns (see Clean Architecture modules for reference)
3. Test: `cd packages/backend && npm run test`
4. Lint: `npm run lint`
5. Commit: `git commit -m 'feat: Add my feature'`
6. Push: `git push origin feature/my-feature`
7. PR: Open pull request

### Code Conventions
- TypeScript strict — no `any` types (ESLint enforced)
- Backend modules: `registerXxxModule(app)` pattern
- Decomposed modules: `types.ts` → `schema.ts` → `repository.ts` → `controller.ts` → `routes.ts` → `mapper.ts`
- Frontend: Lazy-loaded pages, `useTranslation()` for i18n
- All text: EN + AR translation keys (no hardcoded English)
- Security: `sanitizeString()` on all user inputs
- Forms: Zod validation with error display on every form
- Actions: `try/catch` with `toast.error()` on every async action
- Components: Use shared UI components (Modal, Button, Input, Select, Badge, etc.)
- Audit: `logAudit()` on all write operations in decomposed modules

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ for the Egyptian healthcare ecosystem — Vision Healthcare ERP v2.0*
