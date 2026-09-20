# Media asset provenance

All shipping raster assets under `public/media` carry an `impeccable:prompt` record. PNG and JPEG records are embedded in the file; WebP records use adjacent `.json` sidecars. The MP4 source and transcode are documented below.

## Hero

| Output | Dimensions | Source and treatment |
| --- | ---: | --- |
| `public/media/hero/nathan-on-boat-original.webp` | 1406 x 1405 | User-owned photograph, copied unchanged from `.impeccable/references/nathan-on-a-boat.webp`, originally from the private Chiri repository. |
| `public/media/hero/nathan-on-boat-wide.png` | 1896 x 830 | Approved wide hero plate copied from `assets/plates/hero-photo.png`. Its embedded prompt records the identity reference and production instructions. |
| `public/media/hero/nathan-on-boat-wide.webp` | 1896 x 830 | Production WebP derivative of the approved wide hero plate. Used by the site and social metadata. |

## Parkdex

These are user-supplied product screenshots. WebP conversion only resizes and encodes them; interface content and any visible image credit remain unchanged.

| Output | Dimensions | Original |
| --- | ---: | --- |
| `public/media/parkdex/map-overview.webp` | 1920 x 1054 | `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-11 135858.png` |
| `public/media/parkdex/park-detail.webp` | 828 x 1276 | `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-11 191452.png` |
| `public/media/parkdex/checklist.webp` | 649 x 1246 | `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-11 192209.png` |
| `public/media/parkdex/island-progress.webp` | 534 x 1252 | `C:\Users\n8tew\OneDrive\Pictures\Screenshots\Screenshot 2026-09-12 001638.png` |

## Project media

| Output | Dimensions | Source and treatment |
| --- | ---: | --- |
| `public/media/projects/doxxme-poster.webp` | 850 x 1000 | Frame at 0.5 seconds from `C:\Users\n8tew\Downloads\cursorful-video-1787651406078.mp4`. Cropped to the landing interface, excluding the account avatar. The frame shows no private account or precise location data. |
| `public/media/projects/doxxme-home.webp` | 1824 x 1156 | User-supplied Doxxme homepage screenshot, mechanically encoded to WebP with no crop or retouching. Used for the project card, social image, and video poster. |
| `public/media/projects/doxxme-demo.mp4` | 720 x 774, 20.5s | Same user-supplied Doxxme demo. H.264 Main, limited-range yuv420p, 30 fps, CRF 25, no audio, fast-start enabled. Reduced from 9.9 MB to about 1 MB. The location shown later in the demo belongs to the explicitly fictional demo profile. |
| `public/media/projects/commons-demo.webp` | 1920 x 1080 | User-supplied Commons interface screenshot, mechanically encoded to WebP with no crop or retouching. |
| `public/media/projects/cup-of-sugar-poster.webp` | 1600 x 900 | Frame at 16 seconds from `C:\Users\n8tew\Downloads\Cuppa Sugar Coordinating Food Donations.mp4`. The recommendations view was selected to avoid address, phone, and email details shown later in the demo. |
| `public/media/projects/go-fetch-architecture.jpg` | 376 x 441 | Copied from the private `NathanPannell/chiri-blog` repository at `src/content/posts/_assets/architecture.jpg`. |

## Approved composition plates

The following files are direct copies of the approved Impeccable build plates and retain their embedded prompts:

- `public/media/plates/hero-photo.png` (1896 x 830)
- `public/media/plates/parkdex-print.png` (1586 x 992)
- `public/media/plates/writing-print.png` (1586 x 992)
- `public/media/plates/island-print.png` (1586 x 992)
- `public/media/plates/paper-ground.png` (1536 x 1024)

The site loads production WebP derivatives of `writing-print`, `island-print`, and `paper-ground`. Their adjacent JSON sidecars preserve source and encoding provenance. The original PNG plates remain as review artifacts.

## External media

- Commons uses the supplied local screenshot, while its full demo remains external at `https://youtu.be/zDh8jt1IRP4`.
- Cup of Sugar has a local poster, while the full demo remains external at `https://youtu.be/bc9goVMAmgs`.
- Parkdex screenshots are current placeholders and are expected to be replaced with final captures later.

## Replacement rules

- Preserve the existing Parkdex laptop plus two-phone composition unless Nathan asks for a new art direction.
- New Parkdex captures may replace the current placeholders without changing the surrounding device layout.
- Record every new local asset's original path or public source, ownership, crop, retouching, encoding, and any privacy-sensitive exclusions.
- Keep accurate alt text in project frontmatter when an asset changes.
- Do not copy files from `.codex-remote-attachments/` into the repository unless Nathan has identified the specific file as a shipping asset.
