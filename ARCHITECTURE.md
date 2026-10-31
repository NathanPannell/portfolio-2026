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
| `src/components/Chrome.astro` | Fixed name link and the "for ___" label that follows the page. |
| `src/components/Hero.astro` | The hero frame, the five options while they are under review, and the toggle. |
| `src/components/heroes/` | One component per hero concept, plus `worlds.ts`, the facts they all share. |
| `src/components/BuildNight.astro` | AI Build Night: cover and key, live site, room, tenets. |
| `src/components/Offbooked.astro` | Curtains and rope, then the ad landing on a clock and looping. |
| `src/components/Parkdex.astro` | Sky, Plant!, the ride, the stops, and the ground with its links. |
| `src/components/Sandbox.astro` | Toy box and rainbow, comic panels, and the toy yard. |
| `src/components/Index.astro` | Working rules, the image-fill index, contact footer. |
| `src/scripts/frames.ts` | Marks the frame on screen, and guides a stopped scroll on to the next frame. |
| `src/scripts/moments.ts` | The click-to-open scenes, and the ways each one opens without a click. |
| `src/scripts/motion.ts` | Reduced-motion check, reveals, resting loops, and lazy video. |
| `src/scripts/heroes.ts` | The hero toggle, and the scripts for the heroes that need one. |
| `src/scripts/room.ts` | AI Build Night: the room on a clock, and the cursor the live site opens from. |
| `src/scripts/ride.ts` | Parkdex: Kip's timed ride down the vine, forest layers, scoring. |
| `src/scripts/collage.ts` | Offbooked: pointer parallax. |
| `src/scripts/toys.ts` | Throwable toys with a small physics loop that sleeps when everything settles. |
| `src/scripts/wash.ts` | Touch equivalent for the index image fill. |
| `tests/content-contract.mjs` | Section order, required links, claims guards, reduced-motion coverage, media budget. |
| `tests/seo-contract.mjs` | Generated-output SEO checks: host exclusion, canonical, share card, JSON-LD, 404. |
| `e2e/` | Playwright against `astro preview`: rendering, the guide, every hero and click moment, ten viewport sizes, reduced motion, no JavaScript, and a crawl for broken internal URLs. |
| `.github/workflows/ci.yml` | The CI gate for PRs to `main` (run locally for PRs to `staging`). |
| `public/_headers` | Cloudflare security and caching headers. |
| `public/_redirects` | Old project and essay URLs. |

## Frames

The page is a stack of `[data-frame]` elements in ordinary document flow. Nothing is pinned and nothing is scrubbed by the scroll position: a frame plays on its own clock once it arrives. The content contract fails on `position: sticky` or `data-track`, so scroll-driven scenes can't creep back in.

`frames.ts` does two jobs.

- **Arrival.** The one frame crossing the middle of the screen gets `data-here`, and keeps `data-played` once it has been there. Timed CSS hangs off those. Scripts listen for `frame:change`.
- **The guide.** Once a wheel, touch or key scroll has come to rest (`SETTLE` milliseconds with no scroll events), a page left between two frames is sent on to the next one in the direction it was travelling, or back if it only moved a few pixels. This is the only thing it does. It never listens to cancel a scroll, so wheel, trackpad, touch and keys stay native, and a continuous scroll passes straight through. Frames taller than the screen scroll freely until their end comes on screen, which is why the index works. Anchors, Tab and find-in-page aren't wheel, touch or key scrolls, so they stay where they land. The guide is off under reduced motion, and it waits while a finger is down or the page is pinch-zoomed.

There is deliberately no CSS scroll snapping. `proximity` undoes a single wheel notch by snapping back to the frame it left, and `mandatory` can strand content in anything taller than the screen. It is also the least predictable part of iOS Safari, alongside the address bar. A smooth `scrollTo` after the page stops avoids all of that. If something interrupts one, the guide tries again, up to three times.

Keyboard focus inside a frame lines the whole frame up, not just the focused element. Tall frames are left to the browser.

## Click moments

A `[data-moment]` scene has one `[data-moment-control]`, always a real `<button>`: the key, the rope, Plant!, the toy box. The scene's closed look and layout hang off `.stage` on `<html>`, set by the inline script in `SiteLayout` before the first paint. It has to be that early: AI Build Night and Parkdex stack in plain flow without a stage, and if the page's height changed when the bundle arrived, a reload would land in the wrong place and slide back. If the bundle never runs, the `load` event finds no `data-moments` on `<html>` and removes `.stage`, so a failed script hides nothing. Under reduced motion `.stage` is never added.

Using the control sets `data-open` and fires `moment:open`. CSS transitions from the closed state, so each piece's delay is its place in the sequence. Offbooked sets these per piece with `--at`.

Nothing behind a moment depends on the click. A scene also opens:

- after `AUTO_OPEN` milliseconds on screen,
- when the page scrolls past it,
- when a link inside it takes keyboard focus, which is why closed content is covered up, not `hidden`,
- as `data-open data-settled` if it is off screen at the time, whether on a reload or a jump down the page. `data-settled` skips the transitions, so nothing replays, and resting loops can't leave a sequence half done.

AI Build Night's site opens from the block cursor: `startCover` measures the cursor and clips the panel to it. The panel is painted the cursor's colour rather than hidden, so its links can still take focus.

Parkdex's ride is a timed `requestAnimationFrame` tween rather than CSS, because Kip has to follow the vine's curve at whatever width the screen is.

The rainbow is two CSS animations: the bands cross by `transform` alone, and the toy box disappears while they cover the screen. It plays whole whatever the scroll does. Don't go back to drawing it with `stroke-dashoffset`: a dash restarts on every subpath.

A `[data-loops]` scene has its looping CSS paused while it is off screen (`startRests`), which stops a page's worth of idle animations from recalculating style every frame.

## The hero toggle

All five heroes are built. The default is rendered in place, and the others sit in `<template>`s, so there is only ever one `<h1>` and search engines and no-JavaScript visitors see one hero. The toggle only appears on staging and local hosts, and `?hero=` is ignored anywhere else, so a promotion can't show it to the public by accident. `OPERATIONS.md` has the steps for settling on one.

## Reduced motion and no JavaScript

Each component has a `@media (prefers-reduced-motion: reduce), (scripting: none)` block for a still, complete layout, so both cases share it. Under reduced motion there is no `.stage` and the guide does nothing, so every scene is simply open and a scroll stops where it stops. Canvases draw one still frame and are not needed without JavaScript.

Reveals, including the timed tenets and rules, wait for `startReveals` to add `.reveals`, so a script that fails to load leaves content visible.

## Tall phone viewports

Frames are `100lvh`, so nothing shows under them when a phone's address bar collapses. What has to be seen sits inside `100svh`: anything at the bottom of a frame adds `--bar`, which is `100lvh - 100svh`, to its offset. A test stands in a fake bar through `--bar`, because test browsers have none. The toy yard goes further: its floor is at the bottom of `100svh`, and the sand continues below it.

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
