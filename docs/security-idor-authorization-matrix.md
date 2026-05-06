# Security S2 — IDOR and Authorization Matrix

## Scope and intent
This S2 batch documents representative route-runtime authorization checks for subject isolation, admin/internal gates, and mutation-security wiring. This matrix is not a substitute for external penetration testing.

## Route matrix
| Family | Representative routes | Gate type | Subject boundary expectation | Representative test coverage |
|---|---|---|---|---|
| Public/read-equivalent-safe | `/api/workspace/current`, `/api/analytics/latest` | Authenticated user for user data; no admin/internal token | Reads only own subject snapshots | Existing route-runtime success/unauthorized checks |
| User subject-scoped journal | `/api/journal/cases/[caseId]/plan`, `/api/journal/cases/[caseId]` | Authenticated subject + mutation security for POST | Cross-subject case access denied (`not_found` or `forbidden` pattern) | Added cross-subject lifecycle denial assertion on `plan` route |
| User subject-scoped portfolio | `/api/portfolio/watchlist/[entryId]`, `/api/portfolio/positions/[positionId]/open` | Authenticated subject + mutation security | Cross-subject watchlist/position mutation denied | Added cross-subject denial assertions for watchlist patch and position open |
| User subject-scoped notifications | `/api/notifications/targets/*`, `/api/notifications/subscriptions/[subscriptionId]`, verification issue/consume | Authenticated subject + mutation security | Cross-subject target/subscription updates denied by runtime ownership checks; verification routes require guarded context | Added cross-subject subscription update denial assertion (`sub-foreign` => `forbidden`) |
| Account/access | `/api/account/access-check`, `/api/account/access-decisions` | Authenticated subject | No cross-subject grants | Added cross-subject probe assertion: injected `subjectId` is ignored; resolved decision still binds to authenticated subject |
| Admin-gated | `/api/admin/billing/*`, `/api/admin/entitlements/*` | Internal token + admin feature gate | Non-admin/missing gate denied | Existing denial tests for missing token and blocked `admin.read`/`admin.ops` |
| Internal-token-gated | `/api/internal/billing/*`, `/api/internal/market-evidence/tiingo/fixture-ingest` | Internal token (+ admin.ops where required) | Public and non-internal calls denied | Confirmed missing-token denial assertions, plus fixture-ingest allowed-path assertion with `internal_mutation` action kind |
| Admin + internal market-evidence read | `/api/admin/market-evidence/payloads`, `/api/admin/market-evidence/weighted`, `/api/admin/seo/feed` | Internal token + `admin.read` | Public access denied | Existing forbidden tests without internal token |
| Scheduled-ingestion admin | `/api/admin/market-evidence/scheduled-ingestion/policies`, `.../dry-run` | Internal token + `admin.read`/`admin.ops`; POST uses mutation security | Public access denied; dry-run guarded and fixture-only | Existing GET/POST denial tests + assertion that dry-run uses `internal_mutation` action kind |

## Mutation security helper regression checks
Representative assertions validate mutation action-kind wiring:
- `journal_case_lifecycle`
- `portfolio_watchlist_write`
- `portfolio_position_write`
- `notification_target_write`
- `notification_subscription_write`
- `internal_mutation` for scheduled-ingestion dry-run and internal fixture ingest

## Deferred gaps
- Matrix is representative, not exhaustive per route permutation, and is not security certification.
- Some read routes rely on runtime-layer ownership filters; route-level explicit owner checks are not universally duplicated.
- External pentest + staging attack drill still required.

## Non-goals
- No UI changes
- No new product behavior
- No live provider API activation
- No replacement of S3 injection/input abuse testing or S6 attack drill

## Next phases
- **S3:** input abuse/injection adversarial tests.
- **S6:** staging attack drill and incident-response rehearsal.
