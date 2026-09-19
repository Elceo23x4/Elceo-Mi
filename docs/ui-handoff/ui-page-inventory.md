# ELCEO — Canonical UI Page & Surface Inventory

## 1. Purpose

This document defines the complete navigable UI, nested screens, drawers, dialogs, role-specific control surfaces, and system states required for ELCEO's frontend implementation against the frozen backend.

It complements:

- `docs/ui-handoff/frontend-integration-map.md`
- `docs/ui-handoff/ui-state-matrix.md`
- `docs/ui-handoff/auth-session-and-authorization.md`
- `docs/ui-handoff/billing-payment-state-machine.md`
- `docs/ui-handoff/notifications-ui-contract.md`
- `artifacts/ui-handoff/route-inventory.json`
- `artifacts/ui-handoff/openapi.json`

The backend remains authoritative. Creating a UI route does not authorize inventing missing backend behaviour.

## Repository architecture boundary

The production ELCEO UI is planned to be implemented in a **separate frontend repository** from this backend repository.

This file lives in `Elceo-Mi` because the frozen backend is the source of truth for API contracts, authorization boundaries, DTO semantics, state ownership, validation rules, billing/payment truth, notification behaviour, and server-owned cognition.

Accordingly:

- this inventory is a **handoff and implementation contract** for the separate UI repository;
- the route names below describe the intended frontend information architecture, not a requirement to add the full production UI into this backend repository;
- existing frontend/prototype routes currently present in `Elceo-Mi` remain useful implementation evidence, but they do not change the planned repository separation;
- backend semantics must not be changed merely to satisfy a frontend assumption;
- when the separate UI repository is created, this inventory and the rest of `docs/ui-handoff/` should be treated as the authoritative starting contract and synchronized deliberately.

### Status notation

| Status | Meaning |
|---|---|
| EXISTING | A corresponding frontend route already exists in the current repository and provides implementation/reference evidence. |
| CREATE | Required route/screen for the production UI architecture that is not currently represented as a dedicated page. |
| STATIC | Frontend/content surface requiring no new application API. |
| PARTIAL | Screen is valid, but one or more intended capabilities are not supported by the frozen backend and must remain unavailable. |
| OVERLAY | Drawer, sheet, modal, popover or other non-route application surface. |

---

# 2. Public / Marketing Surfaces

| ID | UI route | Page | Status | Backend / source mapping | Scope |
|---|---|---|---|---|---|
| PUB-01 | `/` | Landing / Home | EXISTING | No authenticated API dependency | ELCEO proposition, product positioning, CTA, product preview and navigation. |
| PUB-02 | `/pricing` | Pricing | EXISTING | Public presentation; authenticated upgrade action later uses account/billing contracts | Kick Off / Focus Plan presentation, capability comparison, CTA to signup/login/upgrade. |
| PUB-03 | `/about` | About ELCEO | CREATE / STATIC | None | Mission, cognition philosophy, methodology framing, what ELCEO is/is not. |
| PUB-04 | `/faq` | FAQ | CREATE / STATIC | None | Product, plan, data, billing, intelligence, account and risk questions. |
| PUB-05 | `/demo` | Product Demo | EXISTING | Must not imply unavailable production capabilities | Product experience / controlled demo. |
| PUB-06 | `/help` | Help & Support | CREATE / STATIC | No support-ticket API currently frozen | Help articles, onboarding guidance, contact/support direction. No fake ticket submission. |
| PUB-07 | `/legal/terms` | Terms of Service | CREATE / STATIC | Referenced by onboarding acknowledgement | Full terms accessible before acceptance. |
| PUB-08 | `/legal/privacy` | Privacy Policy | CREATE / STATIC | None | Privacy/data-processing disclosure. |
| PUB-09 | `/legal/risk-disclosure` | Market Intelligence / Risk Disclosure | CREATE / STATIC | Referenced by onboarding disclaimer acknowledgement | Explain decision-support status, limitations and no-guarantee/no-advice framing. |

The onboarding contract requires explicit `termsAccepted` and `disclaimerAccepted` state. Those acknowledgements should link to readable documents rather than existing only as checkbox copy.

---

# 3. Authentication & Account Entry

| ID | UI route | Page | Status | Frozen mapping | Required UX |
|---|---|---|---|---|---|
| AUTH-01 | `/login` | Login | EXISTING | Auth.js `/api/auth/{...nextauth}` | Google and/or credential login according to runtime availability; authenticating, failure and signed-in states. |
| AUTH-02 | `/signup` | Create Account | CREATE / PARTIAL | Auth.js Google sign-in can establish application identity; no frozen public credential-registration endpoint | Dedicated acquisition/signup UX. Google signup supported when configured. Email/password self-registration must not be invented. |
| AUTH-03 | `/forgot-password` | Forgot Password | EXISTING | `POST /api/auth/password-reset/request` | Email submission, neutral anti-enumeration success, unavailable state when credentials disabled. |
| AUTH-04 | `/reset-password` | Reset Password | EXISTING | Frozen password-reset completion flow | Token validation, new password, expired/invalid token, completion and return-to-login states. |
| AUTH-05 | `/onboarding` | First-Time Onboarding | EXISTING | `POST /api/account/onboarding` | Five stages: Welcome → Compliance → Assets → Plan → Complete. |
| AUTH-06 | — | Authentication Error State | OVERLAY / INLINE | Auth.js | Provider failure, credentials failure, expired session; normally rendered through login rather than a new permanent route. |
| AUTH-07 | — | Sign Out Confirmation | OVERLAY | Auth.js sign-out | Optional confirmation and secure session termination. |

The canonical Auth.js config fixes `/login` as the custom sign-in page and requires the standard server-owned Auth.js session lifecycle.

### Signup rule

`/signup` is required as a user-facing page, but it must distinguish **UI account acquisition** from **credential registration**.

Google authentication can establish a new ELCEO application-state user because successful identity sign-in ensures the application-state user exists. Credential authentication currently authenticates existing credentials. No public self-registration mutation is part of the frozen handoff contract.

Therefore:

- **Google signup: supported when configured.**
- **Email/password signup: contract gap until explicitly implemented and reviewed.**

The frontend must not create an independent credential store or registration semantics.

---

# 4. Primary Authenticated User Application

## 4.1 Dashboard / Market Cognition

| ID | Route | Screen | Status | Backend mapping | Main contents |
|---|---|---|---|---|---|
| APP-01 | `/dashboard` | Market Cognition Dashboard | EXISTING | `GET /api/dashboard/{asset}` | Chart, directional bias, confidence, evidence, annotations, zones, market context, cognition modules. |

Asset switching should remain within the dashboard, for example `/dashboard?asset=XAUUSD`, rather than creating one physical page per tradable asset.

The dashboard DTO is the principal intelligence UI contract. Directional bias, confidence, evidence decisions and other cognition remain server-owned.

### Dashboard embedded surfaces

These are components or drawers, not standalone pages:

- Asset selector.
- Directional Bias panel.
- Confidence Context panel/drawer.
- Confidence Anatomy detail.
- Evidence Stack.
- Evidence item detail.
- Contradiction/tension state.
- H4 zone detail.
- Chart annotation detail.
- Market regime.
- Macro headlines.
- Coaching insight preview.
- Freshness indicator.
- Entitlement/paywall state.
- Data unavailable/degraded state.

---

# 5. Workspace

The frozen backend exposes current workspace, agenda, freshness, history and refresh contracts, although no corresponding top-level frontend page currently exists.

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| WKS-01 | `/workspace` | Workspace Overview | CREATE | `GET /api/workspace/current`, freshness projection |
| WKS-02 | `/workspace/agenda` | Market Agenda | CREATE | `GET /api/workspace/agenda` |
| WKS-03 | `/workspace/history` | Workspace History | CREATE | `GET /api/workspace/history` |
| WKS-04 | — | Workspace Freshness Detail | OVERLAY | `GET /api/workspace/freshness` |
| WKS-05 | — | Workspace Refresh Progress | OVERLAY | `POST /api/workspace/refresh` |

No `/workspace/freshness` page is necessary initially. Freshness is operational context for the workspace, not a separate product destination.

---

# 6. Journal

The frozen backend includes cases, entries, journal analytics and influence/deep-generation surfaces.

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| JRN-01 | `/journal` | Journal Overview / Cases | EXISTING | `GET /api/journal/cases` |
| JRN-02 | `/journal/new` | Create Journal Case | CREATE | `POST /api/journal/cases` |
| JRN-03 | `/journal/[caseId]` | Journal Case Detail | CREATE | Case-scoped journal read contract |
| JRN-04 | `/journal/analytics` | Journal Analytics | CREATE | `/api/journal/analytics/**` |
| JRN-05 | `/journal/influence` | Journal Influence / Deep Analysis | CREATE | `GET /api/journal/influence/latest`, `POST /api/journal/influence/generate` |

### Journal case-detail actions

These should be lifecycle dialogs/sheets inside `/journal/[caseId]`, not individual pages:

- Plan.
- Execute.
- Adjust.
- Partial close.
- Close.
- Cancel.
- Review.
- Add/view entries.
- Generate/review influence.
- Conflict/invalid-transition handling.
- Replay/idempotency state.

---

# 7. Portfolio

The frozen portfolio surface contains watchlist, positions, action queue, snapshot, attention and entity replay.

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| PTF-01 | `/portfolio` | Portfolio Overview | EXISTING | `/api/portfolio/snapshot`, `/api/portfolio/attention` |
| PTF-02 | `/portfolio/watchlist` | Portfolio Watchlist | CREATE | `/api/portfolio/watchlist/**` |
| PTF-03 | `/portfolio/positions` | Positions | CREATE | `/api/portfolio/positions/**` |
| PTF-04 | `/portfolio/actions` | Action Queue | CREATE | `/api/portfolio/actions/**` |

### Portfolio overlays

- Add/edit watchlist item.
- Add/edit position.
- Position lifecycle action.
- Action-item detail/edit.
- Attention item detail.
- Snapshot detail.
- Entity history/replay drawer.

Entity replay is owner-scoped and supports watchlist entries, positions and action items. It should be a reusable history drawer rather than three duplicated pages.

---

# 8. Analytics

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| ANL-01 | `/analytics` | Trading / Behaviour Analytics | EXISTING | `GET /api/analytics/latest`, `POST /api/analytics/generate`, `/top-behaviors`, `/top-setups` |

The screen should contain:

- Latest analytics snapshot.
- Top behaviours.
- Top setups.
- Generate/refresh analysis action.
- Empty/new-user state.
- Generation-in-progress state.
- Premium/entitlement block.
- Degraded generation state.

---

# 9. Coaching

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| COA-01 | `/coaching` | Coaching Workspace | CREATE | `/api/coaching/latest`, `/generate`, `/focus`, `/action-plan` |

The page should include:

- Latest coaching snapshot.
- Current focus.
- Action plan.
- Generate/update coaching.
- Empty/new-user state.
- Premium access state.
- Degraded/generation failure state.

No separate `/coaching/focus` or `/coaching/action-plan` page is necessary initially; they belong to the same coaching workflow.

---

# 10. Notifications

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| NTF-01 | `/notifications` | Notification Centre / Inbox | CREATE | `GET /api/notifications/summary`, `GET /api/notifications/inbox` |

The page owns:

- Inbox.
- Unread count.
- Management summary.
- Feedback summary.
- Empty inbox.
- Pagination/end state.
- Notification health/degraded indicator.

The server, not the browser, owns unread totals and canonical inbox state.

Delivery targets, subscriptions and verification belong under **Settings → Notifications**, not in the inbox page.

---

# 11. Account / Settings Architecture

The current `/settings` implementation mixes motion controls, notification preferences and billing in one page. The production information architecture should separate these concerns while continuing to use the frozen contracts.

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| SET-01 | `/settings` | Settings Hub | EXISTING / RESTRUCTURE | Aggregated navigation/status |
| SET-02 | `/settings/profile` | Profile & Identity | CREATE | Auth.js session + account state + `/api/account/profile/social-identifiers` |
| SET-03 | `/settings/assets` | Tracked Markets / Asset Preferences | CREATE | `/api/account/watchlist` |
| SET-04 | `/settings/preferences` | Appearance & Experience | CREATE | `/api/account/preferences` |
| SET-05 | `/settings/notifications` | Notification Preferences & Delivery | CREATE | notification targets, subscriptions, verification, health + account preferences where applicable |
| SET-06 | `/settings/billing` | Plan & Billing | CREATE | `/api/account/billing`, account billing events/policy state, `/api/billing/intention`, checkout, portal |
| SET-07 | `/settings/access` | Plan Access, Entitlements & Usage | CREATE | `/api/account/entitlements`, `/usage`, `/access-decisions`, `/access-check` |
| SET-08 | `/settings/security` | Account Security | CREATE / PARTIAL | Auth.js session + password recovery entry points; see contract limitation below |

## Profile page

`/settings/profile` should expose:

- Name — server/session supplied.
- Email — server/session supplied.
- Account/user ID only where appropriate.
- Role.
- Plan.
- Onboarding status.
- Social identifiers.
- Sign-out.
- Navigation to security/billing/access settings.

The dedicated frozen profile mutation family currently covers social identifiers. The frontend must not invent editable name, email, avatar or arbitrary profile fields until an authoritative mutation contract exists.

## Asset preferences

This page manages the user's tracked launch-market selection after onboarding.

It must remain distinct from **Portfolio Watchlist**:

- account watchlist = product/market tracking preference;
- portfolio watchlist = portfolio intelligence entity collection.

Do not merge the two client-side merely because both use the word `watchlist`.

## Notification settings

`/settings/notifications` maps user-controlled notification infrastructure:

- in-app/email/browser-push preference;
- alert classes;
- targets;
- target creation;
- target enable/disable;
- verification challenge;
- subscriptions;
- minimum priority;
- minimum materiality;
- channel health/degraded state.

The backend distinguishes configured target, verified target, subscription state and provider delivery health; the UI must preserve those distinctions.

## Billing settings

`/settings/billing` is the canonical checkout-return/reconciliation destination.

It should show:

- current plan;
- account state;
- subscription state;
- start/end/trial dates;
- cancel-at-period-end status;
- upgrade CTA;
- billing portal;
- current/persisted payment intention;
- processing;
- failed;
- unknown;
- reconciliation-required;
- succeeded-but-entitlement-not-yet-confirmed states.

A provider redirect or browser `success` callback must never directly unlock Focus Plan.

A separate `/billing/success` page is unnecessary and potentially misleading. Return to `/settings/billing`, re-read canonical state, and render server truth.

## Security settings limitation

A security page is desirable, but the frozen backend does not currently establish a complete user account-security management contract for:

- changing an authenticated user's password directly;
- MFA configuration;
- enumerating active sessions;
- terminating other sessions;
- changing account email.

The existing password-reset flow is valid. Unsupported controls must not be rendered as functional actions.

---

# 12. Global Profile Drawer

| ID | Surface | Type | Mapping |
|---|---|---|---|
| OVL-01 | Profile / Account Drawer | OVERLAY | Auth.js session + account entitlements/billing/state |

Opened from the user avatar/name in the application shell.

It should show:

- Avatar/initial presentation.
- Name.
- Email.
- Plan.
- Account state.
- Role where appropriate.
- Onboarding completion state.
- Tracked-market count.
- Quick link: Profile.
- Quick link: Billing.
- Quick link: Notifications.
- Quick link: Settings.
- Admin Console link only when server-derived role permits.
- Sign out.

It is a summary/launcher, not a replacement for `/settings/profile`.

The browser must not infer or fabricate identity, role or plan authority. Those remain server/session-derived.

---

# 13. Other Global Application Drawers / Modals

| ID | Surface | Backend mapping | Purpose |
|---|---|---|---|
| OVL-02 | Notification Popover | `/api/notifications/summary`, inbox preview | Header bell/unread indicator. |
| OVL-03 | Asset Selector | `/api/account/watchlist` + dashboard asset GET | Change dashboard market context. |
| OVL-04 | Evidence Detail Drawer | Dashboard-projected evidence | Inspect evidence without recalculating it. |
| OVL-05 | Confidence Detail Drawer | Dashboard cognition projection | Confidence anatomy/cautions. |
| OVL-06 | Freshness / Refresh Drawer | `/api/refresh/latest`, `/freshness`, `/history`, `/run` | Global data freshness and explicit refresh lifecycle. |
| OVL-07 | Paywall / Entitlement Drawer | Account entitlements/access decisions | Explain blocked premium capability and route to pricing/billing. |
| OVL-08 | Journal Lifecycle Dialog | Journal case mutation routes | Plan/execute/adjust/close/etc. |
| OVL-09 | Portfolio Entity Replay Drawer | `/api/portfolio/replay` | Entity event/history replay. |
| OVL-10 | Notification Target Dialog | targets/subscriptions | Add/edit delivery destination. |
| OVL-11 | Notification Verification Dialog | verification issue/consume | Challenge/verification lifecycle. |
| OVL-12 | Checkout / Payment Processing State | billing APIs | Processing/unknown/reconciling/failed states. |
| OVL-13 | Admin Step-Up Challenge | admin security step-up family | High-risk super-admin mutations. |
| OVL-14 | Session Expired | Auth.js / 401 | Explain expiry and redirect to login. |
| OVL-15 | Conflict / Safe-Retry Dialog | mutation/security/idempotency contract | Prevent duplicate writes on ambiguous network result. |
| OVL-16 | Degraded-Service Banner | server-provided readiness/503 states | Preserve honest degraded-state UX. |

The generic refresh family exposes latest, freshness, history and run contracts, so refresh belongs in a reusable operational surface rather than being hidden behind arbitrary page reloads.

---

# 14. Admin Control Plane

The current frontend contains only a limited admin route, while the frozen backend contains a broader admin control plane covering audit, billing, commercial, entitlements, freshness, market evidence, operations, providers, security step-up, SEO and system summary.

Every browser-based admin page must use trusted server-side mediation for routes requiring `x-elceo-internal-token`. The token must never enter browser JavaScript.

## 14.1 Admin Operations

| ID | Route | Admin page | Status | Backend mapping |
|---|---|---|---|---|
| ADM-01 | `/admin` | Admin Overview | EXISTING / REBUILD | `/api/admin/system-summary` |
| ADM-02 | `/admin/freshness` | Data Freshness | CREATE | `/api/admin/freshness` |
| ADM-03 | `/admin/operations` | Runtime / Operations | CREATE | `/api/admin/ops` |
| ADM-04 | `/admin/providers` | Provider Capability / Health | CREATE | `/api/admin/providers` |
| ADM-05 | `/admin/audit` | Audit Timeline | CREATE | `/api/admin/audit` |

---

# 15. Admin Billing

| ID | Route | Page | Status | Backend mapping |
|---|---|---|---|---|
| ABL-01 | `/admin/billing` | Billing Control Overview | CREATE | Aggregated admin billing surfaces |
| ABL-02 | `/admin/billing/operations` | Payment Operations | CREATE | summary, failures, retry candidates, subject snapshots |
| ABL-03 | `/admin/billing/orchestration` | Billing Orchestration | CREATE | latest/runs/subject orchestration |
| ABL-04 | `/admin/billing/policy` | Billing Policy / Transition History | CREATE | admin policy read surfaces |
| ABL-05 | `/admin/billing/provider-events` | Provider Event Inspection | CREATE | provider-event admin routes |
| ABL-06 | `/admin/billing/provider-mappings` | Provider Plan Mapping | CREATE | provider plan mappings |

High-risk billing mutations such as activate, renew, change plan, past-due, cancel-at-period-end, expire, pause and resume are actions/dialogs on the relevant subject/billing detail, not extra navigation pages.

---

# 16. Admin Entitlements & Commercial Management

| ID | Route | Page | Status | Mapping |
|---|---|---|---|---|
| ACM-01 | `/admin/entitlements` | Entitlement Operations | CREATE | `/api/admin/entitlements/**` |
| ACM-02 | `/admin/commercial` | Commercial Overview / Metrics | CREATE | `/api/admin/commercial/metrics` |
| ACM-03 | `/admin/commercial/prices` | Commercial Prices | CREATE | `/api/admin/commercial/prices` |
| ACM-04 | `/admin/commercial/users` | Commercial User Search/List | CREATE | `/api/admin/commercial/users/**` |
| ACM-05 | `/admin/commercial/users/[userId]` | User Commercial Control | CREATE | user commercial read/mutations + super-admin step-up |

High-risk commercial writes must trigger the server-defined step-up challenge lifecycle, not a frontend-only confirmation dialog.

---

# 17. Admin Market Evidence

The evidence admin backend exposes cognition, inspection, payloads, payload replay, provider request/response, quality, reasoning input, scheduled ingestion and weighted evidence views.

| ID | Route | Page | Status | Primary mapping |
|---|---|---|---|---|
| AME-01 | `/admin/market-evidence` | Evidence Operations Overview | CREATE | Aggregate market-evidence admin reads |
| AME-02 | `/admin/market-evidence/payloads` | Evidence Payload Explorer | CREATE | payloads + provider request/response |
| AME-03 | `/admin/market-evidence/quality` | Evidence Quality | CREATE | quality + weighted evidence |
| AME-04 | `/admin/market-evidence/cognition` | Cognition Inspection | CREATE | cognition + reasoning-input |
| AME-05 | `/admin/market-evidence/inspection` | Operator Inspection | CREATE | inspection route |
| AME-06 | `/admin/market-evidence/scheduled-ingestion` | Scheduled Ingestion | CREATE | policies, runs, dry-run/replay where authorized |

### Evidence detail overlays

The following should normally appear as secondary tabs/drawers rather than additional first-class navigation:

- Provider request.
- Provider response.
- Normalized payload.
- Payload replay.
- Weighted evidence.
- Reasoning input.
- Evidence lineage.

---

# 18. Admin SEO

| ID | Route | Page | Status | Mapping |
|---|---|---|---|---|
| SEO-01 | `/admin/seo` | SEO Feed / Sitemap Administration | CREATE | `/api/admin/seo/**` |

This is an admin inspection/control page. It does not authorize manufacturing public SEO content routes that are outside the frozen handoff contract.

---

# 19. System / Framework Screens

These are mandatory parts of the product experience even though they are not business pages.

| ID | Surface | Status | Purpose |
|---|---|---|---|
| SYS-01 | `not-found` / 404 | EXISTING | Unknown URL/resource experience. |
| SYS-02 | Global error boundary | EXISTING | Unexpected application failure boundary. |
| SYS-03 | Route/page loading states | CREATE/POLISH | Skeleton states appropriate to each surface. |
| SYS-04 | Unauthorized state | GLOBAL | 401 → authentication flow. |
| SYS-05 | Forbidden/entitlement-denied state | GLOBAL | Distinguish authentication from authorization/plan denial. |
| SYS-06 | 429 rate-limit state | GLOBAL | Backoff/retry guidance. |
| SYS-07 | 503/dependency-unavailable state | GLOBAL | Honest degraded/unavailable presentation. |
| SYS-08 | Offline/network-loss state | GLOBAL | Preserve ambiguous-write safety. |
| SYS-09 | Empty-state framework | GLOBAL | First-use/no-data handling per domain. |
| SYS-10 | Stale/degraded-data state | GLOBAL | Do not present stale intelligence as current. |

---

# 20. Deliberate Contract Gaps — Do Not Fake in UI

A complete inventory must identify what cannot currently be made functional without expanding the frozen backend contract.

| Desired UI capability | Current status | Rule |
|---|---|---|
| Email/password self-registration on `/signup` | No frozen public registration contract identified | Google account creation may be used; credential signup requires explicit backend contract review. |
| Edit account email | Not represented by frozen profile contract | Do not add functional edit control. |
| Edit generic display name | Not represented by a dedicated profile mutation | Keep server/session identity read-only unless contract is proven. |
| Avatar upload/change | No frozen account-profile media contract identified | Use presentation fallback/initials until supported. |
| Authenticated password change | Only recovery/reset flow is currently established | Do not pretend reset and authenticated change are the same operation. |
| MFA / 2FA setup | No frozen user MFA contract identified | Do not create fake setup flow. |
| Active-session/device management | No frozen user session-management API identified | Do not display invented session data. |
| Log out all devices | No frozen corresponding contract identified | Do not expose. |
| Account deletion | No frozen deletion contract identified | Requires explicit product/backend decision. |
| User data export | No frozen export contract identified | Requires explicit contract if desired. |
| Support-ticket submission | No support-ticket application API identified | `/help` may remain informational/contact-based. |

These are documented gaps, not permission to expand the frozen backend automatically.

When a screen needs data or mutation semantics not represented by the frozen contract, record the missing contract rather than inventing client-owned behaviour.

---

# 21. Canonical Main Navigation

The authenticated ordinary-user shell should expose primary navigation around:

**Dashboard → Workspace → Journal → Portfolio → Analytics → Coaching**

Notifications should be globally accessible from the header/bell and also through `/notifications`.

Settings/Profile should be accessed through the profile/account area rather than occupying primary analytical navigation.

Administration should appear only for server-authorized admin roles.

---

# 22. Settings Navigation

Settings navigation should be:

**Profile → Tracked Markets → Preferences → Notifications → Plan & Billing → Access & Usage → Security**

This avoids placing interface motion, notifications and billing into one undifferentiated settings surface.

---

# 23. Admin Navigation

Admin navigation should be organized as:

**Overview → Freshness → Operations → Providers → Audit → Billing → Entitlements → Commercial → Market Evidence → SEO**

Security step-up is a contextual protected workflow, not a permanent navigation destination.

---

# 24. Page/Surface Scope Summary

The target UI architecture contains:

- **9 public/marketing pages**;
- **5 navigable authentication/onboarding pages**;
- **16 core authenticated product pages**;
- **8 account/settings pages**;
- **24 admin/control-plane pages**;
- **16 reusable global overlays/dialogs**;
- **10 system/error/state experiences**.

Not every backend endpoint becomes its own page.

A backend route becomes:

1. a page when it represents a durable user task or destination;
2. a tab/section when it belongs to a larger domain workflow;
3. a drawer/modal when it is contextual/detail/action-oriented;
4. no browser UI at all when it is server-internal/provider-webhook infrastructure.

This distinction is required to avoid both missing functionality and creating a bloated one-endpoint-one-page frontend.

---

# 25. UI Implementation Constraint

Every page must be mapped before implementation to:

- route/path;
- role/access boundary;
- backend read contracts;
- backend mutation contracts;
- server-owned DTOs;
- required loading state;
- empty state;
- success state;
- degraded/stale state;
- unauthorized/forbidden state;
- validation/conflict state where applicable;
- idempotency/retry behaviour where applicable;
- responsive/mobile representation;
- associated drawers/modals;
- entitlement behaviour.

No page may recompute ELCEO intelligence, fabricate entitlement/payment success, expose internal tokens, or create substitute client-owned business truth.

## Separate-repository implementation rule

When the production UI repository is created:

1. copy/reference this inventory and the frozen handoff package before implementation begins;
2. keep backend endpoint semantics, DTO ownership and authorization rules sourced from `Elceo-Mi`;
3. record the backend freeze commit/tree used by the UI build;
4. do not duplicate backend cognition or authorization logic into the frontend repository;
5. use a trusted server/BFF layer in the frontend repository for admin capabilities that require server-held secrets or the internal token;
6. treat any required backend change discovered during UI implementation as an explicit contract-change request to `Elceo-Mi`, not an implicit frontend workaround;
7. maintain a synchronization record when a later backend freeze supersedes this handoff.
