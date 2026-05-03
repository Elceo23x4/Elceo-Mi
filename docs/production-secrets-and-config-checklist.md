# ELCEO Production Secrets and Configuration Checklist (C4-M8A)

## Core runtime environment
- `APP_ENV=production`
- `NEXT_PUBLIC_APP_BASE_URL` (absolute `https://` public app URL)
- `APP_STATE_REPOSITORY` (`postgres` in production)

## Auth/session secrets
- `AUTH_SECRET` (required in production)
- `AUTH_GOOGLE_CLIENT_ID` and `AUTH_GOOGLE_CLIENT_SECRET` (if Google provider enabled)

## Internal/admin protection
- `ELCEO_INTERNAL_API_TOKEN` (required in production; used by internal/admin routes)

## Billing provider configuration
- `BILLING_PROVIDER` (`mock` for non-prod only, `stripe` for production billing)
- Stripe (required when `BILLING_PROVIDER=stripe`):
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_PREMIUM`
- Optional legacy/internal compatibility key:
  - `BILLING_WEBHOOK_SECRET` (if still referenced by deployment scripts)

## Notification / provider keys
- Market/news provider keys as enabled:
  - `FINNHUB_API_KEY`
  - `ALPHAVANTAGE_API_KEY`
  - `FMP_API_KEY`
  - `MARKETAUX_API_KEY`
  - `NEWSAPI_API_KEY`
  - `FIRECRAWL_API_KEY`

## Data/infra configuration
- Database credentials and network policy for SQL repositories.
- Kafka settings only if enabled:
  - `ENABLE_KAFKA=true` requires `KAFKA_BROKERS`
  - optional `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID_INGESTION`

## Observability configuration
- `LOG_LEVEL`
- `SENTRY_DSN` (if external error transport is enabled)

## Secret handling controls
- Never commit `.env` files with real values.
- Store production secrets in managed secret manager only.
- Rotate high-impact secrets (`AUTH_SECRET`, internal API token, Stripe secrets) on a fixed schedule and after incident response.
- Ensure logs/redaction policies do not emit secret material.

## C5-A7 Live Tiingo activation readiness

- C5-A7 live-readiness update: Tiingo remains fixture-first by default; runtime live adapter defaults to `live_disabled` unless `TIINGO_LIVE_ENABLED=true`.
- Live mode now requires `TIINGO_API_KEY`; optional `TIINGO_BASE_URL` (default `https://api.tiingo.com`) and `TIINGO_TIMEOUT_MS` are supported.
- Added provider-health semantics (`configured | disabled | missing_api_key | invalid_config`) via reasoning boundary/service; health never exposes API key values.
- Tests/build remain no-network by default: live paths are exercised only with injected fake fetch implementations.
- Staging activation only: set `TIINGO_LIVE_ENABLED=true` + `TIINGO_API_KEY`, verify provider health=`configured`, run internal fixture ingest regression, then execute constrained live smoke manually.
- Production activation deferred; risks remain provider quota/billing, schema drift, and stale-data monitoring/alerting.
