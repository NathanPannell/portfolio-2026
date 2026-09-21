# Content authoring

The site is content-driven. Projects, essays, and legacy posts belong in Astro content collections instead of page-specific arrays or duplicated route code.

## Collections

### Projects

Location: `src/content/projects/*.{md,mdx}`

Projects receive a dedicated flat route such as `/parkdex/`. The `order` field controls the full project archive. The optional `homeOrder` field controls the curated homepage deck.

Required frontmatter:

```yaml
---
title: Example Project
tagline: One concrete sentence about what it is.
cardCaption: One short factual sentence for the homepage print.
summary: One short paragraph explaining the problem, product, and relevance.
order: 6
homeOrder: 1 # optional; featured positions are exactly 1, 2, or 3
displayDate: September 2026
projectType: Independent product
cover: /media/projects/example.webp
coverAlt: Useful description of the visible interface
cardImage: /media/project-photos/example.webp # optional homepage photograph
cardImageAlt: Description of the homepage photograph
accent: '#b7ef42'
highlights:
  - value: '6 hours'
    label: from idea to working demo
  - value: '2 wins'
    label: the specific result
links:
  - label: Open project
    href: https://example.com
collaborators:
  - name: Collaborator Name
    href: https://www.linkedin.com/in/example/
media:
  - kind: image
    src: /media/projects/example-detail.webp
    alt: Description of the evidence shown
    caption: Why this artifact matters.
    width: 1600
    height: 900
draft: false
---
```

Rules:

- Keep `order` positive, unique, and contiguous. New projects can be appended without editing a hard-coded route list.
- Use `homeOrder` only for the three selected homepage projects. Values must be unique and exactly `1`, `2`, and `3`; the current order is Parkdex, Doxxme, and Go Fetch.
- Use `cardImage` and `cardImageAlt` when the homepage should show a photographic cover separate from the detail page's evidence-led `cover`. The page falls back to `cover` when no card image is supplied.
- Use two or three highlights. They must be factual evidence, not decorative numbers.
- The first link receives primary visual treatment. Put the best next action first.
- Supported media kinds are `image`, `video`, and `youtube`.
- Every media entry requires useful alternative text. Captions are optional but encouraged when they explain the evidence.
- Store local public media under `public/media`. Record provenance in `ASSETS.md`.
- Keep the body concise. A short opening paragraph followed by two or three meaningful `##` sections is usually enough.
- Avoid roadmap promises and status copy that will become stale. Use `Ongoing` only when it remains true without frequent maintenance.

If a project has a legacy entry with the same slug, the current project page wins the route and the old article is appended inside the collapsed original-build-notes section. That legacy entry is deduplicated from the homepage Writing list.

### Writing

Location: `src/content/writing/*.{md,mdx}`

Writing is for current non-project essays shown in the homepage Writing section. The homepage uses explicit `homeOrder` values for its curated first three rows, then keeps the remaining routable entries in the in-place archive.

```yaml
---
title: A specific, human title
pubDate: '2026-09-19'
description: One sentence that earns the click.
image: /media/example-social-image.webp # optional
featured: true # optional
homeOrder: 1 # optional; featured positions are exactly 1, 2, or 3
draft: false
---
```

Rules:

- Preserve flat URLs because external links may already point to them.
- Titles should state the actual insight, not use a generic category label.
- Descriptions should be concrete and short.
- Place entry-owned images in a sibling `_assets` directory and write accurate alt text.
- Use `homeOrder` only for the three selected homepage essays. Values must be unique and exactly `1`, `2`, and `3`; the current rows are ICBC, Suno Slayers, and What a Failed Hackathon Taught Me. `All writing` expands the remaining published writing and legacy entries in place.
- Project detail pages remain separate from the Writing list; older project posts may appear as flat articles in the expanded list.

### Legacy

Location: `src/content/legacy/*.{md,mdx}`

Legacy content preserves older direct URLs and longer project notes. Those entries may appear after the first three items in the expanded homepage Writing list.

```yaml
---
title: Existing title
pubDate: '2025-07-17'
description: Optional short description
draft: false
---
```

Do not move a legacy article into Writing merely to change its collection. The homepage can surface both collections without rewriting their history.

## Drafts and private files

An entry is not routable when either condition is true:

- Its filename or any path segment starts with `_`.
- Its frontmatter contains `draft: true`.

This is enforced in `src/lib/content.ts`, the collection glob patterns, and `tests/content-contract.mjs`. Do not create a second draft mechanism.

## Routing behavior

`src/pages/[...slug].astro` builds every flat project, writing, and legacy route.

- A project and legacy post may intentionally share a slug.
- When they share a slug, the project is the public page, the legacy content appears in that project's archive disclosure, and the duplicate legacy entry is excluded from the homepage Writing list.
- Writing and standalone legacy slugs must remain unique.
- Do not create manual Astro page files for collection entries.

## Copy principles

- Use Nathan's direct voice. Prefer the shortest credible version.
- Lead with one concrete product, decision, or lesson.
- Let artifacts and outcomes prove technical ability.
- Avoid generic positioning labels, résumé prose, inflated claims, and stacked nouns.
- Do not use em dashes in user-facing copy.
- Keep time-sensitive claims out of large evergreen surfaces unless Nathan has asked to maintain them.
- State collaborators and Nathan's contribution accurately.

## Validation

Run:

```sh
npm run build
```

The build runs the content contract first, then Astro diagnostics and static generation. Fix the source content instead of weakening the contract when it catches a genuine publishing error.
