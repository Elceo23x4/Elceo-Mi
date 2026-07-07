# RC-E Route Entitlement Enforcement Map

Generated inventory timestamp: 2026-07-07T00:00:00.000Z (deterministic RC-E documentation marker; live filesystem remains source of truth in `buildRouteInventory`).

RC-E generated live route count: 145.

## Classification legend

`public_safe`, `public_seo_safe`, `authenticated_basic`, `kick_off_allowed`, `focus_plan_required`, `subscription_required_on_expiry`, `notification_preference_owner_only`, `admin_read_required`, `admin_ops_required`, `super_admin_required`, `internal_only`, `blocked_live_activation`, `payment_readiness_required`, and `no_product_entitlement_required` are the canonical route policy classifications for RC-E.

Runtime closure states are limited to `runtime_enforced`, `explicitly_not_applicable`, `blocked_or_disabled`, and `environment_verification_required`.

## Family summary

- Auth/framework: `/api/auth/[...nextauth]` is `no_product_entitlement_required`; framework auth is explicitly not product-entitlement gated.
- Dashboard: `/api/dashboard/[asset]` preserves `kick_off_allowed` for `dashboard.chart`, `dashboard.evidence_score`, and `dashboard.macro_headlines`; premium cognition/deep payloads remain `focus_plan_required` / `subscription_required_on_expiry` and are denied to kick-off-only subjects before payload selection.
- Journal: `/api/journal/*` preserves `kick_off_allowed` for `journal.page` and focus-plan coverage for cognition/deep-analysis generators that exist. Deep-analysis routes not present in the live filesystem are `not_present` and were not invented.
- Workspace, portfolio, analytics, coaching, refresh: default `focus_plan_required` with owner boundary and commercial restriction-first enforcement.
- Account/profile/social identifiers: `authenticated_basic` with owner-only subject boundary; external LinkedIn/Telegram/X ownership verification remains outside RC-E.
- Notifications: user-facing subscriptions, targets, summary, and inbox are owner-scoped; dispatch/operator routes require internal/admin controls and live-send activation remains blocked/dry-run only.
- Admin: read endpoints require `internal_only` + `admin_read_required`; mutation endpoints require `internal_only` + `admin_ops_required`; commercial controls require `super_admin_required`, server-side step-up binding, idempotency, audit, target-user binding, and restriction-first ordering where applicable.
- Internal: `/api/internal/*` requires internal token before mutation; operator ingestion/mutations also require admin ops semantics.
- Billing/payment: readiness routes report blocker/readiness states; live checkout/session activation remains `blocked_live_activation`.
- SEO: admin SEO feed/sitemap remain internal/admin only; no public SEO API routes are created by RC-E.

## Executable test coverage

The synchronized route inventory test builds from `apps/web/app/api/**/route.ts` and fails when a route or method lacks classification, when docs route count drifts, when admin/internal routes lack matching token/permission expectations, or when product routes lack commercial restriction-first expectations. Runtime tests also cover owner-boundary probes, admin/internal token probes, commercial restriction-first denial probes, dashboard/journal slice entitlement probes, billing readiness, notification live-send blocking, idempotency, audit, and guard-order side-effect denial.

## Routes marked environment_verification_required

Provider-event replay/readiness routes that depend on deployed provider event inputs are marked `environment_verification_required`; local tests still assert no unsafe default and require internal/admin guard evidence before replay/processing.

## Routes marked blocked_live_activation

Notification dispatch and any checkout/session/live provider activation path are `blocked_live_activation` or `blocked_or_disabled` because RC-E must not activate live KoraPay/Stripe checkout/session creation, notification live sends, or provider-live ingestion.

## Explicitly not present

Public SEO API routes and journal deep-analysis routes beyond the live route filesystem are `not_present`; RC-E does not create them.

## Remaining risks

Production deployed-auth smoke, real provider webhook provenance, and live payment/notification provider activation require environment verification and credentials; they are intentionally not faked in local CI.
