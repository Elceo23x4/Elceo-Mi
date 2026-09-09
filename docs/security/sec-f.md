# SEC-F — residual security and runtime hardening

## Scope and finding closure

This batch maps **SEC-14** to the common recursive telemetry sanitizer, **SEC-15** to PostgreSQL RLS, **SEC-19** to a request-nonce CSP, **SEC-20** to deployed HTTPS validation, **SEC-21** to digest timing-safe internal authentication, and **SEC-22** to the canonical browser-mutation boundary. Before remediation, ordinary structured logs only redacted sensitive key names, application tables depended on repository predicates, production CSP allowed inline scripts, generic HTTP base URLs passed validation, internal tokens used ordinary equality, and no common Origin/Fetch-Metadata check covered API mutations.

SEC-G scale acceptance, SEC-H repository/release governance, provider activation, deployment setup, Sentry account setup, and staging/pre-production certification are intentionally deferred and were not performed.

## SEC-14 telemetry sinks

`@elceo/config` remains the ordinary application logging boundary. `captureError` sends sanitized messages/stacks through that logger and sends only allowlisted tags to Sentry. Server and browser Sentry SDKs retain the existing `beforeSend` privacy policies. Global browser errors continue through that configured SDK boundary. `sanitizeTelemetryString` removes credentials embedded in prose, headers, assignments, userinfo, URL query/fragment values, email addresses, and stack URLs; `sanitizeTelemetryValue` recursively handles sorted objects, arrays, Errors and cycles. Operational scope, category, subsystem, request ID, status, runtime, safe pathname, and sanitized stack location remain available.

## SEC-21 internal authentication

`requireInternalRouteAccess` fails closed for absent configuration or input and compares SHA-256 digests with `crypto.timingSafeEqual`. Fixed-length digests prevent length exceptions and neither input is logged. It returns the branded `VerifiedInternalPrincipal` only after verification.

## SEC-22 browser mutation policy and route coverage

Middleware invokes one server-only helper for POST, PUT, PATCH and DELETE under `/api`. `cross-site` is denied first. Exact parsed Origin is authoritative; `same-site` receives no sibling-domain trust. An absent Origin can be supported by browser-generated `same-origin` Fetch Metadata or an exact parsed Referer. No trustworthy evidence fails closed. GET/HEAD are unaffected. The trusted origin is server configuration (`APP_BASE_URL`, falling back to validated `NEXT_PUBLIC_APP_BASE_URL`), never Host forwarding data.

Every unsafe canonical API is therefore covered by middleware unless it belongs to an explicit exception class: NextAuth-owned semantics; independently verified billing/notification provider webhooks; internal-token/machine `/api/internal`, `/api/ops`, notification dispatch and admin control-plane routes; or unauthenticated password reset one-time-token flows. New APIs match middleware automatically and must deliberately enter the reviewed exception helper to opt out.

## SEC-19 CSP

Production middleware generates a fresh random nonce per request, supplies the CSP on the request so Next.js can apply it to framework scripts, and emits the same response policy. `script-src` is `'self' 'nonce-<request value>' 'strict-dynamic' https://cdn.onesignal.com` with no `unsafe-inline` or `unsafe-eval`. Styles use a nonce for style elements and narrowly retain `style-src-attr 'unsafe-inline'` for existing React inline style attributes. `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, and `form-action 'self'` remain. Workers are bounded to self/blob/OneSignal CDN, and connections to self/OneSignal API. Static asset paths bypass middleware; rendered pages are request-bound by nonce while immutable assets remain cacheable.

## SEC-20 HTTPS

`NEXT_PUBLIC_APP_BASE_URL`, optional server `APP_BASE_URL`, and optional `INTERNAL_API_BASE_URL` are parsed as absolute HTTP(S) URLs. For explicit staging or production identity, every configured application URL must use HTTPS; local HTTP remains accepted only for development/test. Example deployed environments use reserved `.invalid` HTTPS placeholders. Existing HSTS remains unchanged.

## SEC-15 tenant inventory and RLS architecture

The inventory classifies protected browser-owned data as follows:

| Tables | Ownership |
| --- | --- |
| `app_portfolio_watchlist_entries`, `app_portfolio_positions`, `app_portfolio_action_items`, `app_portfolio_snapshots` | direct `subject_kind` + `subject_id` |
| `app_journal_cases`, `app_journal_influence_snapshots` | direct `subject_kind` + `subject_id` |
| `app_notification_targets`, `app_notification_subscriptions`, `app_notification_verifications`, `app_notification_delivery_receipts` | direct `subject_kind` + `subject_id` |
| `app_notification_target_health`, `app_notification_inbox` | child ownership inherited through protected notification target |
| `app_notification_outbox` | direct tenant-owned delivery state; system delivery processing retains separate authority |
| `app_portfolio_revisions` | child ownership inherited through watchlist/position/action parent |
| `app_journal_case_revisions` | child ownership inherited through journal case parent |
| auth profile/credentials/sessions and legacy `user_id` application state | identity/auth subsystem, not exposed through the restricted tenant runtime role in this change |
| ingestion, market evidence, reasoning/cognition reference data, notification provider events and outbox attempts (system/provider processing only; attempts are not exposed by the tenant management facade), commercial/admin/audit/security controls | internal/admin/system authority, not tenant-runtime tables |

Migration `0058` enables RLS and adds `USING` plus `WITH CHECK` policies; corrective migration `0059` standardizes the setting as `elceo.tenant_subject_id`, and corrective migration `0060` protects directly owned receipts plus target health through its protected parent, and migration `0061` protects directly owned outbox rows plus inbox rows through their target parent. Missing tenant context makes every policy false. The user runtime requires a separate `TENANT_DATABASE_URL`. Both application-state and notification tenant transactions query PostgreSQL catalogs and fail closed if that principal is a superuser, has BYPASSRLS, or owns a protected table. They then set the transaction-local subject using the already verified server identity.

Browser portfolio and journal case/influence routes use `getTenantApplicationStateRuntime`; notification target/subscription/verification/push routes use `getTenantNotificationRuntimes`. Summary and health use explicit verified-subject `*ForSubject` feedback methods; the tenant feedback facade does not expose provider processing or global replay methods. The tenant management facade exposes only route-required subject operations; summary outbox reads use an explicit subject SQL predicate. Existing SEC-A owner predicates remain intact while the complete service method executes on a restricted connection. Provider webhooks, provider-event replay, dispatch/outbox-attempt processing, internal/admin and background execution retain explicit generic system composition. No browser route can select broader authority. Role credentials remain deployment secrets and are not stored here.

## Acceptance evidence

Exact-head CI run `34268709045` failed before reaching any RLS assertion because its seed statement referenced nonexistent `app_notification_targets.disabled_at` (`PostgreSQL 42703`). The closure removes that stale column from the fixture. The hostile rejected INSERT is also isolated behind a savepoint so its expected RLS error cannot poison the enclosing proof transaction.

`npm run test:sec-f` executes runtime adversarial telemetry, Sentry, token, CSRF and environment tests plus static CSP/RLS assertions. The sentinel is embedded in innocent strings, nested values and stack URLs and must not survive serialization. `npm run test:sec-f-postgres` creates an ephemeral NOSUPERUSER/NOBYPASSRLS login and runs two layers through it. Hostile raw SQL proves own access, foreign SELECT/UPDATE/DELETE and forged INSERT denial, child denial, and transaction reset. Actual `JournalCaseService`, `SqlJournalCaseRepository`, and notification SQL repository execution proves A/B reads, own writes, forgery and child denial, committed release, rollback, and failed-transaction isolation on the same pools. CI runs both commands after SEC-E and before the production build. This is repository acceptance evidence only, not live or staging certification.

The notification fixture gives A and B separate targets, health, critical receipts, reason values, and raw/normalized JSON sentinels. Application summary and health methods and predicate-free raw SQL each prove A-only/B-only visibility; forged receipt writes fail, and commit, rollback, and failed-transaction reuse cannot retain the previous subject.

Migration `0061` and its acceptance fixture prove direct outbox and parent-owned inbox RLS. A/B raw SQL, operational summaries, and `NotificationInboxManagementService` results exclude the opposite tenant sentinels, including after commit, rollback, deliberate failure, and pooled connection reuse.

## Browser notification secret boundary

The notification client gate scans browser-deliverable Next static chunks and source maps plus public JavaScript, manifests, and related assets. It deliberately excludes `.next/server` and middleware output, which are not browser bundles, while fixtures prove that a server-only `ONESIGNAL_REST_API_KEY` identifier is ignored and the same identifier or a secret sentinel in `.next/static` fails. CI removes `.next` before the sentinel build so output from the preceding production build cannot contaminate the result. `ONESIGNAL_APP_API_KEY` is consumed only by the server notification provider configuration; `ONESIGNAL_REST_API_KEY` exists only as a CI sentinel/scanner adversary; `NEXT_PUBLIC_ONESIGNAL_APP_ID` is the sole intentional public OneSignal setting. Provider webhook correlation values remain server-only.
