# ELCEO Frontend Rules

## Product identity
ELCEO is a premium market-cognition operating system.
Never design it like a generic SaaS product, generic fintech site, or generic dashboard.

The UI must feel:
- premium
- editorial
- futuristic
- cinematic
- technical
- high-budget
- authored

The UI must not feel:
- templated
- repetitive
- card-grid dependent
- over-pillified
- generic startup
- generic dark theme

## Execution rule
For major UI work, redesign one scene only per batch unless explicitly told otherwise.

Examples:
- header only
- hero only
- mechanism section only
- chart showcase only
- footer only

Do not redesign the whole homepage in one batch.

## Required batch checklist
Every UI batch must include:
1. exact file targets
2. exact route affected
3. visible proof marker
4. strict acceptance criteria
5. npm install
6. npm run -w apps/web lint
7. npm run -w apps/web build

## Proof marker rule
Every major visual batch must include one obvious visible proof marker so deployment can be verified immediately.

## Layout rules
Use:
- strong hierarchy
- asymmetry
- varied scale
- intentional whitespace
- few focal objects
- premium restraint

Avoid:
- equal rows of similar cards
- repeated dark rounded boxes
- too many controls in one band
- generic nav bars
- generic hero layouts

## Header rules
The public homepage header must feel like a single premium floating object.
It must not feel like a row of pills in a rounded container.
Keep utility controls minimal.
Centered composition is preferred when instructed.

## Typography rules
Use 3 roles:
1. hero display
2. section display
3. interface/content

Do not collapse all text into one generic treatment.

## Motion rules
Motion must feel authored, not templated.
Avoid repeating one fade-up everywhere.
Use calm/stable/tense motion differences where relevant.
Honor reduced-motion support.

## Route discipline
When asked to redesign a route, update the actual rendered files for that route.
Do not modify unused or adjacent components and present that as complete.

## Reporting format
After each batch, report only:
1. updated file tree
2. files changed
3. exact route affected
4. what changed
5. proof marker used
6. validation results
7. remaining risks
