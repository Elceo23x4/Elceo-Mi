# SEC-C payment and provider correctness

`InternalPaymentRuntime` and `app_billing_subscriptions` remain the only payment mutation and commercial access authorities. Legacy `BillingService` is compatibility parsing only and its output must enter that runtime.

## Price authority and intentions

`commercial_price_versions` is immutable, versioned Super Admin commercial truth. Amounts are positive integer provider minor units and currency identifiers are capability-driven. There is deliberately no seed or fallback price. The step-up-scoped `focus_plan_price_update` action creates a version and supersedes (rather than edits) the prior row. Future-effective mutations are rejected, so the current price cannot be retired into a scheduling blackout. Checkout snapshots its price version, plan, interval, amount and currency; subscriptions and open intentions are never repriced.

Clients supply an opaque 8–255 character idempotency key for one purchase gesture. Repeating it with changed plan, interval, quote, currency, or provider fails. Provider identity is generated once and reused after crashes or lost responses. Short database transactions surround, but never contain, provider HTTP calls.

## Providers

Stripe Checkout uses inline recurring `price_data`, with five-minute signed-webhook timestamp tolerance and multiple `v1` signature rotation support. Stripe reconciliation retrieves provider truth before its short `SELECT ... FOR UPDATE` transaction and validates session/payment, customer, product, amount, currency, interval and status against the immutable quote before value.

Kora uses `https://api.korapay.com/merchant/api/v1/charges/initialize` and `GET /api/v1/charges/:reference`. Its `x-korapay-signature` is timing-safe HMAC-SHA256 over only the JSON `data` object. A notification never grants value until the charge is re-queried and matches the local quote. Redirects are navigation only.

Capabilities are separate durable rows keyed by provider, environment, rail and currency, including merchant enablement, checkout, recurring, reconciliation, verification time and source. No currency implies another rail. Kora checkout payments are fixed monthly, quarterly, or yearly periods and expire at `current_period_end`; Direct Debit remains inactive unless a separately verified NGN recurring capability is configured. There is no FX.

## Activation and failure

Sandbox and production rows, keys, secure callback base URL, SQL persistence and an explicit live-payment gate are all required. CI uses HTTP fixtures, never provider endpoints. Unknown results, commercial mismatch, under/overpayment and provider failures remain reconciliation-required and fail closed. Inbox, transition, ledger, canonical subscription and audit writes commit or roll back together; reconciliation queries happen before the short locked mutation transaction and never initiate a charge.

## Capability provisioning

No capability is seeded as enabled. A production operator must verify the exact merchant-account provider, environment, rail, and currency in the provider console, then insert or update that exact `payment_provider_capabilities` key with `merchant_enabled`, `checkout_supported`, `reconciliation_supported`, the verification time, and a non-secret ticket/document reference. Recurring support is enabled only when the exact provider rail contract has been verified. Changing a capability is an operator-controlled database change and never creates a price or performs FX.

Production charging requires `APP_ENV=production`, `PAYMENT_PROVIDER_MODE=production_provider`, `ELCEO_PAYMENT_PRODUCTION_LIVE_ENABLED=1`, SQL persistence, an HTTPS canonical base URL, an explicit provider, matching live credentials, a configured Product for Stripe, an effective commercial price, and an enabled verified capability. Sandbox/fake flags are contradictory and fail closed. The flag defaults off.

Provider callback URLs are derived only from the configured canonical application base URL; inbound Host and forwarding headers are never payment-routing authority. Stripe and Korapay activation is evaluated independently for the provider explicitly selected by the checkout and stored on the operation, so both can coexist while either fails closed when its own credentials are incomplete.

Korapay capability verification also records `minor_unit_exponent` and `provider_amount_encoding`. The exact-money codec consumes those durable values and emits a validated JSON numeric token without converting through JavaScript `Number`; missing metadata blocks checkout. Ambiguous Korapay retries query the existing immutable reference first and initialize only after an explicit provider 404. Fixed paid periods use the provider success timestamp (or the operation's first immutable anchor), so delayed delivery and replay cannot extend access. Stripe `trialing` is not paid Focus Plan authority.
