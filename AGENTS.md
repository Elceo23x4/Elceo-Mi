# ELCEO Frontend Execution Rules

## Mission
ELCEO is not a generic SaaS product.
It is a premium market-cognition operating system.
All frontend work must feel authored, high-budget, technically serious, and visually distinctive.

## Non-negotiable product feel
Every public and private surface must feel:
- premium
- editorial
- futuristic
- technical
- cinematic
- intentionally interactive
- luxury-grade but restrained

Never produce:
- generic SaaS layouts
- template-looking card grids
- ordinary fintech dashboards
- repeated rounded dark boxes with weak hierarchy
- low-effort hero + cards + CTA compositions
- “clean enough” placeholder UI

## Execution model
For major UI work, only redesign ONE scene or ONE section per batch unless explicitly instructed otherwise.

Examples:
- header only
- hero only
- chart showcase only
- footer only
- dashboard command strip only

Do not redesign whole products in a single pass unless explicitly told to do so.

## Mandatory batch discipline
Every UI batch must include:
1. exact file targets
2. exact route affected
3. exact acceptance criteria
4. a visible proof marker
5. build/lint validation
6. explicit summary of what changed

## Visible proof marker rule
Every substantial homepage/public redesign batch must include one obvious proof marker so deployment can be verified quickly.

Examples:
- a temporary hero kicker string
- a temporary section label
- a temporary footer marker
- a unique visible nav chip

Do not omit this unless explicitly asked.

## Typography roles
Use a 3-role type hierarchy:

### Hero display role
Used only for hero headline and rare signature moments.
Should feel bold, distinctive, memorable, graphic.

### Section display role
Used for section titles, premium editorial titles, footer signature.
Should feel sculptural, elegant, high-end.

### Interface/content role
Used for body copy, chips, labels, modules, supporting copy.
Should feel modern, readable, clean, and premium.

Do not collapse all three roles into one generic font treatment.

## Layout rules
Use:
- asymmetry
- strong hierarchy
- varied scale
- intentional whitespace
- layered surfaces
- premium spacing rhythm
- visual focal points

Avoid:
- equal-width everything
- equal-height card rows
- repetitive box rhythm
- flat stacked sections
- overusing the same module shell everywhere

## Motion rules
Motion must feel authored, not templated.

Use:
- staged reveals
- premium easing
- calm/stable/tense differences by content type
- subtle parallax where appropriate
- hover richness
- restrained interaction polish

Do not:
- apply one identical fade-up to everything
- over-animate
- add motion that reduces clarity
- ignore reduced-motion support

## Header rules
Public homepage header must feel like a premium floating object.
Not a normal nav bar.
Centered composition is preferred when instructed.
Dropdowns must feel designed, not default.

## Homepage rules
Homepage must never read like a generic startup landing page.
It should feel like an editorial-tech brand experience with product intelligence depth.

## Private shell rules
Private shell must feel like a cognition OS, not a standard admin shell.

## File targeting rule
When asked to redesign a route, update the ACTUAL rendered files for that route.
Do not redesign adjacent or unused components and present them as complete.

## Build discipline
When environment allows, always run:
- npm install
- npm run -w apps/web lint
- npm run -w apps/web build

Do not claim success without reporting exact results.

## Reporting format
After each batch, report only:
1. updated file tree
2. files changed
3. exact visible route affected
4. what changed
5. proof marker used
6. validation results
7. remaining risks

## Quality bar
Assume the UI budget is $80k.
Design and implementation quality must reflect that expectation.
Good enough is not acceptable.
Distinctive, coherent, premium, and technically polished is the minimum bar.
