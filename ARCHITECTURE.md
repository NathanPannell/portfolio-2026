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
| `src/components/Hero.astro` | The hero frame. |
| `src/components/heroes/` | Doors, the hero, plus `worlds.ts`, the facts about the five projects. |
| `src/components/Steps.astro` | The numbered steps a section explains itself with, and the main window they rotate in. |
| `src/components/BuildNight.astro` | AI Build Night: cover and key, then its four steps, one link, and a window that is a link too. |
| `src/components/Offbooked.astro` | Curtains and rope, then the title, one link and four steps. |
| `src/components/Parkdex.astro` | Sky, Plant!, the ride, the four stops, the way on down, and the park at the bottom with its links. |
| `src/components/Sandbox.astro` | Toy box and rainbow, then the name, one link and three steps. |
| `src/components/Tempo.astro` | The view from the stool and the tap ring, then the name, one line, one link and one big looping window. |
| `src/components/Index.astro` | The image-fill index and contact footer. |
| `src/scripts/frames.ts` | Marks the frame on screen, and frames the nearest screen once a scroll has been left alone. |
| `src/scripts/moments.ts` | The click-to-open scenes, which only the visitor can open. |
| `src/scripts/motion.ts` | Reduced-motion check, resting loops, and lazy video. |
| `src/scripts/doors.ts` | The doors swing open before the page moves on. |
| `src/scripts/cover.ts` | AI Build Night: the cursor the steps open from, and the Enter key. |
| `src/scripts/tempo.ts` | Not Quite My Tempo: judges the press that opens it against the ring's beat. |
| `src/scripts/steps.ts` | The rotation and its pausing, for the sections that rotate. |
| `src/scripts/sound.ts` | Every sound on the page, made with Web Audio. |
| `src/scripts/ride.ts` | Parkdex: Kip's timed ride down the vine, forest layers, and the slide to the park and the jump. |
| `src/scripts/swing.ts` | Parkdex: each stop as a pendulum on its vine, with a sway of its own and a push from a pointer or finger. |
| `src/scripts/wash.ts` | Touch equivalent for the index image fill. |
| `tests/content-contract.mjs` | Section order, required links, claims guards, reduced-motion coverage, media budget. |
| `tests/seo-contract.mjs` | Generated-output SEO checks: host exclusion, canonical, share card, JSON-LD, 404. |
| `e2e/` | Playwright against `astro preview`: rendering, the settle, the doors, every click moment and its steps, sixteen viewport sizes, reduced motion, no JavaScript, and a crawl for broken internal URLs. |
| `.github/workflows/ci.yml` | The CI gate for PRs to `main` (run locally for PRs to `staging`). |
| `public/_headers` | Cloudflare security and caching headers. |
| `public/_redirects` | Old project and essay URLs. |

## Frames

The page is a stack of `[data-frame]` elements in ordinary document flow. Nothing is pinned and nothing is scrubbed by the scroll position: a frame plays on its own clock once it arrives. The content contract fails on `position: sticky` or `data-track`, so scroll-driven scenes can't creep back in.

`frames.ts` does two jobs.

- **Arrival.** The one frame crossing the middle of the screen gets `data-here`, which is what starts a closed scene's nudge.
- **The settle.** Scrolling belongs to the visitor. Once a wheel, touch or key scroll has been left alone for `IDLE` milliseconds, the page eases over `GLIDE` milliseconds to frame the nearest screen. Any wheel, touch, key or press stops that on the spot, whether it has started or is still waiting to, and so does anything else moving the page. The one exception is a wheel event with no vertical movement, which trackpads throw in at the end of a swipe: that only stops a glide already in motion. It is a `requestAnimationFrame` tween and not a smooth `scrollTo` for exactly that reason: it can be stopped dead on every browser. It never acts during a scroll, so a fling goes straight through. Anywhere inside a frame taller than the screen is left alone, which covers Parkdex once it is open and the index, and the footer runs on freely after the last frame. Anchors and find-in-page aren't wheel, touch or key scrolls, so they stay where they land. It is off under reduced motion, and it waits while a finger is down, the page is pinch-zoomed, or text is selected.

Scroll anchoring is off on the page, because a scene opening during a scroll could otherwise cut that scroll short.

There is deliberately no CSS scroll snapping. `proximity` undoes a single wheel notch by snapping back to the frame it left, and `mandatory` can strand content in anything taller than the screen. It is also the least predictable part of iOS Safari, alongside the address bar.

Tab into a frame, or press a control part way up the screen, and that frame eases into place. Tall frames are left to the browser.

## Click moments

Each of the five projects starts as one full closed screen. A `[data-moment]` scene has one `[data-moment-control]`, always a real `<button>`: the key, the rope, Plant!, the toy box, the tap ring. The scene's closed look and layout hang off `.stage` on `<html>`, set by the inline script in `SiteLayout` before the first paint. It has to be that early: without a stage these scenes stack in plain flow, and if the page's height changed when the bundle arrived, a reload would land in the wrong place and slide back. If the bundle hasn't run by the `load` event, or after six seconds, `.stage` comes off again, so a script that fails or stalls hides nothing for long, and `startMoments` puts it back if the script turns up late. `.stage` isn't added under reduced motion at load, so there every scene is simply open.

Only the visitor opens a scene, by design: no timer, no opening on the way past, and the content contract fails if `moments.ts` or `tempo.ts` grows one. Parts marked `[data-opens]` stay `inert` until then, so the keyboard goes from one closed scene to the next. Using the control sets `data-open`, moves focus into the scene and fires `moment:open`. CSS transitions from the closed state, so each piece's delay is its place in the sequence. Offbooked sets these per piece with `--at`.

AI Build Night's steps open from the block cursor: `startCover` measures the cursor and clips the panel to it. A mouse sounds the key on the way down, but a finger only counts as a gesture for audio when it lifts, so touch sounds on the click. The snare in Not Quite My Tempo works the same way, through the same `soundOnPress`.

Not Quite My Tempo's ring is a CSS animation at the game's warm-up tempo, 96 beats a minute. It makes no sound, because only a press does, and it rests off screen like any other loop. `startTempo` reads where a press landed from the animation's own clock, at `pointerdown` or `keydown` rather than the click, which waits for the button or the space bar to come back up. Any press opens the scene. The word it gets uses the game's windows: 45 ms for Perfect, 90 ms for Good, and Rushing or Dragging past that.

Each press has a sound, all in `sound.ts`: the thocc, the curtains, the flag and the vine, the toy box with a crayon scribbling as the rainbow crosses, and the snare. They are made with Web Audio, so there are no files to fetch, and only a press starts one: scrolling to the park plays Kip's jump silently. iOS keeps audio suspended until a finger lifts, and anything scheduled before then waits, so a rope pulled by hand sounds when it is let go if nothing on the page has been tapped yet. The phone's silent switch still silences everything.

Parkdex's ride is a timed `requestAnimationFrame` tween rather than CSS, because Kip has to follow the vine's curve at whatever width the screen is. Parkdex is the one taller zone: opening it adds the park as a second screen, in normal flow, so it can be scrolled to as well as ridden to. The slide uses a second Kip, loose in the section so neither screen clips it, and carries the page along until any input lets go. The vine carries on into the park at the same point in its curve. Arriving at the park by scrolling plays the end of the same trip, so Kip always makes the jump.

Parkdex's stops hang from vines of their own, drawn by `.pk-stop::before` from `strand.svg`, so they are there still under reduced motion or without JavaScript. `swing.ts` makes each one a pendulum, rotating the stop about a pivot above the top of the screen. It runs on elapsed time at a fixed physics step, so a slow phone swings at the same speed in fewer frames. A stop's own sway is added on top of a damped spring that a pointer's speed, a tap or a neighbour can push. Neighbours in a row pass a swing on when they meet, and the edges of the screen stop one, so a stop can't overlap the next or leave the screen, and a swing has a limit as a share of the vine's length so that a title stays readable. The phone hangs from its sign on a short link of its own, and trails the swing. All of it rests off screen, and never starts under reduced motion.

The rainbow is two CSS animations: the bands cross by `transform` alone, and the toy box disappears while they cover the screen. It plays whole whatever the scroll does. Don't go back to drawing it with `stroke-dashoffset`: a dash restarts on every subpath.

A link around a picture is one link: AI Build Night's main window and Not Quite My Tempo's window are real `<a>`s, with the link's name in `aria-label` and a hover cue, and each section's visible link goes to the same place.

A `[data-loops]` scene has its looping CSS paused while it is off screen (`startRests`), which stops a page's worth of idle animations from recalculating style every frame.

## Steps

Most sections say what they do in three or four numbered steps, each with its own real picture. `Steps.astro` is that format for AI Build Night, Offbooked and Sandbox, and Parkdex's stops on the vine are the same idea in its own design. Not Quite My Tempo has no steps: it isn't detailed enough to need them, and they could only spoil it. There are two layouts, settled per section in `OPERATIONS.md`:

- **Side by side:** every step and picture on screen at once. This is what the markup is, so it is also what shows for AI Build Night and Offbooked without JavaScript or if the script stalls. Sandbox and Parkdex use it for real.
- **Rotating:** the whole list stays on screen, and one main window shows one picture at a time. `src/scripts/steps.ts` moves the pictures into the window, so nothing is written twice. Each section dresses this its own way, because matching templates were the owner's complaint: a browser that loads each page for AI Build Night, and one phone beside a marked-up page of the script for Offbooked.

The rotation's rules live in `startSet`. It starts only after the opening (`moment:open`), so it never depends on scrolling, and it never runs under reduced motion, where the list is simply there to pick from. Its count is a Web Animation of `--progress` on the set, not a timer, so hovering, focusing or leaving the screen can pause it mid-step and a section can draw how long is left. Hover and focus only count on the list and the window, and hover needs real movement, because the mouse that pressed a section's control is often left resting right where the window appears. Picking a step by hover, tap, click or keys stops the rotation for good, and never follows a window's link.

A section sets `--steps-room`, the height the steps get, `--step-*` for its colours and type, and `--window` for the width of the main window. Every size then comes from those and the screen's width, so the steps fit the screen they are on: `e2e/pages.spec.ts` checks every section at sixteen sizes, including that nothing overlaps. Side by side, wide pictures sit two by two on a big screen with `pairs`, in a row otherwise, and beside their words on a phone. App screens crop from the top on a phone, because the top of the screen is what shows the step.

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
