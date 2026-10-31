# Assets

Everything under `public/media/` is a real capture, taken on 2026-10-31 unless noted. Each image comes in a small and a large WebP. `tests/content-contract.mjs` enforces 130 KB per image and 1.5 MB per video.

| Folder | Source |
| --- | --- |
| `build-night/` | aibuildnight.ca in production. `hosts-*` is the Polaroid published on that site. `site-loop.mp4` is a seven-second capture of its homepage. |
| `sandbox/` | playbythesandbox.ca in production. `panel-*` and `headcount-*` are crops of its comic panels and headcount card. `site-loop.mp4` plays forward then backward so it loops cleanly. |
| `offbooked/` | Offbooked from `origin/staging` at `b5dcd6a`, run locally on a throwaway Postgres with the repo's Hamlet demo seed. `landing-*` is offbooked.com in production. The cast names are demo data. |
| `parkdex/` | `arrival` and `map` are web.parkdex.app in production, as a guest, in a browser that blocked every write. `planted`, `founder`, `take` and `kip-wave` are from parkdex.app in production, whose app captures use demo handles. |
| `index/` | Full-colour fills composed from the captures above and the parkdex.app homepage. |

`og.jpg` and the icons in `public/` are generated for this site.

## Replacing media

- Capture from the live product or a local run. Never redraw app UI and never reuse old portfolio screenshots.
- Phone captures are 390 by 844 at 3x, exported at 360 and 640 wide.
- Don't capture other people's handles, invite links, or anything else private. The Offbooked cast screen is scrolled past its invite link for this reason.
- If a landing page changes its app captures or facts, refresh them here.
