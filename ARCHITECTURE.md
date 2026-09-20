# Architecture

## Runtime model

This is a fully static Astro site. There is no server runtime, database, authentication layer, Pages Function, or Astro Cloudflare adapter.

Build flow:

```text
Astro content collections
        ↓
src/lib/content.ts
        ↓
homepage, Writing, and flat-route generation
        ↓
shared layouts and components
        ↓
static HTML, CSS, JavaScript, images, and sitemap in dist/
        ↓
Cloudflare Pages
```

## Important files

| File | Responsibility |
| --- | --- |
| `astro.config.ts` | Canonical site origin, trailing slashes, MDX, sitemap, and syntax highlighting. |
| `src/content.config.ts` | Project, writing, legacy, collaborator, highlight, link, and media schemas. |
| `src/lib/content.ts` | Publication filtering and collection sorting. |
| `src/pages/index.astro` | Homepage sequence and data-driven project and writing previews. |
| `src/pages/writing.astro` | Dedicated dark Writing selector. |
| `src/pages/[...slug].astro` | Shared flat route generator for projects, writing, and legacy posts. |
| `src/pages/404.astro` | Static recovery page. |
| `src/layouts/SiteLayout.astro` | Document shell, metadata, fonts, global styles, and shared scripts. |
| `src/layouts/ProjectLayout.astro` | Project artifact, actions, evidence, media, narrative, collaborators, and footer. |
| `src/layouts/ArticleLayout.astro` | Long-form article header, body, and footer actions. |
| `src/components/SiteHeader.astro` | Desktop navigation and mobile name plus email treatment. |
| `src/components/SiteFooter.astro` | Shared concise contact and social footer. |
| `src/styles/global.css` | Tokens, all shared layouts, device mockups, Polaroids, responsive behavior, and reduced motion. |
| `src/scripts/project-polaroids.ts` | Clears touch-created card focus without creating scroll-selected states; preserves BFCache-safe listener cleanup. |
| `src/scripts/navigation-focus.ts` | Clears pointer-created link focus after browser Back while retaining keyboard focus behavior. |
| `tests/content-contract.mjs` | Publishing invariants, required legacy routes, project ordering, drafts, and generated-route checks. |
| `public/_headers` | Cloudflare security and caching headers. |

## Page composition

### Homepage

1. Full-viewport boat-photo hero
2. Parkdex story and matte device composition
3. Tactile project Polaroid collection
4. Featured writing list with pointer-hover and keyboard-focus image washes
5. Shared concise contact footer

Projects and writing are loaded through `src/lib/content.ts`. Do not restore parallel data objects for titles, covers, or alt text in the page component.

### Project routes

The flat route generator prefers a project when a project and legacy post share the same slug. The project body renders first. Legacy content, when present, is rendered inside a collapsed disclosure.

The opening artifact comes from project frontmatter. The `media` array becomes the dark evidence stage. The body is MDX so future entries can use components if necessary, but ordinary Markdown is preferred.

### Writing and legacy routes

Writing and standalone legacy entries use `ArticleLayout`. Only Writing appears in the Writing selector. Both retain flat root-level URLs.

## Interaction lifecycle

`project-polaroids.ts` only guards against touch-created sticky focus on project cards.

- Project-card lift and slight rotation are CSS hover states gated behind `(hover: hover) and (pointer: fine)`.
- Keyboard focus receives the same physical elevation without depending on pointer position.
- Touch pointer-up clears link focus before navigation can leave a sticky return state.
- `pagehide` keeps listeners alive when the page enters the back-forward cache and aborts them only for a real unload.
- Scrolling never assigns a synthetic active state to a card or writing row.

`navigation-focus.ts` records only pointer-initiated navigation. On a BFCache or back-forward restore, it blurs a restored anchor if the user originally followed it with a pointer. Keyboard focus is not cleared.

Do not add hover behavior outside fine-pointer feature queries or restore viewport-centred selection.

## Styling strategy

The site intentionally uses one global stylesheet because its visual system is shared and composition-heavy. Page-local styles are used only where a surface is genuinely self-contained, such as the Writing selector.

The primary breakpoints are:

- `980px`: complex grids become one or two columns.
- `720px`: phone composition, simplified navigation, full-photo hero, stacked project cards, and edge-to-edge project media.

Important responsive checks are still required around 320px, 390px, tablet widths, standard desktop, and wide desktop. CSS breakpoints are not a substitute for rendered testing.

## SEO, metadata, and security

- Canonical origin: `https://www.nathanpannell.com`
- `SiteLayout` owns titles, descriptions, Open Graph metadata, and shared assets.
- Astro Sitemap generates `sitemap-index.xml`.
- `public/robots.txt` points to the production sitemap.
- `public/_headers` sets HSTS, MIME sniffing protection, frame denial, referrer policy, permissions policy, and immutable caching for hashed Astro assets.
- Do not add `Cache-Control: no-transform` to HTML because it blocks Cloudflare Web Analytics injection.

## Deliberate absences

- No client framework or hydration layer
- No CMS
- No feed generation
- No theme toggle
- No project filter or carousel
- No contact form
- No analytics script in source

These are product decisions, not missing implementation.
