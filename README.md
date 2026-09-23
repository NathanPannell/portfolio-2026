# Nathan Pannell portfolio

Static Astro portfolio for [www.nathanpannell.com](https://www.nathanpannell.com), deployed through Cloudflare Pages. The production custom domain serves the current portfolio. The apex domain redirects to `www` with HTTP 308.

## Start here

New contributors and new Codex chats should read [CONTEXT.md](./CONTEXT.md) first.

| Document | Purpose |
| --- | --- |
| [CONTEXT.md](./CONTEXT.md) | Current branch state, settled decisions, preserved behavior, and unfinished work. |
| [PRODUCT.md](./PRODUCT.md) | Audience, positioning, scope, facts, and product principles. |
| [DESIGN.md](./DESIGN.md) | Visual system, responsive behavior, components, and motion. |
| [CONTENT.md](./CONTENT.md) | Content collections, frontmatter, copy rules, drafts, and routing. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Code map, data flow, routes, scripts, CSS, SEO, and security. |
| [OPERATIONS.md](./OPERATIONS.md) | Local commands, validation, Cloudflare deployment, and production promotion. |
| [ASSETS.md](./ASSETS.md) | Media provenance and replacement notes. |

Current environments:

- Draft PR preview: temporary per-PR Cloudflare Pages Direct Upload project, created on demand by `scripts/preview-pr.ps1` and removed after successful staging QA with `scripts/teardown-preview-pr.ps1`.
- Staging: <https://staging.nathanpannell.com>
- Production: <https://www.nathanpannell.com>
- Cloudflare production diagnostic host: <https://portfolio-2026-ady.pages.dev>

`portfolio-2026.pages.dev` is unrelated to this repository.

The delivery path is draft PR, ephemeral Direct Upload preview, merge to `staging`, then an explicitly authorized promotion PR to `main`. See [OPERATIONS.md](./OPERATIONS.md) for preview commands, teardown, and release steps.

## Local development

Use Node 22, then run:

```sh
npm install
npm run dev
```

Before delivery, run the release gate:

```sh
npm run build
```

The build includes the content contract, Astro diagnostics, and static generation. See [OPERATIONS.md](./OPERATIONS.md) for deployment details and branch safety.
