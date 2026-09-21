# Media asset provenance

Shipping raster assets under `public/media` carry an `impeccable:prompt` record. PNG and JPEG records are embedded in the file. WebP records use adjacent `.json` sidecars. The MP4 source and transcode are documented below.

## Current homepage hero

| Output | Dimensions | Source and treatment |
| --- | ---: | --- |
| `public/media/hero/nathan-on-boat-wide.webp` | 1896 x 830 | Production WebP derivative of `assets/plates/hero-photo.png`, made from the user-owned Nathan boat portrait. The same file is used at every viewport size. WebP encoding only, with no compositional edit. |
| `public/media/hero/nathan-on-boat-original.webp` | 1406 x 1405 | User-owned portrait copied unchanged from `.impeccable/references/nathan-on-a-boat.webp`, originally from the private Chiri repository. Retained as source reference, not the homepage crop. |

`public/media/hero/nathan-on-boat-wide-dark-v2.webp` is an archived alternate exposure edit. It is not referenced by the current homepage. The hero uses the wide boat photograph directly with CSS shading for copy legibility. There is no white hero panel or preview-print overlay.

## Parkdex

These are user-supplied product screenshots. The current homepage trio is encoded full-frame as WebP without resizing, cropping, or editing. Earlier assets remain for project-detail use or reference; their original conversion only resized and encoded them. Interface content and visible image credit remain unchanged.

| Output | Dimensions | Homepage use and original |
| --- | ---: | --- |
| `public/media/parkdex/west-island-map-2026.webp` | 1662 x 1092 | Homepage laptop frame, visited parks map. Original: `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-21 134445.png` |
| `public/media/parkdex/river-otter-badge-2026.webp` | 714 x 1354 | Homepage phone frame, River Otter Rookie badge. Original: `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-19 181206.png` |
| `public/media/parkdex/places-checklist-2026.webp` | 712 x 1359 | Homepage phone frame, places checklist. Original: `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-19 181239.png` |
| `public/media/parkdex/map-overview.webp` | 1920 x 1054 | Project-detail cover; formerly the homepage laptop frame. Original: `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-11 135858.png` |
| `public/media/parkdex/park-detail.webp` | 828 x 1276 | Project-detail supporting media; formerly a homepage phone frame. Original: `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-11 191452.png` |
| `public/media/parkdex/island-progress.webp` | 534 x 1252 | Earlier homepage phone frame retained as a source reference. Original: `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-12 001638.png` |
| `public/media/parkdex/checklist.webp` | 649 x 1246 | Detail-page supporting media. Original: `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-11 192209.png` |

## Featured homepage project photographs

The project detail `cover` remains evidence-led. The homepage uses the separate `cardImage` field for a 4:3 photographic cover.

| Output | Dimensions | Source and treatment |
| --- | ---: | --- |
| `public/media/plates/vancouver-island-lake-2026.webp` | 1600 x 1200 | User-owned `C:\Users\n8tew\Downloads\20260617_121253.jpg`, originally supplied for the Vancouver Island island print and now reused for the Parkdex card. Auto-oriented, resized, and encoded without crop, retouching, or generative processing. |
| `public/media/project-photos/doxxme.webp` | 1000 x 750 | Generated conceptual still life for Doxxme: an open yellow envelope, unlocked padlock, and three coins. Exact prompt is in `public/media/project-photos/doxxme.webp.json`. Original PNG: `C:\Users\n8tew\.codex\generated_images\01a0c58d-5869-7250-a15d-013d75c0aa43\exec-19fec82a-a78c-4b67-8bda-a0824a1d6d81.png`. |
| `public/media/project-photos/go-fetch.webp` | 1000 x 750 | Generated conceptual still life for Go Fetch: folders, one red index tab, and a binder clip. Exact prompt is in `public/media/project-photos/go-fetch.webp.json`. Original PNG: `C:\Users\n8tew\.codex\generated_images\01a0c58d-5869-7250-a15d-013d75c0aa43\exec-3a7ffed8-649a-416e-a689-4d2771cca060.png`. |

The Doxxme and Go Fetch WebP derivatives are the current homepage cards. Their prompt sidecars preserve the full generation instructions and creation timestamp. They contain no words, logos, interface, or identifying personal data.

## Writing and paper surfaces

| Output | Use | Source and treatment |
| --- | --- | --- |
| `public/media/plates/writing-print.webp` | ICBC essay row and fallback writing cover | Mechanically encoded WebP derivative of `assets/plates/writing-print.png`; no compositional edits. |
| `public/media/plates/paper-ground.webp` | Project print texture and paper fields | Mechanically encoded WebP derivative of `assets/plates/paper-ground.png`; no compositional edits. |
| `src/content/writing/_assets` and `src/content/legacy/_assets` | Hackathon essay row and archived article media | User-owned or supplied article images stored beside their entry. Alt text remains in the article body. |

`public/media/plates/writing-laptop-2026.webp` and the older `island-print.webp` are retained review assets. The laptop photo came from user-owned `C:\Users\n8tew\Downloads\20260721_193957.jpg`, was auto-oriented, resized to 1600 x 1200, and mechanically encoded without crop, retouching, or generative processing. These assets are not current homepage preview prints. The current homepage has no hero or mobile preview-print group.

## Other project media

| Output | Dimensions | Source and treatment |
| --- | ---: | --- |
| `public/media/projects/doxxme-home.webp` | 1824 x 1156 | User-supplied Doxxme homepage screenshot, mechanically encoded to WebP with no crop or retouching. |
| `public/media/projects/doxxme-poster.webp` | 850 x 1000 | Frame at 0.5 seconds from `C:\Users\n8tew\Downloads\cursorful-video-1787651406078.mp4`, cropped to the landing interface and excluding the account avatar. The frame shows no private account or precise location data. |
| `public/media/projects/doxxme-demo.mp4` | 720 x 774, 20.5s | Same user-supplied demo. H.264 Main, limited-range yuv420p, 30 fps, CRF 25, no audio, and fast-start enabled. Reduced from about 9.9 MB to about 1 MB. The later location belongs to the explicitly fictional demo profile. |
| `public/media/projects/commons-demo.webp` | 1920 x 1080 | User-supplied Commons interface screenshot, mechanically encoded to WebP with no crop or retouching. |
| `public/media/projects/cup-of-sugar-poster.webp` | 1600 x 900 | Frame at 16 seconds from `C:\Users\n8tew\Downloads\Cuppa Sugar Coordinating Food Donations.mp4`, selected to avoid contact details. |
| `public/media/projects/go-fetch-architecture.jpg` | 376 x 441 | Copied from the private `NathanPannell/chiri-blog` repository at `src/content/posts/_assets/architecture.jpg`. |

Commons uses an external demo at <https://youtu.be/zDh8jt1IRP4>. Cup of Sugar uses an external demo at <https://youtu.be/bc9goVMAmgs>.

## Approved composition plates

The approved Impeccable source plates live outside `public/` so only production derivatives ship:

- `assets/plates/hero-photo.png`
- `assets/plates/parkdex-print.png`
- `assets/plates/writing-print.png`
- `assets/plates/island-print.png`
- `assets/plates/paper-ground.png`

## Replacement rules

- Keep the existing wide boat portrait when changing hero layout or copy. Record any new crop or treatment explicitly.
- Preserve the Parkdex laptop plus two-phone composition unless Nathan requests a new direction.
- Record each new asset's original path or public source, ownership, crop, retouching, encoding, and privacy-sensitive exclusions.
- Keep accurate alt text in project and essay content when an asset changes.
- Do not copy files from `.codex-remote-attachments/` into the repository unless Nathan identifies the specific file as a shipping asset.

## Writing covers, September 21 follow-up

All six standalone writing entries now declare their own image and accurate imageAlt. The same cover is used for the homepage writing background and social preview; article body photographs and diagrams remain in place.

| Output under `public/media/writing/` | Source and treatment |
| --- | --- |
| `icbc-coop.webp` | Generated conceptual photograph of an analog meter and probes. 1200 x 800 WebP. Exact prompt and original generated PNG path in the adjacent `.webp.json`. |
| `suno-slayers.webp` | Generated conceptual photograph of studio headphones and a tuning fork. 1200 x 800 WebP. Exact prompt and original generated PNG path in the adjacent `.webp.json`. |
| `record-of-the-day.webp` | Generated conceptual photograph of a vinyl record and paper sleeve. 1200 x 800 WebP. Exact prompt and original generated PNG path in the adjacent `.webp.json`. |
| `graduation.webp` | Existing `src/content/writing/_assets/grad.jpg`. Auto-oriented and mechanically encoded at 1200 x 1080, without crop or retouching. |
| `hackathon-learnings.webp` | Existing `src/content/writing/_assets/hackathon-code-hack.jpg`. Auto-oriented and mechanically encoded at 1200 x 904, without crop or retouching. |
| `echo.webp` | Existing `src/content/legacy/_assets/echo_team.jpg`. Auto-oriented and mechanically encoded at 1200 x 900, without crop or retouching. |

The three generated still lifes use the built-in image generation tool. They illustrate an idea, not an actual workplace, experiment, or product. No article evidence was replaced by generated imagery.
