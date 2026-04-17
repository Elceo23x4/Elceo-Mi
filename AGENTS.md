
# AGENTS.md

## ELCEO repository guidance for Codex

This repository contains the ELCEO platform, a production-minded AI-powered market cognition web application.

You must treat this repository as a serious long-term product codebase, not as a prototype sandbox.

## What ELCEO is

ELCEO is:
- a real-time market cognition and decision-support platform
- a premium web experience for aspiring serious traders and experienced macro traders
- a depth-first launch product focused on Gold (XAU/USD), Nasdaq 100, S&P 500, DE30, BTC/USD, and selected USD pairs
- an event-driven system with deterministic calculations and explainable reasoning
- a web app with strong mobile responsiveness
- a dual-mode product with both dark and light themes
- a premium, cinematic, editorial, futuristic interface merged with a signature interaction language

ELCEO is not:
- a generic trading dashboard
- a buy/sell signal spam tool
- a template reskin
- a one-off landing page project
- a product where AI prose replaces real logic
- financial advice

## Non-negotiable engineering rules

1. Keep deterministic logic in code, not in vague prose.
2. Keep provider integrations behind adapters.
3. Keep raw provider payloads out of UI logic.
4. Use typed schemas and clear domain models.
5. Maintain admin governance and explainability.
6. Preserve the ELCEO product identity and do not regress to generic fintech UX.
7. Keep the design language coherent across the landing page and application shell.
8. Build with maintainability and extension in mind.
9. Do not hardcode secrets; use environment variables only.
10. Respect reduced-motion preferences while still preserving the signature interaction language.
11. Do not compress architecture boundaries for convenience.
12. If asked to scaffold a package or service boundary, create the explicit files and folders rather than collapsing them into a minimal placeholder structure.
13. Do not write lockfile-style content into package.json.
14. Root package.json must be a valid workspace manifest.
15. Do not move to the next slice until the current slice is explicitly approved.

## Required build approach

For any major task:
1. Read the relevant docs in `/docs`.
2. Return a plan before coding if the task is broad.
3. List the files to create or modify before major implementation.
4. Implement in coherent slices.
5. Keep tests updated for deterministic logic.
6. Explain assumptions clearly.
7. Preserve existing working code unless a refactor is explicitly required.

## Priority documents

Read these in `/docs` before major implementation work:
- elceo-master-prompt-v1.md
- elceo-master-prompt-v2.md
- elceo-execution-pack.md
- elceo-provider-pack.md
- elceo-math-checklist.md
- elceo-formula-sheet.md
- elceo-codex-run-sequence.md

## Product principles

- accuracy-first over speed-first in cognition updates
- event-native architecture
- layered explanation
- confidence-weighted hybrid reasoning
- moderate chart annotation density with filters
- zones rather than plain lines for key levels
- deterministic scoring for risk, confidence, contradiction, ranking, and key-level significance
- free plan plus premium plan entitlements
- strong disclaimers and terms acceptance
- role-based admin with super admin, analyst admin, and support admin

## Launch asset focus

Deep support at launch for:
- XAU/USD
- Nasdaq 100
- S&P 500
- DE30
- BTC/USD
- EUR/USD
- GBP/USD
- USD/JPY
- USD/CHF
- AUD/USD
- NZD/USD
- USD/CAD

Do not dilute launch depth by expanding asset breadth too early.

## When coding UI

- respect the premium editorial aesthetic
- support dark and light mode
- use soft red as the main color family and green as the accent
- preserve custom-styled layered typography
- keep motion authored and state-driven
- do not make every component look the same
- make the interface visually rich but still legible and performant
- keep the landing page and application shell as one unified brand language
- do not flatten the dashboard into a generic fintech terminal

## When coding motion

- motion must communicate system state where relevant
- confidence changes may affect stability, glow, and coherence
- contradiction may affect tension, distortion, or controlled flicker
- volatility may affect pacing and pulse
- implement reusable motion primitives and variants
- support reduced-motion properly, not as an afterthought

## When coding market logic

- use deterministic formulas first
- use AI for interpretation and explanation on top of normalized evidence
- preserve contradiction instead of forcing false consensus
- expose score breakdowns, not just opaque totals
- label horizons explicitly: intraday, swing, and where useful structural
- keep scoring and formula weights configurable where practical

## When coding providers

- keep providers domain-separated:
  - market
  - macro
  - news
  - geopolitics
  - extraction
  - context
- use explicit adapter names
- create composite adapters where fallback or reconciliation is needed
- do not leak provider-specific response shapes into the application layer
- normalize to internal schemas first

## When coding the domain calculation layer

- keep functions pure
- separate shared math utilities from business formulas
- add tests for each important rule family
- include edge-case handling
- keep formulas readable and documented
- do not bury calculations inside page components or provider adapters

## Admin and governance expectations

Admin is first-class, not optional.
Maintain support for:
- super admin
- analyst admin
- support admin

Preserve the ability to answer:
- why did ELCEO say this?
- which sources contributed?
- what confidence components were used?
- what contradiction signals were present?
- what changed over time?

## What to avoid

- giant unstructured files
- leaking provider-specific logic everywhere
- chatty code comments without useful information
- coupling UI directly to raw data sources
- placeholder architecture that cannot scale
- removing tests from the calculation layer
- skipping disclaimers, plan logic, or admin governance because they feel secondary
- using “good enough” generic scaffolding when explicit structure was requested
