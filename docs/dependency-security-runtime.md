# Dependency security and runtime contract

ELCEO builds and releases only on the exact Node patch recorded in `.node-version` (currently Node 24.19.0 LTS) with npm 10.8.2. `.nvmrc`, the root and web engine declarations, and CI are verified by `npm run check:runtime` rather than maintained as independent floating contracts.

## Resolution decisions

Normal npm resolution keeps each `minimatch` consumer on its declared major. Consumers of `minimatch@^3` resolve the patched 3.x line with a compatible patched `brace-expansion@1.x`; consumers of `minimatch@^10` resolve the patched 10.x line with its compatible `brace-expansion@5.x`. There is deliberately no global override for either package.

The remaining overrides are narrowly justified:

| Package | Selected | Vulnerable path / parent | Parent range | Reason and compatibility proof |
| --- | --- | --- | --- | --- |
| `postcss` | `8.5.25` | `next -> postcss@8.4.31` and the web direct dependency | Next pins `8.4.31`; web uses `8.5.25` | Next's exact vulnerable transitive pin cannot resolve a patch itself, so its parent-specific override supplies the supported PostCSS 8 major. The root override also deduplicates other PostCSS 8 consumers without crossing a major. |
| `sharp` | `0.35.3` | `next -> sharp@^0.34.3` | `^0.34.3` | npm's semver rules do not admit 0.35 from a 0.34 range, while the advisory requires 0.35. The override is scoped to Next, whose image optimizer API supports the current Sharp API; a real production optimizer test proves execution. The same version is a direct dev dependency for deterministic native installation. |
| `@babel/core` | `7.29.7` | `@svgr/* -> @babel/core` | `^7.x` | The patched release is inside every Babel 7 consumer range; the override prevents an older vulnerable lock resolution without changing major. |
| `js-yaml` | `4.3.0` | ESLint configuration loaders | `^4.x` | The patched release is within the consumers' declared 4.x ranges; the override prevents an older vulnerable lock resolution without changing major. |
| `@svgr/plugin-svgo -> svgo` | `3.3.4` | `@svgr/plugin-svgo -> svgo` | `^3.0.2` | SVGR 8 has no newer parent release and its range can otherwise retain vulnerable SVGO 3.3.2. This parent-specific resolution remains on supported major 3. |

SVGR's plugin resolves a patched SVGO 3 release through its declared `^3.0.2` range, while the repository's direct SVG tooling uses patched SVGO 4.0.2. This retains both supported majors rather than forcing a cross-major override.

## Mandatory evidence

CI records `node --version` and `npm --version`, validates the runtime contract, installs from the lockfile, audits every severity, validates the full npm tree and dependency paths, then performs native Sharp, SVGR/SVGO, and built Next.js image-optimizer transformations. The security and release gates are blocking.
