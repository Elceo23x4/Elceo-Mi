# S5 Infrastructure, WAF, Headers, and Deployment Security Policy

## Scope
This policy defines pre-launch production security requirements for infrastructure and deployment controls. It is policy and enforcement guidance, not a cloud implementation or security certification.

## Responsibility split
- **App-level (repo-enforced):** API envelope redaction, route authz/runtime controls, static/header configuration assertions, CI security gates.
- **Deployment-level (platform/CDN/WAF):** HTTPS termination, HSTS delivery, edge WAF, volumetric DDoS mitigation, network isolation, backup automation, IAM guardrails.

## Production security headers policy
Required response headers in production:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HTTPS-only delivery)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` (minimum baseline for scripts/styles/images/connect/frame-ancestors/object-src/base-uri/form-action)
- `Cross-Origin-Opener-Policy: same-origin` where compatible
- `Cross-Origin-Resource-Policy: same-origin` where compatible

### App enforcement in this repo
- Next.js header config sets core security headers for all routes.
- Admin/internal API route families are marked non-cacheable (`Cache-Control: no-store`).
- Middleware keeps request-id propagation and baseline headers for protected app routes.

### Deployment requirements
- CDN/edge must enforce HTTPS redirect (HTTP -> HTTPS).
- HSTS must only be emitted on HTTPS responses in production.
- If CSP needs nonce/hash tuning for third-party assets, finalize at deployment and verify no regressions.

## CORS / origin / method policy
- Admin and internal route families are same-origin/backend-only operational surfaces.
- No wildcard CORS (`*`) on admin/internal endpoints.
- No wildcard credentialed CORS policy is allowed.
- Public APIs (if introduced later) must use explicit allowlisted origins and explicit methods.
- Provider API keys are server-side only and must never be accepted from browser clients.

## Request-size and method/resource abuse policy
- All API routes must implement strict method handling (allowlist by route).
- Request body/query size caps must be enforced at edge/proxy and app runtime where available.
- Baseline policy targets:
  - body max: 1 MB for JSON API by default; lower on sensitive auth/admin routes.
  - query string max: 2 KB default.
  - header size max: platform default hardened profile.

## WAF and rate-limit policy
Edge WAF/CDN must enforce:
- SQLi/XSS/path traversal signature blocking.
- Per-IP and per-session throttles.
- Route-family throttling with stricter controls for admin/internal/auth/mutations.
- Bot screening and anomaly detection.
- Volumetric DDoS baseline protections.

Route family guidance:
- `account/auth/access`: strict burst and daily ceilings.
- `journal/portfolio/notifications`: medium burst; stricter mutation limits.
- `admin/internal market-evidence`: strict allowlist + low throughput limits.
- `scheduled-ingestion dry-run`: strictest mutation limits with replay/idempotency checks.
- `billing/admin entitlements`: strict mutation thresholds + audit trail monitoring.
- `future public SEO pages`: crawler-aware but constrained abuse protections.

App-level runtime controls are additive and **not** a replacement for edge WAF.

## Deployment hardening checklist (required)
- TLS 1.2+ only; strong cipher defaults managed by platform.
- Enforce HTTPS and HSTS.
- Restrict origin forwarding and trusted proxy headers.
- Disable directory listing/debug endpoints.
- Harden CDN cache rules to avoid caching internal/admin JSON.
- Verify no stack traces or secret-like values in 5xx bodies.

## DB/network isolation checklist
- Database not publicly exposed to internet.
- App-to-DB traffic over TLS.
- Separate identities for app runtime and migration execution where feasible.
- Least-privilege DB roles (read/write separation where practical).
- Strict ingress allowlist from app runtime network only.

## Backup, restore, and encryption checklist
- Automated backups enabled pre-launch.
- Backup encryption at rest and in transit.
- Documented retention policy and access controls.
- Restore drill completed in staging before launch.
- Backup access logging enabled and reviewed.

## IAM and secrets rotation checklist
- Least-privilege runtime roles.
- Separate staging vs production secrets and tokens.
- Rotation policy for internal tokens and provider API keys.
- Emergency revocation runbook verified.
- No secrets in CI logs; CI uses non-production credentials.

## Staging verification gate
Before production launch, staging must verify:
- Header set present and correct under HTTPS.
- CORS/origin behavior for admin/internal routes remains non-wildcard.
- WAF/rate-limit policies trigger correctly for abusive patterns.
- Restore drill and IAM rotation rehearsal completed.
- S6 attack-drill validation remains required and is not replaced by S5.
