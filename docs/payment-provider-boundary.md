# Payment Provider Boundary (C4-M1C)

C4-M1C introduces a provider-agnostic server runtime boundary for external billing provider ingestion, replay, and provider-plan mapping.

- Canonical runtime: `CanonicalPaymentProviderBoundaryService`
- Stripe-like envelope input: `{ providerKind, externalEventId, eventType, createdAt, dataJson }`
- Persistence scope: external customers, external subscriptions, external events, and provider-plan mappings
- Ingest is idempotent via persisted dedupe by `(providerKind, externalEventId)`
- Translation remains conservative and delegated to existing translator runtime core

## Supported routes

Internal:
- `POST /api/internal/billing/provider-events`
- `POST /api/internal/billing/provider-events/replay`

Admin:
- `POST /api/admin/billing/provider-plan-mapping`
- `GET /api/admin/billing/provider-plan-mappings`
- `GET /api/admin/billing/provider-events`

`GET /api/admin/billing/provider-events` is deterministic:
- with `subjectId` => subject-mode event listing
- without `subjectId` => unprocessed-mode listing

## Auth model in this batch

This batch keeps the current internal token model (`x-elceo-internal-token`) and existing feature-access gate semantics for internal/admin routes.

## Explicit non-goals

C4-M1C intentionally stops before:
- checkout flows
- customer portal UI
- webhook signature verification
- invoicing and tax expansion

## C4-M2 next

- provider signature verification and anti-replay hardening
- retry/dead-letter operator flows
- operator tooling for event triage and diagnostics
- eventual checkout/customer billing UX integration
