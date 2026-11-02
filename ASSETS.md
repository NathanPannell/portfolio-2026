# Assets

Everything under `public/media/` is a real capture, taken on 2026-10-31 unless noted. Each image comes in a small and a large WebP, at 360 and 640 wide unless noted. `tests/content-contract.mjs` enforces 130 KB per image and 1.5 MB per video.

| Folder | Source |
| --- | --- |
| `build-night/` | aibuildnight.ca in production, captured on 2026-11-01: the home page's closing band, its two north star lines, each shown alone on the band's own colour with room around it, and the challenge page. Text only: no Night 001 photos, because attendee permission is still pending, and no organisers' portraits. Exported at 480 and 900 wide, 8:5. |
| `sandbox/` | playbythesandbox.ca in production. `site-loop.mp4` plays forward then backward so it loops cleanly. `event` is the who's-in-the-sandbox sheet and `crayon` the map, captured on 2026-11-01 at 480 and 900 wide, 8:5. |
| `offbooked/` | Offbooked from its staging branch, run locally on a throwaway Postgres on Hamlet, with demo cast names. `invite` is the screen a cast member lands on, so no invite link is in shot. |
| `parkdex/` | `arrival` is web.parkdex.app in production, as a guest, in a browser that blocked every write. The `@n8tewolf` on it is the owner's own handle. `planted` is from parkdex.app in production, whose app captures use demo handles. `leaderboard` and `explore` are the Parkdex landing page's own 2026-10-16 captures of a local run: its README records that every player on them is fictional and exists only in that throwaway database. `kip-wave` is from the same page, and the other `kip-*` poses are from `art-source/kip/` in the Parkdex repo. |
| `tempo/` | Not Quite My Tempo in production, played through with its own test bot on 2026-11-01 at 1440 by 900, with the game's heads-up display hidden so the section's own can sit over it. `room` and `room-tall` are the view from the stool at 5:58 a.m. `ending` is the result screen after The Nod. No scene from 2:14 a.m. onwards is used, because that's where the blood starts. The pictures show five CC BY 4.0 models (drum kit, trumpet, trombone, double bass and grand piano) and the MIT Rocketbox characters, all credited under "Model credits" in the section itself, with a contract check that keeps them there. Their sax, chair and clock are CC0. If a picture changes, check which models are in shot and update `models` in `Tempo.astro`. |
| `index/` | Full-colour fills drawn for the shape of an index row, with the subject at the right and the row's own colour under its name: the live AI Build Night headline, or its Enter key on the small version, the tops of two Offbooked screens, the Parkdex park art with Kip, and the Sandbox marquee. The sky is feathered over the corner where the site's logo card overlaps the marquee. |

`og.jpg` and the icons in `public/` are generated for this site. `src/art/parkdex/` holds the hand-built SVG forest, vine and park, which are illustration rather than captures.

## Replacing media

- Capture from the live product or a local run. Never redraw app UI and never reuse old portfolio screenshots.
- Phone captures are 390 by 844 at 3x, exported at 360 and 640 wide.
- Don't capture other people's handles, invite links, or anything else private. Offbooked's invite step shows the screen a cast member lands on for this reason.
- If a landing page changes its app captures or facts, refresh them here.
