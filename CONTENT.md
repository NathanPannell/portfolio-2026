# Content authoring

The site is content-driven. Projects, essays, and legacy posts belong in Astro content collections instead of page-specific arrays or duplicated route code.

## Collections

### Projects

Location: `src/content/projects/*.{md,mdx}`

Projects appear on the homepage in ascending `order` and receive a dedicated flat route such as `/parkdex/`.

Required frontmatter:

```yaml
---
title: Example Project
tagline: One concrete sentence about what it is.
summary: One short paragraph explaining the problem, product, and relevance.
order: 6
displayDate: September 2026
projectType: Independent product
cover: /media/projects/example.webp
coverAlt: Useful description of the visible interface
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
- Use two or three highlights. They must be factual evidence, not decorative numbers.
- The first link receives primary visual treatment. Put the best next action first.
- Supported media kinds are `image`, `video`, and `youtube`.
- Every media entry requires useful alternative text. Captions are optional but encouraged when they explain the evidence.
- Store local public media under `public/media`. Record provenance in `ASSETS.md`.
- Keep the body concise. A short opening paragraph followed by two or three meaningful `##` sections is usually enough.
- Avoid roadmap promises and status copy that will become stale. Use `Ongoing` only when it remains true without frequent maintenance.

If a project has a legacy entry with the same slug, the current project page wins the route and the old article is appended inside the collapsed original-build-notes section.

### Writing

Location: `src/content/writing/*.{md,mdx}`

Writing is for non-project essays shown on `/writing/`. Entries sort newest first.

```yaml
---
title: A specific, human title
pubDate: '2026-09-19'
description: One sentence that earns the click.
image: /media/example-social-image.webp # optional
featured: true # optional
draft: false
---
```

Rules:

- Preserve flat URLs because external links may already point to them.
- Titles should state the actual insight, not use a generic category label.
- Descriptions should be concrete and short.
- Place entry-owned images in a sibling `_assets` directory and write accurate alt text.
- The homepage currently previews the three newest published writing entries.
- Do not put project pages into the Writing index.

### Legacy

Location: `src/content/legacy/*.{md,mdx}`

Legacy content preserves older direct URLs and longer project notes without cluttering the Writing index.

```yaml
---
title: Existing title
pubDate: '2025-07-17'
description: Optional short description
draft: false
---
```

Do not move a legacy article into Writing merely to make it visible. Promote it only when Nathan wants it presented as current non-project writing.

## Drafts and private files

An entry is not routable when either condition is true:

- Its filename or any path segment starts with `_`.
- Its frontmatter contains `draft: true`.

This is enforced in `src/lib/content.ts`, the collection glob patterns, and `tests/content-contract.mjs`. Do not create a second draft mechanism.

## Routing behavior

`src/pages/[...slug].astro` builds every flat project, writing, and legacy route.

- A project and legacy post may intentionally share a slug.
- When they share a slug, the project is the public page and the legacy content appears in the archive disclosure.
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
