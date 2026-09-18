# UI Handoff Contract Gaps / Explicit Limits

This register exists to prevent documentation limits from being mistaken for backend defects or silently filled with assumptions.

## 1. OpenAPI field expansion is intentionally conservative

The generated OpenAPI contract exhaustively covers frozen route paths/methods and attaches route policy, auth, entitlement, idempotency, source provenance, discovered query parameters, explicit statuses and referenced validators/types.

It does **not** attempt to convert every TypeScript validator/type into a fully expanded JSON Schema when that mapping cannot be proven mechanically without creating a second schema system.

Where field-level constraints cannot be proven, the operation uses a generic object plus `x-elceo-validators` / source references and states the constraint is unspecified.

This is a handoff-documentation limitation, not evidence that the runtime accepts arbitrary fields. `@elceo/schemas` remains authoritative.

## 2. Auth.js cookie name can be deployment-prefixed

The frozen config proves JWT-session behavior, max/update ages and Auth.js ownership. Auth.js can apply secure cookie prefixes in deployed environments. Browser code should use Auth.js rather than manually constructing a cookie name.

The OpenAPI security scheme names the conventional Auth.js session cookie for tooling purposes and documents the possible deployment prefix.

## 3. Admin UI requires trusted server mediation

Many `/api/admin/**` operations require `x-elceo-internal-token` in addition to admin permission. They are therefore not safe for direct client-side fetch with the secret.

The backend is not being changed in this freeze/handoff PR. UI implementation should use trusted server-side mediation when an admin console is built.

## 4. Deployment/provider activation remains separate

Some payment/provider routes are structurally implemented but deliberately blocked/degraded until environment credentials, provider entitlement/capability, licensing/legal checks, staging verification or production certification are satisfied.

The handoff documents those states; it does not convert them to live readiness.

## 5. Historical C6-A10 mocks are not current authority

`services/reasoning/src/frontend-contracts/index.ts` and `docs/frontend-contracts-and-mock-payloads.md` preserve an earlier fixture-era UI-planning layer. That material includes assumptions that were subsequently superseded by completed journal/portfolio/backend work.

Those files are preserved for history. New UI work must use this final handoff and the frozen runtime contracts instead.

## 6. Specialized response envelopes exist

Most application routes use the canonical `{ok:true,data}` / `{ok:false,error}` envelope. Auth.js owns its own framework response behavior, and a small number of specialized handlers (notably dashboard and checkout/payment paths) use dedicated JSON/view-model contracts.

The generated route inventory marks response-contract style rather than falsely normalizing every route to the generic envelope.

## 7. No frontend-generated cognition fallback

If a server-owned intelligence field is unavailable/degraded, there is intentionally no browser fallback formula for directional bias, confidence, contradiction, evidence sufficiency or FX relative pressure.

That is a product/architecture guarantee, not a missing UI helper.

## 8. External production certification is outside this handoff

The handoff does not claim completion of external penetration testing, provider commercial certification, licensing approval, production secrets, live webhook registration or payment account approval where those depend on deployment/external systems.

Those concerns should be tracked in deployment/preproduction readiness without reopening frozen backend semantics unless an objective defect is exposed.
