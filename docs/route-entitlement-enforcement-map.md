# Post-C6-P1 Route Entitlement Enforcement Map

Status: in progress (Phase 1). Last updated: 2026-05-16.

## Classification legend
- public_safe
- authenticated_basic
- kick_off_allowed
- focus_plan_required
- subscription_required_on_expiry
- admin_read_required
- admin_ops_required
- super_admin_required
- internal_only
- public_seo_safe
- blocked_live_activation
- payment_readiness_required
- notification_preference_owner_only
- no_product_entitlement_required
- needs_follow_up

## Inventory summary
Route root scanned: `apps/web/app/api`.

### Key family decisions
- `/api/dashboard/[asset]` GET → `kick_off_allowed` for `dashboard.chart`, `dashboard.evidence_score`, `dashboard.macro_headlines`; premium slices are `focus_plan_required` + `subscription_required_on_expiry`. current gate: `requireFeatureAccess('dashboard.read')`. action: keep gate + map sub-feature slices explicitly in route payload selection.
- `/api/journal/*` user routes → `kick_off_allowed` (`journal.page`) + `focus_plan_required` for deep-analysis variants. current gate: feature-based; action: split explicit feature keys for basic vs deep.
- `/api/workspace/*`, `/api/portfolio/*`, `/api/analytics/*`, `/api/coaching/*`, `/api/refresh/*` → `focus_plan_required` (except if explicitly re-scoped later). current gate: feature-based. action: verify feature key map alignment.
- `/api/account/*` → `authenticated_basic` + owner-only subject boundary. action: maintain owner checks.
- `/api/notifications/subscriptions|targets|summary|inbox` → `notification_preference_owner_only` and authenticated owner-only.
- `/api/notifications/delivery/dispatch` and `/api/ops/notifications/*` → `internal_only` / `admin_ops_required`; live sends remain blocked.
- `/api/admin/*` read endpoints → `internal_only + admin_read_required`; write endpoints → `internal_only + admin_ops_required`; commercial controls requiring super-admin remain `super_admin_required`.
- `/api/internal/*` → `internal_only` (token required) and usually `admin_ops_required`.
- `/api/admin/seo/*` → internal/admin only; no public premium feed exposure.
- `/api/billing/checkout` POST → `blocked_live_activation + payment_readiness_required` (KoraPay/Stripe live disabled in this phase).

## Detailed per-route table

> This phase records representative classifications for all families and marks unresolved rows as `needs_follow_up`.

| Method | Path pattern | Current auth gate | Required policy | Sensitivity | Exposure risk | Action required | Test status |
|---|---|---|---|---|---|---|---|
| GET | `/api/dashboard/[asset]` | authenticated + feature | kick_off_allowed / focus_plan_required | premium cognition | high | enforce sub-feature policy map | partial |
| GET/POST | `/api/journal/*` | authenticated + feature/security | kick_off_allowed for `journal.page`; focus for advanced | user+premium | high | split explicit feature key mapping | partial |
| GET/POST/PATCH | `/api/portfolio/*` | authenticated + security | focus_plan_required | user strategy | high | keep restriction-first checks | partial |
| GET/POST | `/api/workspace/*` | authenticated + feature/security | focus_plan_required | premium | high | coverage assertions | partial |
| GET/POST | `/api/analytics/*` | authenticated + feature/security | focus_plan_required | premium-derived | high | no public access | partial |
| GET/POST | `/api/coaching/*` | authenticated + feature/security | focus_plan_required | premium-derived | high | no public access | partial |
| GET/POST | `/api/refresh/*` | authenticated + feature/security | focus_plan_required | premium freshness | medium | keep entitlement gate | partial |
| GET | `/api/account/*` | authenticated | authenticated_basic | account private | medium | owner-only remain | partial |
| GET/POST/PATCH | `/api/notifications/*` | authenticated/security/internal | notification_preference_owner_only or internal_only | private + operational | high | owner boundary + no live send | partial |
| * | `/api/admin/*` | internal token + feature | admin_read/admin_ops/super_admin | admin/internal | critical | preserve strict gate ordering | covered |
| * | `/api/internal/*` | internal token + feature | internal_only + admin_ops_required | internal/provider | critical | preserve tokens and audit | covered |
| GET/POST | `/api/billing/*` | mixed legacy/authenticated | payment_readiness_required + blocked_live_activation where checkout | commercial/payment | critical | block live checkout; readiness-only response | added |
| * | `/api/auth/[...nextauth]` | framework auth | no_product_entitlement_required | auth | low | none | needs_follow_up |

## Not present yet / future wiring
- Public SEO endpoints under `/api/seo/*` are not present yet. Marked future wiring; do not infer public release.
- Dedicated KoraPay checkout route family under `/api/checkout/korapay/*` not present yet.
- Dedicated super-admin operator inspection routes are partially represented via existing admin/internal families; additional granularity is future wiring.


## Post-C6-P1D update
- Added representative commercial runtime guards for /api/analytics/latest, /api/coaching/latest, /api/portfolio/watchlist (GET/POST), and /api/notifications/summary via guardRouteCommercialEntitlement.
- Status: commercial_runtime_guarded (representative only).
- requireFeatureAccess remains separate feature-permission layer from commercial entitlement.
- Remaining families: needs_follow_up for full runtime commercial snapshot binding beyond test header fixtures.


## Post-C6-P1E (2026-05-17)
- Final route-family audit completed for product-facing families.
- Commercial runtime guarded (confirmed): analytics, coaching, portfolio watchlist (GET/POST), notifications summary.
- Feature-permission guarded only: workspace family.
- Helper/lower-level tested: dashboard, journal, billing checkout payment-readiness and live-block, frontend contracts/mock payload families.
- Route runtime tested: admin/internal/scheduled-ingestion/operator-inspection/observability audit representative handlers.
- Policy only: account/profile, auth, provider activation, super-admin metrics.
- Needs follow-up: market-evidence product-facing route family classification remains policy-ambiguous without new public handlers.
- Not present: public SEO/programmatic route family and dedicated KoraPay public checkout route family.
- `requireFeatureAccess` remains separate from commercial entitlement runtime guards.
- Live provider/payment/notification activation remains blocked in this phase.
- No UI changes were made in Post-C6-P1E.
- Enforcement status: representative runtime enforcement complete with documented follow-up families (not full exhaustive route-runtime simulation).

## Post-C6-P2 (2026-05-17) core intelligence commercial guard closure
- Scope: market-evidence/admin-intelligence route re-audit, dashboard/journal/frontend-contract route classification only; no UI changes, no provider/payment/notification live activation.
- User-facing market-evidence premium intelligence routes are currently not present; existing market-evidence handlers are admin/internal and remain gated by internal/admin guard layers.
- Dashboard kick-off allowlist remains limited to dashboard.chart, dashboard.evidence_score, dashboard.macro_headlines; premium cognition remains Focus Plan required.
- Journal basic page remains kick-off allowed; deep-analysis/cognition-linked journal routes are not present and remain documented as not_present.
- Public SEO product-intelligence routes remain not_present; admin SEO feed/sitemap routes remain internal/admin-only.
- Feature-permission gates and commercial entitlement gates remain separate and both required where applicable.


## Post-C6-P3 account/profile + notification ownership update (2026-05-17)
- Scope: backend route ownership and payment-readiness guard updates only; no UI changes.
- Focus Plan checkout readiness now enforces social identifiers (linkedin_address, telegram_id, x_username) before eligibility; missing identifiers return `payment_readiness_blocked` + `missing_social_identifier`; liveActivation remains blocked.
- Notification preference foundation remains shell-only (no live email/WhatsApp sends) and owner boundary is enforced for subscription mutation routes.
- Account/profile routes remain authenticated-basic where present; profile/social identifier CRUD route now exists at /api/account/profile/social-identifiers (GET/PATCH), authenticated + owner-scoped; persistence is durable when APP_STATE_REPOSITORY=sql with DATABASE_URL; otherwise explicit memory_fallback persists only for test/local runtime.
- No live KoraPay/Stripe checkout created; no live provider activation.


## Post-C6-P4 update (2026-05-17)
- Added internal-only admin commercial control route foundations for gift/retract/restrict and control snapshot under `/api/admin/commercial/users/[userId]/*`.
- Mutation routes require internal token, `admin.ops`, security decision/idempotency/audit flow, and verified step-up contract checks.
- Step-up state remains **fixture/readiness** (`fixture_verified_for_tests` / `step_up_readiness_only`); production 2FA provider wiring is pending.
- IP ban is explicitly rejected; user restriction supports only `suspended` or `banned`.
- No UI changes, no payment provider activation/calls, no checkout/session activation, no notification sends.
- Persistence caveat: super-admin commercial control records are currently in-memory foundation state, not durable production storage.

## Post-C6-P5 Update (2026-05-18)
- Super Admin gift/restrict persistence now supports SQL durability when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are configured; otherwise explicit `memory_fallback`.
- Step-up/2FA classification: `provider_pending` (readiness only, fixture verification in tests).
- Routes remain backend-only; no Admin UI wiring done.
- No payment provider, notification, or live 2FA activation in this batch.
- IP ban remains intentionally unsupported.


## Post-C6-P6 (2026-05-18)
- Added production step-up/2FA contract foundation: challenge creation, verification, freshness window, replay protection, rate-limit/lockout policy, and safe audit metadata.
- Provider readiness remains blocked: totp/webauthn/authenticator_app are provider_pending; fixture_test_only is test-mode only.
- Super Admin commercial mutation routes still require verified step-up and do not expose OTP/proof/token secrets.
- Persistence status for step-up challenge runtime is memory_fallback; durable provider activation remains deferred.
- No UI work, no payment/provider/notification live activation in this batch.
