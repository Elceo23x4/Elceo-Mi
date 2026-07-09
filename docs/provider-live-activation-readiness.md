# Provider Live Activation Readiness (C5-A21)

C5-A21 introduces staging-only live provider activation planning gates.

- Canonical contracts added for activation policy, readiness status, readiness snapshot, quota policy, and smoke plan.
- Production live ingestion remains blocked by default.
- No scheduler, no cron, no live ingestion enablement in production.
- Tiingo staging readiness requires explicit live enablement plus API key.
- Helpers return no secrets and perform no network calls.
- Smoke plans are planning artifacts only and gate on staging-ready status.
- C5-A22 will build scheduled ingestion orchestration on top of these contracts.

## C5-A22 note
- Added scheduled ingestion orchestration foundation with dry-run fixture jobs, persisted run records, query/replay helpers, deterministic retry/staleness helpers, and production-live blocked by default.
- No cron deployment and no live provider calls by default in this batch.


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
\n## C6-A1 update (2026-05-14)\n- Added canonical provider/source registry snapshot + validators + boundary methods.\n- Registry is fixture/dry-run readiness only; no live calls and no API keys.\n- Live activation remains blocked-by-default for every source.\n- C6-A2 remains the next step for launch-asset fixture expansion.\n

## RC-F Provider API Gate foundation (2026-07-08)
- Canonical Provider API Gate boundary introduced for provider/source/capability/adapter resolution before execution. Canonical source IDs remain descriptor IDs such as `tiingo_market_data`; capabilities remain registry capabilities such as `market_price_history`; adapter IDs are derived gate IDs such as `tiingo_market_data_market_price_history_adapter`.
- Activation modes are `disabled`, `fixture_only`, `dry_run`, `replay`, `staging_live_allowed`, and `production_live_allowed`. Default resolution is `dry_run`; blocked/live behavior remains default unless explicit staging/production allow policy is supplied. `production_live_allowed` is never default and requires an explicit production allow flag.
- Provider call modes are fixture response, dry-run no external call, replay captured payload, staging live, production live, or blocked live. Fixture/dry-run/replay paths require provenance and response validation contracts and do not require live credentials.
- Policy foundation covers request quotas, provider rate-limit windows, capability cost budgets, cache hit/miss, request dedupe/coalescing by normalized request, circuit open/half-open/closed, and stale-if-error only when explicitly allowed.
- Unmanaged provider calls from reasoning, ingestion, admin, scheduled, or operator paths are prohibited. Direct adapters may exist only behind the Provider API Gate or as fixture/dry-run/replay descriptors.
- RC-H remains responsible for live-provider payload validation and staging smoke with real credentials. This document does not claim live provider readiness.
- RC-G database rehearsal remains required before relying on durable provider orchestration state beyond current memory/SQL repository contracts.

### RC-F adoption correction (2026-07-08)
- Provider API Gate foundation is now adopted by scheduled ingestion before fixture adapter persistence executes; scheduled replay uses the gate replay/captured-payload path and live staging/production requests remain blocked by default.
- Unmanaged provider-call inventory is executable and fails on runtime direct provider adapter execution outside the gate; direct adapters remain allowed only as fixture/provider-source implementations or tests.
- Live execution remains explicitly not implemented until RC-H (`live_execution_not_implemented_until_rc_h`) even when resolver policy can classify a theoretically live-allowed request.
- RC-G database rehearsal is still required before durable provider orchestration state can be treated as production-rehearsed.

## RC-H provider live-payload and schema validation

RC-H adds a staging-safe provider payload validation layer without enabling production provider activation by default. Provider execution remains constrained to the Provider API Gate; dry-run uses no external call, fixture mode uses adapter fixtures, replay mode validates captured payload metadata, and staging-live mode is opt-in only. Production-live activation remains blocked/not approved.

Validation states are distinguished as follows:
- **fixture validation**: local adapter fixture path only; no credentials and no third-party call.
- **replay validation**: captured-payload contract and schema checks against committed safe fixtures; CI-safe without credentials.
- **staging-live validation**: opt-in operator smoke only with `ELCEO_PROVIDER_STAGING_SMOKE=1`, credentials from environment only, Provider API Gate only, and redacted capture metadata.
- **production-live activation**: not approved by RC-H and still blocked.
- **credentials unavailable**: provider has an official/live-style adapter contract but cannot be claimed live validated without environment credentials.
- **provider manually reviewed**: manual/download provider requires human source review before live claims.
- **provider live validated**: reserved for future batches after real staging credentials and official payload contracts pass.
- **provider blocked**: descriptor-only, placeholder, or later-batch execution.

RC-H replay smoke validates captured payload metadata, pagination cursor fields, nullable/unknown-field policy, duplicate/revision/backfill markers, provider error bodies, rate-limit bodies, and secret redaction proof. Staging smoke refuses to run unless explicitly enabled and never prints secrets. No public production claims, entitlement policy, payment activation, notification sends, formulas, golden scenarios, migrations, or C6 phase numbering are changed by this batch.
