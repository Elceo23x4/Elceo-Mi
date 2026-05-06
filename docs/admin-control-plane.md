# Admin Control Plane (C4-J)

This batch introduces a backend-only, deterministic admin read layer for cross-domain operational visibility.

- System summary aggregates persisted refresh, freshness, and ops runtime data.
- Freshness summary reads persisted freshness records only.
- Ops summary reads persisted ops run + stale lease state only.
- Provider summary is a deterministic capability contract placeholder for current provider surfaces.
- Audit timeline deterministically assembles refresh + ops events into a bounded, ordered timeline.

API routes (internal-gated):
- `/api/admin/system-summary`
- `/api/admin/freshness`
- `/api/admin/ops`
- `/api/admin/providers`
- `/api/admin/audit`

This batch intentionally stops before admin UI rendering.


## C4-M2B internal billing reconciliation linkage

Operational billing reconciliation execution is exposed via `POST /api/internal/billing/reconcile`, guarded by internal token and `admin.ops` feature access to align with existing internal operations policy.


### Billing policy admin/internal controls (C4-M3B)
- Internal evaluation endpoint for subject-level policy replay/evaluation: `POST /api/internal/billing/policy/evaluate`.
- Admin read endpoints for subject policy status and transition history are API-only in this batch; no control-plane UI shipped.


### C4-M4A billing-admin operational core
Adds runtime-only billing operational summary, failure classification, retry-candidate, and subject snapshot read models for future control-plane route integration.


## C4-M4A completion note
The control-plane backend now has concrete billing-admin runtime read models (summary, failures, candidates, subject snapshot) ready for route integration in C4-M4B.

## C4-M4B Billing Admin Control Surfaces
- `/api/admin/billing/operations/summary`
- `/api/admin/billing/operations/failures?limit=`
- `/api/admin/billing/operations/retry-candidates?limit=`
- `/api/admin/billing/operations/subject?subjectId=`
- `/api/internal/billing/reconcile/retry`
All routes are internal/admin guarded; no end-user direct access.


## C4-M5B Billing Orchestration Controls
- `/api/admin/billing/orchestration/latest`
- `/api/admin/billing/orchestration/runs`
- `/api/admin/billing/orchestration/subject`
- `/api/internal/billing/orchestration/retry`

This completion is API-only. Admin UI wiring and automated scheduler-managed retries are intentionally deferred to the next hardening batch.


## C4-M6B1C admin entitlement write hardening
The admin entitlement mutation routes are now runtime-security protected:
- `POST /api/admin/entitlements/plan`
- `POST /api/admin/entitlements/state`
- `POST /api/admin/entitlements/override`

All three retain internal-token gating, then run canonical security control evaluation with `actionKind: admin_write` before mutation execution. Successful mutations complete idempotent actions (when idempotency headers are provided) and emit security audit events.

## C4-M6B2B admin billing write hardening
Admin billing mutation surfaces now use canonical route-security enforcement (`admin_write`) in addition to existing internal-token gates and request validation:
- `/api/admin/billing/trial`
- `/api/admin/billing/activate`
- `/api/admin/billing/renew`
- `/api/admin/billing/change-plan`
- `/api/admin/billing/past-due`
- `/api/admin/billing/cancel-at-period-end`
- `/api/admin/billing/expire`
- `/api/admin/billing/pause`
- `/api/admin/billing/resume`
- `/api/admin/billing/provider-plan-mapping`

## C5-A6 note
- Added internal-only fixture ingestion trigger: `POST /api/internal/market-evidence/tiingo/fixture-ingest` (internal token + `admin.ops` + runtime security `internal_mutation`).
- Trigger executes `runTiingoFixtureIngestion` through canonical market intelligence runtime using fixture-only Tiingo adapter (no live network calls, no `TIINGO_API_KEY`).
- Ingestion persists provider request/response/normalized payload lifecycle and supports payload query/replay.
- Future C5-A7 live activation requirements remain: `TIINGO_API_KEY`, provider health checks, scheduler integration, production rate-limit policy, staging smoke validation.


## C5-A20 market evidence + SEO admin/internal query routes
Added protected read-only admin query surfaces under /api/admin/market-evidence/* and /api/admin/seo/* (internal token + admin.read). These routes expose persisted payload/replay/quality/reasoning-input/weighted/cognition/SEO feed/sitemap views with strict query validation, no live provider fetches, and no public SEO pages.

## C5-A23 note
- Added protected internal/admin scheduled-ingestion routes: policies/runs/replay (GET) and dry-run (POST).
- Dry-run POST is internal+admin.ops gated with mutation security decision, idempotency, rate-limit, audit, and response-envelope completion.
- Route input rejects production_live override and provider API key fields; fixture dry-run only.
- No public routes, no cron deployment, and no live provider calls in this batch.
\n\n## C5-A24 backend consolidation linkage\n- See  for consolidated C5 backend readiness truth source.\n- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.\n- Production go/no-go still requires security verification track, staging smoke, and production smoke.\n- DB migrations must be applied in strict lexicographic order (including , , ).\n- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## C5-A24 backend consolidation linkage
- See `docs/c5-market-evidence-backend-readiness-report.md` for consolidated C5 backend readiness truth source.
- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.
- Production go/no-go still requires security verification track, staging smoke, and production smoke.
- DB migrations must be applied in strict lexicographic order (including `0032`, `0033`, `0034`).
- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## S2 IDOR/authorization verification note
- Added `docs/security-idor-authorization-matrix.md` with representative route family gate classification and expected subject boundaries.
- Route-runtime coverage now includes representative cross-subject denial checks (journal/portfolio), admin/internal gate denial checks (billing/admin/internal/market-evidence/scheduled-ingestion), and mutation security action-kind regression assertions.
- This does not replace external pentest or staging attack drill sign-off.
- Next security phase remains S3 input abuse/injection adversarial testing.

## S3 injection/input-abuse hardening note
- Added representative input-abuse matrix: `docs/security-input-abuse-hardening-matrix.md`.
- Added representative route-runtime tests for query injection/abuse, malformed JSON/body abuse, and internal-error redaction checks.
- This is not security certification and does not replace DAST/fuzzing/pentest.
- S4 (supply-chain/CI), S5 (infra/WAF), and S6 (staging attack drill) remain required.

