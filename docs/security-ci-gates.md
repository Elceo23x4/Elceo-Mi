# Security CI gates

## Runtime and dependency policy

ELCEO certifies exact Node `24.19.0` LTS and npm `10.8.2`. Installation is deterministic via `npm ci`. `npm audit --json` blocks every severity and `npm ls --all --json` blocks invalid or peer-invalid nodes.

The approved `next@15.5.22 -> sharp@0.35.3` exception was retired before certification after stable Next 16.3.3 published `sharp@^0.35.3`. The manifest records zero active exceptions and one retired decision. No broad Sharp override, force flag, legacy peer mode, preview framework, vulnerable downgrade or audit waiver is allowed.

## Mandatory evidence

CI and `release:gate` run runtime, audit, complete tree, retired-exception manifest and supported-contract, stable-upstream-removal and image-ingress checks; typecheck/tests/build; native Sharp and SVG matrices; production Next optimizer and bounded concurrency matrices; scoped lint; migration/C5/infrastructure/IFP/security gates; then lockfile-hash, `git diff --exit-code` and strict porcelain checks. Registry unavailability is blocking. No mutation is cleaned or hidden.

Image ingress remains local/static only with no `remotePatterns`, domains, loaders, uploads or arbitrary URL fetch. See `docs/image-optimizer-ingress-audit.md` and `docs/next-sharp-compatibility-exception.md`.

## Removal procedure

`npm run check:sharp-exception-upstream` queries authoritative npm metadata with a timeout and fails when a stable Next release admits safe Sharp and satisfies Auth.js. At that point remove the manifest entry and override, upgrade the stable graph, regenerate the lockfile once using npm 10.8.2, and pass the entire release chain before deployment.
