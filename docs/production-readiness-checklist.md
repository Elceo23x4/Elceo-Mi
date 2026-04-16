# ELCEO Production Readiness Checklist (Slice: hardening)

## Observability
- [x] Structured JSON logging primitive with redaction.
- [x] API request-id propagation for billing routes.
- [x] Error capture helper with staged Sentry integration path.

## Security
- [x] Auth secret enforcement in production mode.
- [x] Middleware security headers (nosniff, frame deny, referrer and permissions policy).
- [x] Billing webhook signature validation scaffold with timing-safe compare.
- [x] Input validation on billing checkout target plan.

## Accessibility
- [x] Skip link and main-content landmarks.
- [x] ARIA pressed state for toggle chips on dashboard and portfolio.
- [x] Onboarding premium option disabled when subscription not eligible.

## Performance
- [x] Cognition chart memoization to reduce rerender churn.
- [x] Plan-aware history limits applied on analytics/journal data loads.
- [x] Dashboard module rendering capped by entitlement.

## Governance/Retention
- [x] Alert retention pruning and per-user cap.
- [x] Audit retention pruning and global cap.
- [x] Journal media scaffold retention/cap guardrails.

## CI/Quality Gates
- [x] Workspace-level `quality-gate` script added.
- [x] Package-level test scripts wired for application-state, analytics, and billing services.

## Remaining before full launch
- [ ] Real external error transport adapter (Sentry SDK wiring).
- [ ] Production billing provider adapter replacing mock checkout/portal behavior.
- [ ] End-to-end security pen-test and load-test signoff.
