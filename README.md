# Nathan Pannell portfolio

Static Astro portfolio for [www.nathanpannell.com](https://www.nathanpannell.com), deployed through Cloudflare Pages. The production custom domain serves the current portfolio. The apex domain redirects to `www` with HTTP 308.

## Start here

New contributors and new agent sessions should read [CONTEXT.md](./CONTEXT.md) first.

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

- Staging: <https://staging.nathanpannell.com>
- Production: <https://www.nathanpannell.com>
- Cloudflare production diagnostic host: <https://portfolio-2026-ady.pages.dev>

`portfolio-2026.pages.dev` is unrelated to this repository.

The delivery path is a draft PR to `staging`, the checks in `.github/workflows/ci.yml` run locally (GitHub CI runs only for `main`), a squash merge to `staging` (which Cloudflare Pages deploys to staging), then an explicitly authorized promotion PR to `main`. There are no preview deployments. See [OPERATIONS.md](./OPERATIONS.md) for the CI gate and release steps.

## Local development

Use Node 22, then run:

```sh
npm ci
npm run dev
```

Before pushing, run the same checks as CI:

```sh
npm run format:check
npm run lint
npm run build
npm run test:e2e
```

The build includes the content contract, Astro diagnostics, static generation, and the SEO contract. The e2e suite runs Playwright against `astro preview` of the build. See [OPERATIONS.md](./OPERATIONS.md) for deployment details and branch safety.
