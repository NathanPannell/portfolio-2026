# Architecture

## Runtime model

This is a fully static Astro site with one homepage and a 404 page. There is no server runtime, database, authentication layer, Pages Function, client framework, or Astro Cloudflare adapter. Motion is CSS first; about 15 KB of plain TypeScript handles what CSS can't.

## Important files

| File | Responsibility |
| --- | --- |
| `astro.config.ts` | Canonical site origin, trailing slashes, and sitemap. |
| `src/pages/index.astro` | Section order and the one script entry that starts every behaviour. |
| `src/pages/404.astro` | Static recovery page. |
| `src/layouts/SiteLayout.astro` | Document shell, metadata, JSON-LD, shared fonts, and global styles. |
| `src/styles/global.css` | Shell only: reset, tokens, skip link, reveal transitions, 404. |
| `src/components/Chrome.astro` | Fixed name link and the "for ___" label that follows the scroll. |
| `src/components/Hero.astro` | Hero stage. The orange block grows from the wordmark cursor to fill the screen. |
| `src/components/BuildNight.astro` | AI Build Night: wordmark opener, room scrub, tenets, website showcase. |
| `src/components/Offbooked.astro` | Curtain reveal, then the ad assembling on stage and looping. |
| `src/components/Parkdex.astro` | The trip down the vine: sky, canopy, stops, ground, score, Plant! button. |
| `src/components/Sandbox.astro` | The crayon wipe and Play by the Sandbox. |
| `src/components/Index.astro` | Working rules, the image-fill index, contact footer. |
| `src/scripts/scroll.ts` | One scroll listener: sets `--p` on every `[data-track]`, plus reveals and lazy video loops. |
| `src/scripts/crowd.ts` | Hero canvas: squares spell each audience, react to pointer and touch, funnel into the block. |
| `src/scripts/room.ts` | AI Build Night room canvas, scrubbed by scroll from doors to demos. |
| `src/scripts/toys.ts` | Throwable toys with a small physics loop that sleeps when everything settles. |
| `src/scripts/collage.ts` | Offbooked: calls each `[data-at]` piece on stage, pointer parallax, rests the loops off screen. |
| `src/scripts/descent.ts` | Parkdex: Kip following the vine, forest layers, scoring, Plant!. |
| `src/scripts/wipe.ts` | The crayon wipe, which chases the scroll position instead of copying it. |
| `src/scripts/wash.ts` | Touch equivalent for the index image fill. |
| `tests/content-contract.mjs` | Section order, required links, claims guards, reduced-motion coverage, media budget. |
| `tests/seo-contract.mjs` | Generated-output SEO checks: host exclusion, canonical, share card, JSON-LD, 404. |
| `e2e/` | Playwright against `astro preview`: rendering, every interaction, six widths, reduced motion, no JavaScript, and a crawl for broken internal URLs. |
| `.github/workflows/ci.yml` | The CI gate for PRs to `main` (run locally for PRs to `staging`). |
| `public/_headers` | Cloudflare security and caching headers. |
| `public/_redirects` | Old project and essay URLs. |

## How scroll scenes work

A scene is a tall `[data-track]` element with a `position: sticky` stage inside it, marked `data-stage`. `scroll.ts` writes the element's progress to `--p` (0 to 1), and CSS derives everything from it. Canvas and scoring code subscribe with `onProgress`. Progress runs out exactly when the stage lets go, because it is measured from the stage's real height, and a `ResizeObserver` on the body keeps tracks right when late fonts or images move the page.

Avoid `overflow: hidden` on an ancestor of a sticky stage. Use `overflow: clip`.

Offbooked mixes two kinds of motion. Scroll decides when a `[data-at]` piece comes on stage, and a CSS spring decides how, so a fast scroll still gets the full bounce. Looping parts pause while the stage is off screen.

Parkdex isn't pinned. The route is ordinary page content, so scrolling and tabbing work as they do anywhere else. Two sticky layers take no height of their own and sit behind and in front of it. Kip holds still on screen and follows the vine's curve as it slides past. Forest layers are two tiles tall and wrap, so a long trip never needs a huge image.

The crayon wipe has its own pinned stage rather than overlapping its neighbours. It opens on Parkdex's ground colour and ends on Sandbox's paper, so nothing from either world can show through. Its bands and paper move by `transform` only, and follow a smoothed copy of the progress, so a wheel jump plays the wipe quickly instead of skipping it. Don't go back to drawing it with `stroke-dashoffset`: a dash restarts on every subpath, which is what made the first version snap, and the scroll distance was too short for a wheel notch.

## Reduced motion and no JavaScript

Each component has one `@media (prefers-reduced-motion: reduce), (scripting: none)` block that switches its pinned scene to normal flow and shows everything at once, so both cases share a layout. `startScroll` does nothing under reduced motion, so `--p` falls back to each rule's default. Canvases draw one still frame under reduced motion and are not needed without JavaScript. The wipe is hidden in both cases.

`SiteLayout` adds `.js` to `<html>` with a one-line inline script. Reveal transitions, Offbooked's off-stage states and the canvas hero only apply under `.js`.

## Tall phone viewports

Pinned stages use `100lvh`, not `100svh`, so nothing shows under them when a phone's address bar collapses. Anything pinned to the bottom of a stage adds `100lvh - 100svh` to its offset, so it stays above the bar when the bar is showing.

## Keyboard focus in pinned scenes

A `[data-track]` with `data-focus-at` jumps to that progress when keyboard focus enters it: the hero's chips at 0, the Offbooked ticket once it's on stage. Parkdex needs nothing, because its links are in normal flow.

## Styling strategy

Component-scoped `<style>` blocks, one per world, so a world's look can't leak into another. Shared tokens live in `global.css`. Keep hover behaviour inside fine-pointer feature queries.

Check 320px, 390px, tablet, standard desktop, wide desktop, and a short laptop height. Fluid units in the Offbooked collage are based on `--u`, the smaller of a width and a height unit, so the collage fits both.

## SEO, metadata, and security

- Canonical origin: `https://www.nathanpannell.com`
- `SiteLayout` owns the title, description, Open Graph, Twitter, and JSON-LD.
- The share card is `public/og.jpg`, 1200x630. Icons and `site.webmanifest` are in `public/`.
- Astro Sitemap generates `sitemap-index.xml`, and `public/robots.txt` points to it.
- `public/_headers` sets HSTS, MIME sniffing protection, frame denial, referrer policy, permissions policy, and immutable caching for hashed Astro assets.
- Do not add `Cache-Control: no-transform` to HTML because it blocks Cloudflare Web Analytics injection.

## Deliberate absences

- No client framework or hydration layer
- No animation library
- No CMS
- No contact form
- No analytics script in source: Cloudflare injects the beacon. See `OPERATIONS.md`.
