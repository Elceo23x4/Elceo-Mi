# Security S3 — Injection and Input Abuse Hardening Matrix

This matrix captures representative S3 route-runtime coverage for injection/input-abuse resilience. It is **not** a replacement for DAST, structured fuzzing, or external penetration testing.

| Route family | Input-abuse class | Representative endpoint | Expected envelope | Notes / deferred gaps |
|---|---|---|---|---|
| Market evidence admin queries | SQL-style query injection, enum fuzzing, limit abuse | `GET /api/admin/market-evidence/payloads` | `validation_error` on invalid enum/limit | Representative only; does not cover every query permutation |
| Scheduled-ingestion admin queries | runId injection probes, capability/status enum abuse | `GET /api/admin/market-evidence/scheduled-ingestion/runs` | `validation_error` or safe null path with `ok:true` | Full fuzzing of all filter combinations deferred |
| SEO feed admin query | slug traversal and invalid page kind | `GET /api/admin/seo/feed` | `validation_error` for invalid slug/pageKind | No filesystem access behavior exists in route surface |
| Scheduled-ingestion dry-run body | malformed JSON, forbidden override fields, SQL-style jobId payload | `POST /api/admin/market-evidence/scheduled-ingestion/dry-run` | `bad_request` for invalid JSON; `validation_error` for body policy violations | Route policy intentionally rejects `runMode`, `production_live`, provider API key fields |
| Internal fixture-ingest body | malformed JSON and invalid asset payload | `POST /api/internal/market-evidence/tiingo/fixture-ingest` | `bad_request` for invalid JSON; `validation_error` for invalid asset | Fixture-only ingest retained; no live provider activation |
| Error boundary/redaction | stack trace and secret leakage prevention | Representative failing admin route | `internal_error` generic envelope only | Redaction tested for SQL text, stack frames, token-like strings |

## Scope statement
S3 provides representative hardening coverage to prevent common injection/input-abuse regressions in deterministic route-runtime checks. It does **not** claim full adversarial coverage or security certification.

## Required follow-up phases
- **S4**: Supply-chain and CI hardening follow-through.
- **S5**: Infrastructure/edge/WAF policy hardening.
- **S6**: Staging attack drill and incident-response rehearsal.
