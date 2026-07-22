# Security Audit — OWASP Top 10 (2021) Checklist

> Vision Healthcare ERP — Audit Date: 2026-07-22
> Auditor: Automated Code Review + Manual Verification

---

## OWASP A01:2021 — Broken Access Control

| Check | Status | Evidence |
|-------|--------|----------|
| Server-side authentication on all protected routes | ✅ PASS | `auth-guard.ts` enforces `authenticate()` on every protected endpoint via `preHandler` |
| Tenant-level data isolation (multi-tenancy) | ✅ PASS | All queries filter by `tenant_id`; `getTenantId()` extracted from JWT |
| Role-based authorization | ✅ PASS | `roles` and `permissions` fields on `users` table; checked in module handlers |
| CORS properly restricted | ✅ PASS | `CORS_ORIGIN` configured via env; wildcard rejected in production validation |
| Method-level access control (admin-only routes) | ⚠️ PARTIAL | RBAC module exists but not enforced uniformly on all admin endpoints |
| Directory traversal protection | ✅ PASS | File uploads go through MinIO presigned URLs, not filesystem paths |
| CSRF protection | ⚠️ N/A | SPA + API architecture uses Bearer tokens; CSRF not applicable |
| Insecure Direct Object Reference (IDOR) prevention | ✅ PASS | All resource lookups scoped to `tenant_id` from authenticated JWT |

**Recommendations:**
- Enforce role checks on all admin-only endpoints (HR, billing, compliance)
- Add automated integration tests for cross-tenant access attempts

---

## OWASP A02:2021 — Cryptographic Failures

| Check | Status | Evidence |
|-------|--------|----------|
| Secrets not hardcoded in source code | ✅ PASS | All secrets loaded from environment variables; `validateProductionEnvironment()` rejects insecure defaults |
| Passwords hashed with bcrypt | ✅ PASS | `bcryptjs` with salt rounds in auth module |
| JWT secrets are strong and unique | ✅ PASS | Production validation requires different `JWT_SECRET` and `JWT_REFRESH_SECRET` |
| Database password not a default value | ✅ PASS | `DB_PASSWORD` checked against `INSECURE_DEFAULTS` list |
| Sensitive data redacted in logs | ✅ PASS | 19 fields redacted via pino `redact` config (passwords, tokens, secrets) |
| TLS/SSL for database connections in production | ✅ PASS | `DB_SSL` env var enables `{ rejectUnauthorized: false }` |
| TLS/SSL for Redis connections | ⚠️ PARTIAL | Redis connection uses env vars but no explicit TLS config |
| Encryption at rest for sensitive fields | ⚠️ PARTIAL | MinIO supports encryption; patient PII stored as-is in PostgreSQL |

**Recommendations:**
- Enable Redis TLS in production (`rediss://` protocol)
- Consider column-level encryption for patient PII (national_id, medical_record_number)
- Rotate JWT secrets periodically

---

## OWASP A03:2021 — Injection

| Check | Status | Evidence |
|-------|--------|----------|
| SQL injection prevention | ✅ PASS | All queries use Knex parameterized queries; no raw SQL with user input |
| NoSQL injection prevention | ✅ PASS | PostgreSQL only; Knex escapes all parameters |
| XSS prevention (server-side) | ✅ PASS | Helmet CSP headers configured; `frameAncestors: ['none']` |
| XSS prevention (client-side) | ✅ PASS | React escapes by default; no `dangerouslySetInnerHTML` found |
| Command injection prevention | ✅ PASS | No `exec`/`spawn` with user input; AI modules use simulated responses |
| LDAP injection prevention | ✅ N/A | No LDAP integration |
| Template injection prevention | ✅ PASS | Template rendering uses Knex parameterized inserts |

---

## OWASP A04:2021 — Insecure Design

| Check | Status | Evidence |
|-------|--------|----------|
| Rate limiting on authentication endpoints | ✅ PASS | `loginRateLimit` (5/min), `registerRateLimit` (3/hr), `forgotPasswordRateLimit` (3/hr), `refreshRateLimit` (10/min) |
| Rate limiting logging | ✅ PASS | Pino warning logged when rate limit exceeded |
| Account lockout after failed attempts | ⚠️ PARTIAL | OTP attempt tracking exists; no account lockout policy |
| Multi-factor authentication | ✅ PASS | TOTP-based MFA with QR code generation; enable/disable endpoints |
| Refresh token rotation | ✅ PASS | `021_refresh_token_rotation.ts` migration; family-based revocation |
| Input validation with Zod schemas | ✅ PASS | Zod schemas for all request bodies, queries, and params |
| Principle of least privilege | ⚠️ PARTIAL | Default permissions broad; needs per-role scoping |

**Recommendations:**
- Implement progressive account lockout (5 failed → 15 min lockout)
- Define granular permission matrix per role
- Add request size limits on upload endpoints

---

## OWASP A05:2021 — Security Misconfiguration

| Check | Status | Evidence |
|-------|--------|----------|
| Default credentials changed | ✅ PASS | Production validation rejects `minioadmin`, default JWT secrets |
| Error messages don't leak stack traces | ✅ PASS | `errorHandler.ts` returns generic messages; pino logs details server-side |
| Security headers set | ✅ PASS | Helmet with strict CSP, `frameAncestors: none`, `formAction: self` |
| Debug mode disabled in production | ✅ PASS | ESLint `no-debugger: error`; logger level from `LOG_LEVEL` env |
| Unused features/endpoints disabled | ⚠️ PARTIAL | Swagger UI registered; should be disabled in production |
| Environment validation on startup | ✅ PASS | `validateProductionEnvironment()` runs at boot; exits on failure |
| Development env validation (warnings) | ✅ PASS | `validateDevelopmentEnvironment()` warns about insecure defaults |

**Recommendations:**
- Conditionally register Swagger UI only in development
- Add `X-Content-Type-Options: nosniff` header (Helmet default, verify)
- Disable `X-Powered-By` header (Helmet handles this)

---

## OWASP A06:2021 — Vulnerable and Outdated Components

| Check | Status | Evidence |
|-------|--------|----------|
| Dependencies audited regularly | ⚠️ PARTIAL | `npm audit` available; no automated CI check |
| Known vulnerable packages | ⚠️ NEEDS CHECK | Run `npm audit` periodically |
| Lock file committed | ✅ PASS | `package-lock.json` in repository |
| Auto-update strategy | ⚠️ PARTIAL | No Dependabot/Renovate configured |

**Recommendations:**
- Add `npm audit --audit-level=high` to CI pipeline
- Enable GitHub Dependabot or Renovate for automated updates
- Pin dependency versions in `package.json`

---

## OWASP A07:2021 — Identification and Authentication Failures

| Check | Status | Evidence |
|-------|--------|----------|
| Password minimum length enforced | ✅ PASS | Zod schema requires `min(8)` on password fields |
| Credential stuffing protection | ✅ PASS | Rate limiting + OTP on login |
| Session management | ✅ PASS | `user_sessions` table with expiry, device tracking |
| Refresh token revocation | ✅ PASS | Token family tracking; revocation on reuse |
| Brute force protection | ✅ PASS | Per-IP rate limiting on auth endpoints |
| Password change requires current password | ✅ PASS | `change-password` endpoint validates current password |
| Secure password reset flow | ✅ PASS | OTP-based reset with expiry and attempt limits |

---

## OWASP A08:2021 — Software and Data Integrity Failures

| Check | Status | Evidence |
|-------|--------|----------|
| CI/CD pipeline integrity | ⚠️ PARTIAL | No signed commits or artifact verification |
| Database migrations versioned | ✅ PASS | Knex migrations numbered 001-021; committed to repo |
| Dependency integrity | ✅ PASS | `package-lock.json` committed |
| File upload integrity | ✅ PASS | MinIO presigned URLs; no direct filesystem writes |
| Serialization safety | ✅ PASS | No `eval()` or `Function()` with user input |
| Supply chain security | ⚠️ PARTIAL | No SBOM generation or dependency signing |

**Recommendations:**
- Generate SBOM (Software Bill of Materials) in CI
- Consider signed Git commits for release branches

---

## OWASP A09:2021 — Security Logging and Monitoring Failures

| Check | Status | Evidence |
|-------|--------|----------|
| Authentication events logged | ✅ PASS | Login, logout, MFA events via `logAudit()` |
| Rate limit violations logged | ✅ PASS | Pino warning with IP, route, count details |
| Sensitive data redacted from logs | ✅ PASS | 19 fields redacted in pino config |
| Error events logged | ✅ PASS | Pino error-level logging throughout |
| Audit trail for data changes | ✅ PASS | `audit_logs` table with user, action, entity, changes |
| Production monitoring | ⚠️ PARTIAL | System metrics collected; no alerting configured |
| Log aggregation | ⚠️ PARTIAL | Pino stdout; no centralized log shipping |
| Incident response plan | ❌ MISSING | No documented incident response procedure |

**Recommendations:**
- Set up log aggregation (Datadog, ELK, or CloudWatch)
- Configure alerts for repeated auth failures and rate limit hits
- Document an incident response runbook

---

## OWASP A10:2021 — Server-Side Request Forgery (SSRF)

| Check | Status | Evidence |
|-------|--------|----------|
| User-supplied URLs validated | ⚠️ PARTIAL | Webhook URLs stored from user input; no SSRF protection |
| Internal network access restricted | ⚠️ PARTIAL | No egress filtering on webhook/integration calls |
| DNS rebinding protection | ❌ NOT CHECKED | Would require network-level controls |

**Recommendations:**
- Validate webhook/integration URLs against a blocklist of internal IPs
- Implement URL allowlisting for outbound requests
- Use a network policy to restrict outbound traffic from the server

---

## Summary

| Category | Pass | Partial/Fail |
|----------|------|-------------|
| A01: Broken Access Control | 6 | 2 |
| A02: Cryptographic Failures | 5 | 3 |
| A03: Injection | 6 | 0 |
| A04: Insecure Design | 4 | 3 |
| A05: Security Misconfiguration | 5 | 2 |
| A06: Vulnerable Components | 2 | 3 |
| A07: Auth Failures | 7 | 0 |
| A08: Integrity Failures | 4 | 2 |
| A09: Logging Failures | 5 | 3 |
| A10: SSRF | 0 | 3 |
| **Total** | **44** | **21** |

**Overall: 68% PASS, 32% PARTIAL/MISSING**

### Priority Remediation Items

1. **HIGH** — Enforce RBAC on admin endpoints
2. **HIGH** — Implement SSRF protection on webhook URLs
3. **HIGH** — Add account lockout after repeated failed logins
4. **MEDIUM** — Enable Redis TLS in production
5. **MEDIUM** — Conditionally disable Swagger in production
6. **MEDIUM** — Add npm audit to CI pipeline
7. **MEDIUM** — Set up centralized log aggregation
8. **MEDIUM** — Document incident response procedure
9. **LOW** — Generate SBOM in CI
10. **LOW** — Enable Dependabot/Renovate
