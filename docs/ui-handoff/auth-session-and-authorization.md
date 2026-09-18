# Authentication, Session and Authorization Handoff

## Authentication stack

The frozen web application uses Auth.js / NextAuth.

`apps/web/lib/auth/config.ts` defines:

- `session.strategy = 'jwt'`;
- session `maxAge = 7 days`;
- session `updateAge = 6 hours`;
- Google provider only when `AUTH_GOOGLE_CLIENT_ID` and `AUTH_GOOGLE_CLIENT_SECRET` are configured;
- credential provider only when credential activation prerequisites resolve enabled and Redis-backed authentication runtime is available;
- production requires `AUTH_SECRET`;
- custom sign-in page: `/login`.

Credential authorization rejects missing email/password and rejects passwords whose NFC-normalized code-point length exceeds 256 before authentication service execution.

The UI must use the Auth.js flow. It must not create its own access-token/session model in parallel.

## Session claims and subject derivation

After sign-in, the server ensures an application-state user exists. The JWT callback writes application profile identity into server-managed token claims. The session callback exposes the server-derived user ID, role, plan tier and onboarding timestamp.

Application-facing routes do not trust a caller-supplied subject identity.

`requireAuthenticatedSubject()` resolves the Auth.js session and returns:

```text
{ subjectKind: 'user', subjectId: userId, userId }
```

If no server-resolved session user ID exists, the route raises `unauthorized`.

**UI rule:** never send a `subjectId` to ordinary owner-scoped routes as a way to choose whose data to access. Ownership comes from the authenticated session.

## Login / session lifecycle

The browser may participate in Auth.js sign-in/sign-out and present the Auth.js-managed cookie automatically. Browser code must not parse a JWT and treat the resulting claims as authorization truth.

A locally cached role or plan may be used for presentation only. Before a protected action, the server's route/entitlement decision is authoritative.

When a session expires or the server returns `401 unauthorized`, route the user through the normal authentication flow. Do not retry the protected API in a tight loop.

## Commercial authorization order

Route authorization can include several independent layers:

1. valid authenticated subject;
2. owner/target-user boundary;
3. feature permission (`requireFeatureAccess` where used);
4. commercial entitlement (`guardRouteCommercialEntitlement` where used);
5. mutation security decision (rate-limit/idempotency/replay where used);
6. super-admin step-up for designated high-risk operations;
7. runtime/deployment readiness for live provider/payment paths.

A client-visible plan label is not sufficient to skip these server checks.

## Internal-token boundary

Internal/admin/ops routes can require the header:

`x-elceo-internal-token`

The server compares the supplied token against `ELCEO_INTERNAL_API_TOKEN` using fixed-length SHA-256 digests and timing-safe comparison.

This token is **NEVER a browser credential**.

Where a future admin UI needs capabilities that currently require the internal token, the browser must call trusted server-side UI/BFF code that injects the secret. Do not place the token in:

- JavaScript bundles;
- browser environment variables;
- local/session storage;
- cookies readable by client JavaScript;
- frontend network configuration;
- mock payloads or analytics.

The generated route inventory marks these operations `browserSafe:false` and gives them an admin/server or internal audience.

## Admin and super-admin

Admin routes are not equivalent to ordinary authenticated routes. The canonical route-policy inventory records `admin.read`, `admin.ops` or `super_admin` authority as appropriate, in addition to the internal-token boundary.

High-risk commercial controls under the super-admin user-control family require step-up verification. The frozen API exposes dedicated step-up challenge/readiness/verify routes. The UI must follow that server-defined challenge lifecycle; it must not treat a modal confirmation or local PIN as equivalent to step-up verification.

Do not cache successful step-up indefinitely. The backend decides whether a challenge is valid for the requested operation.

## Idempotency and authorization

Protected mutations can require an `Idempotency-Key` and pass through `requireSecurityDecision`. Authorization success does not mean the mutation should be submitted repeatedly.

For one logical action:

- create one idempotency key;
- reuse that key for transport retries of the same action/body;
- do not reuse it for a different action;
- if the outcome is ambiguous, reconcile against server state before creating a fresh mutation.

The server may replay a stored success envelope/status when safe.

## Browser storage

Reasonable browser-owned state includes presentation preferences, ephemeral form state and safe cached server DTOs.

Never treat the following as client authority:

- authenticated identity;
- role/admin status;
- plan/entitlement decision;
- subject ownership;
- step-up validity;
- internal token;
- payment/provider identity;
- evidence or cognition authority.

## Route-specific authority

Use `artifacts/ui-handoff/route-inventory.json` for the exhaustive route list. For each operation it records the canonical classification, owner/target boundary, internal token, admin permission, step-up, idempotency, runtime expectation, UI audience and browser-safety classification derived from the frozen route inventory.
