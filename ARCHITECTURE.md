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
| `src/styles/global.css` | Shell only: reset, tokens, skip link, 404. |
| `src/components/Chrome.astro` | Fixed name link. |
| `src/components/Hero.astro` | The hero frame, the eight options while they are under review, and the toggle. |
| `src/components/heroes/` | One component per hero concept, plus `worlds.ts`, the facts they all share. |
| `src/components/BuildNight.astro` | AI Build Night: cover and key, then the live site and the north star lines on one screen. |
| `src/components/Offbooked.astro` | Curtains and rope, then the title, waveform, one phone and the ticket. |
| `src/components/Parkdex.astro` | Sky, Plant!, the ride, the stops, the way on down, and the park at the bottom with its links. |
| `src/components/Sandbox.astro` | Toy box and rainbow, then one screen with the site and the toys on its floor. |
| `src/components/Index.astro` | The image-fill index and contact footer. |
| `src/scripts/frames.ts` | Marks the frame on screen, and frames the nearest screen once a scroll has been left alone. |
| `src/scripts/moments.ts` | The click-to-open scenes, which only the visitor can open. |
| `src/scripts/motion.ts` | Reduced-motion check, resting loops, and lazy video. |
| `src/scripts/heroes.ts` | The hero toggle, and the scripts for the heroes that need one. |
| `src/scripts/cover.ts` | AI Build Night: the cursor the live site opens from, and the Enter key. |
| `src/scripts/sound.ts` | Every sound on the page, made with Web Audio. |
| `src/scripts/ride.ts` | Parkdex: Kip's timed ride down the vine, forest layers, and the slide to the park and the jump. |
| `src/scripts/toys.ts` | Throwable toys with a small physics loop that sleeps when everything settles. |
| `src/scripts/wash.ts` | Touch equivalent for the index image fill. |
| `tests/content-contract.mjs` | Section order, required links, claims guards, reduced-motion coverage, media budget. |
| `tests/seo-contract.mjs` | Generated-output SEO checks: host exclusion, canonical, share card, JSON-LD, 404. |
| `e2e/` | Playwright against `astro preview`: rendering, the settle, every hero and click moment, ten viewport sizes, reduced motion, no JavaScript, and a crawl for broken internal URLs. |
| `.github/workflows/ci.yml` | The CI gate for PRs to `main` (run locally for PRs to `staging`). |
| `public/_headers` | Cloudflare security and caching headers. |
| `public/_redirects` | Old project and essay URLs. |

## Frames

The page is a stack of `[data-frame]` elements in ordinary document flow. Nothing is pinned and nothing is scrubbed by the scroll position: a frame plays on its own clock once it arrives. The content contract fails on `position: sticky` or `data-track`, so scroll-driven scenes can't creep back in.

`frames.ts` does two jobs.

- **Arrival.** The one frame crossing the middle of the screen gets `data-here`, which is what starts a closed scene's nudge.
- **The settle.** Scrolling belongs to the visitor. Once a wheel, touch or key scroll has been left alone for `IDLE` milliseconds, the page eases over `GLIDE` milliseconds to frame the nearest screen. Any wheel, touch, key or press stops that on the spot, and so does anything else moving the page. It is a `requestAnimationFrame` tween and not a smooth `scrollTo` for exactly that reason: it can be stopped dead on every browser. It never acts during a scroll, so a fling goes straight through. Anywhere inside a frame taller than the screen is left alone, which covers Parkdex once it is open and the index, and the footer runs on freely after the last frame. Anchors, Tab and find-in-page aren't wheel, touch or key scrolls, so they stay where they land. It is off under reduced motion, and it waits while a finger is down, the page is pinch-zoomed, or text is selected.

Scroll anchoring is off on the page, because a scene opening during a scroll could otherwise cut that scroll short.

There is deliberately no CSS scroll snapping. `proximity` undoes a single wheel notch by snapping back to the frame it left, and `mandatory` can strand content in anything taller than the screen. It is also the least predictable part of iOS Safari, alongside the address bar.

Tab into a frame, or press a control part way up the screen, and that frame eases into place. Tall frames are left to the browser.

## Click moments

Each of the four projects starts as one full closed screen. A `[data-moment]` scene has one `[data-moment-control]`, always a real `<button>`: the key, the rope, Plant!, the toy box. The scene's closed look and layout hang off `.stage` on `<html>`, set by the inline script in `SiteLayout` before the first paint. It has to be that early: without a stage these scenes stack in plain flow, and if the page's height changed when the bundle arrived, a reload would land in the wrong place and slide back. If the bundle hasn't run by the `load` event, or after six seconds, `.stage` comes off again, so a script that fails or stalls hides nothing for long, and `startMoments` puts it back if the script turns up late. `.stage` isn't added under reduced motion at load, so there every scene is simply open.

Only the visitor opens a scene, by design: no timer, no opening on the way past, and the content contract fails if `moments.ts` grows one. Parts marked `[data-opens]` stay `inert` until then, so the keyboard goes from one closed scene to the next. Using the control sets `data-open`, moves focus into the scene and fires `moment:open`. CSS transitions from the closed state, so each piece's delay is its place in the sequence. Offbooked sets these per piece with `--at`.

AI Build Night's site opens from the block cursor: `startCover` measures the cursor and clips the panel to it. A mouse sounds the key on the way down, but a finger only counts as a gesture for audio when it lifts, so touch sounds on the click.

Each press has a sound, all in `sound.ts`: the thocc, the curtains, the flag and the vine, and the toy box. They are made with Web Audio, so there are no files to fetch, and only a press starts one: scrolling to the park plays Kip's jump silently. iOS keeps audio suspended until a finger lifts, and anything scheduled before then waits, so a rope pulled by hand sounds when it is let go if nothing on the page has been tapped yet. The phone's silent switch still silences everything.

Parkdex's ride is a timed `requestAnimationFrame` tween rather than CSS, because Kip has to follow the vine's curve at whatever width the screen is. Parkdex is the one taller zone: opening it adds the park as a second screen, in normal flow, so it can be scrolled to as well as ridden to. The slide uses a second Kip, loose in the section so neither screen clips it, and carries the page along until any input lets go. The vine carries on into the park at the same point in its curve. Arriving at the park by scrolling plays the end of the same trip, so Kip always makes the jump.

The rainbow is two CSS animations: the bands cross by `transform` alone, and the toy box disappears while they cover the screen. It plays whole whatever the scroll does. Don't go back to drawing it with `stroke-dashoffset`: a dash restarts on every subpath.

A `[data-loops]` scene has its looping CSS paused while it is off screen (`startRests`), which stops a page's worth of idle animations from recalculating style every frame.

## The hero toggle

All eight heroes are built. The default is rendered in place, and the others sit in `<template>`s, so there is only ever one `<h1>` and search engines and no-JavaScript visitors see one hero. The toggle only appears on staging and local hosts, and `?hero=` is ignored anywhere else, so a promotion can't show it to the public by accident. `OPERATIONS.md` has the steps for settling on one.

## Reduced motion and no JavaScript

Each component has a `@media (prefers-reduced-motion: reduce), (scripting: none)` block for a still, complete layout, so both cases share it. Under reduced motion there is no `.stage` and no settle, so every scene is simply open and a scroll stops where it stops.

## Tall phone viewports

Frames are `100lvh`, so nothing shows under them when a phone's address bar collapses. What has to be seen sits inside `100svh`: anything at the bottom of a frame adds `--bar`, which is `100lvh - 100svh`, to its offset, or is laid out in a `100svh` box as the Offbooked copy is. The Sandbox floor is at the bottom of `100svh`, and the sand continues below it.

## Styling strategy

Component-scoped `<style>` blocks, one per world, so a world's look can't leak into another. Shared tokens live in `global.css`. Keep hover behaviour inside fine-pointer feature queries.

Check 320px, 390px, tablet, standard desktop, wide desktop, and a short laptop height. Fluid units in the Offbooked ad are based on `--u`, the smaller of a width and a height unit, so it fits both.

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
