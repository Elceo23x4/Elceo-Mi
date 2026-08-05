# Retired Next 15.5.22 to Sharp 0.35.3 compatibility exception

## Inspected implementation

`node_modules/next/dist/server/image-optimizer.js` lines 814–847 constructs `sharp(buffer, { limitInputPixels, sequentialRead })`, calls `.rotate()`, `.resize(width, height)` or `.resize(width, undefined, { withoutEnlargement: true })`, and encodes with `.avif()`, `.webp()`, `.png()` or `.jpeg({ mozjpeg: true })`. Metadata probing calls `sharp(buffer).metadata()`. The stable Next package declares `sharp@^0.34.3`; ELCEO tested 0.35.3 under the approved decision, but retired the exception before certification when stable Next 16.3.0 adopted `sharp@^0.35.3`.

## Coverage and behavior

| Reachable operation | Sharp 0.35.3 evidence |
| --- | --- |
| Buffer decode and metadata | PNG/JPEG/WebP/AVIF native matrix and production responses |
| Input pixel bound and sequential decode option | oversized fixture bounded failure; constructor options remain in published 0.35.3 types |
| Auto orientation via `rotate()` | EXIF orientation native and production cases |
| Proportional resize / without enlargement | exact 32×24 downscale and width-boundary rejection |
| Cover crop | native 16×16 `fit: cover` case |
| PNG/JPEG/WebP/AVIF encoding | native matrix; production negotiates configured WebP only |
| Alpha | native preservation and production alpha input |
| Errors | malformed and unsupported production inputs return controlled 400 responses |
| Cache and concurrency | repeat-hash and 24-request production burst certification |

Sharp 0.35 changes its bundled libvips and native platform artifacts; no Next-used method signature above was removed. Defaults are not assumed: Next supplies pixel limits, resize constraints, encoder quality and `mozjpeg`. Animation is not reachable because ELCEO exposes no product image ingress. Next owns cache keys and format negotiation; the exception does not alter them. Process-group tests cover native stability, while machine-specific throughput and memory ceilings are deliberately not asserted. The currently published Next 16.3 prerelease line declares `sharp@^0.35.3`, which is useful API-adoption evidence but is explicitly not stable production justification.

The retired decision is recorded by `scripts/dependency-compatibility-exceptions.json` and must be removed when `npm run check:sharp-exception-upstream` identifies a stable Auth.js-compatible supported graph.
