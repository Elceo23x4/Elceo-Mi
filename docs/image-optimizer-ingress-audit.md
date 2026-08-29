# Image optimizer ingress audit

## Result

The repository-wide source audit found **no product image ingress**: no `next/image` imports, `<Image>` components, ordinary `<img>` elements, direct product calls to `/_next/image`, uploads, avatars, market/news images, object-storage paths, database image paths, proxy routes, API image transformations, custom loaders, remote domains, or `remotePatterns`. `apps/web/next.config.mjs` preserves the restrictive default with no external image configuration. CSP `data:` and `blob:` rendering allowances do not create a server-side optimizer ingress and are not treated as trust controls.

| Source | Route/component | Trust | Types/limits | Next/Sharp | Authn/authz | Validation | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Versioned files under `apps/web/public` | Static public route | Repository-controlled | Build-reviewed static assets | Not automatically optimized | Public | Git review/build | Static asset supply chain only |
| Temporary `elceo-image-cert-*` fixtures | Certification scripts only | Test-controlled raw pixels | PNG/JPEG/WebP; 64×48; malformed/SVG rejection cases | Yes, production `/_next/image` and Sharp | Local CI only | Exact metadata, format, hashes and rejection status | Supported Next 16.3.3 to Sharp 0.35.3 contract |

Any future non-static ingress is blocking until it adds content-type and signature allowlists, byte/pixel/dimension limits, decompression-bomb protection, timeout and animation policy, authenticated authorization, deterministic errors, and a prohibition on arbitrary URL/internal-network fetching. `npm run audit:image-ingress` fails when a source construct appears without updating this governed audit.
