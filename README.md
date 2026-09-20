# Nathan Pannell portfolio

Static Astro portfolio intended for [nathanpannell.com](https://www.nathanpannell.com), deployed through Cloudflare Pages. The latest reviewed build lives on the staging hostname; the custom domain still serves the older Vercel site until an explicit cutover.

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

- Staging: <https://portfolio-2026-staging.pages.dev>
- Cloudflare `main`: <https://portfolio-2026-ady.pages.dev>
- Intended custom domain: <https://www.nathanpannell.com> (cutover pending)

`portfolio-2026.pages.dev` is unrelated to this repository.

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
