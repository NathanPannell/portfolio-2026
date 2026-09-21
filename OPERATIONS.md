# Development and deployment operations

## Local requirements

- Node.js 22 is the intended runtime. `package.json` allows Node 22 through 24.
- Use the committed lockfile and `npm install` or `npm ci`.

Common commands:

```sh
npm run dev
npm run check
npm run test:content
npm run build
npm run preview
```

`npm run build` is the release gate. It runs the content contract, Astro diagnostics, and the production build in that order.

## Branch and deployment model

| Branch | Purpose | Cloudflare destination |
| --- | --- | --- |
| `staging` | Active review and iteration | <https://portfolio-2026-staging.pages.dev> |
| `main` | Cloudflare production | <https://www.nathanpannell.com> |

The canonical production URL is `https://www.nathanpannell.com`. It is bound to the Cloudflare Pages project through a `www` CNAME to `portfolio-2026-ady.pages.dev`. The apex domain remains on Vercel DNS and returns a permanent redirect to the canonical `www` URL. Keep the Pages hostname as a diagnostic origin, not the public production URL.

Do not use `https://portfolio-2026.pages.dev`. It is an unrelated site and is not connected to this repository.

Default workflow:

1. Begin with `git status --short` and `git branch -vv`.
2. Work on `staging` unless Nathan explicitly requests a different branch.
3. Run `npm run build`.
4. Commit only relevant repository files. Never add `.codex-remote-attachments/`.
5. Push `staging` and wait for the staging URL to show the new commit.
6. Test the deployed staging URL, not only localhost.
7. Leave production unchanged until Nathan explicitly says to promote or push to production.

When production promotion is explicitly authorized:

1. Confirm the workspace is clean except for known user-owned untracked files.
2. Confirm `staging` is the exact reviewed commit.
3. Update `main` from that reviewed state without rewriting history.
4. Push `main`.
5. Verify `https://www.nathanpannell.com`, the apex redirect, and important routes after Cloudflare finishes.
6. Confirm that staging and production point to the expected commits.
7. Change or verify the custom domain only when Nathan has explicitly included the domain cutover in the request.

Never force-push either deployment branch.

## Cloudflare Pages settings

- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22`
- Framework output: fully static
- Pages Functions: none
- Astro Cloudflare adapter: not required

The project uses Cloudflare's Git integration. Wrangler is not required for normal deploys, and no Cloudflare API token should be stored in the repository.

### Git-connected project audit

There are two Cloudflare Pages projects connected to GitHub: the production project tracks `main`, and the staging project tracks `staging`. Automatic non-production branch previews are disabled in both projects. The branch-preview selector is verified as `None` in both dashboards. Automatic deployments remain enabled for the configured production branch in the production project and the configured staging branch in the staging project.

This is a reversible dashboard configuration. It prevents feature branches from creating duplicate preview builds while keeping the two named deployment paths intact. No GitHub hook or repository action was added.

At this handoff, the homepage finish is pushed as commit `6d260c4` on the review branch `codex/homepage-final`. Production `main` remains at `914db82`. Staging is the active deployed QA target. The independent finish review disposition is ship, with the review record in `docs/reviews/homepage-final/finish-review.md`.

## Analytics

Cloudflare Web Analytics is intended, but it is not yet verified on either Pages hostname. No `cdn-cgi/rum` beacon was detectable at this handoff.

- Do not add a second analytics beacon to the source.
- Do not add `Cache-Control: no-transform` to HTML responses.
- During production cutover, enable or confirm Web Analytics in Cloudflare and verify exactly one `cdn-cgi/rum` request on the final custom domain.

## Required UI verification

For interface changes:

- Capture focused before and after evidence for the changed surfaces.
- Test the deployed staging URL with browser-use.
- Check phone, intermediate, desktop, and wide layouts.
- Verify keyboard focus, touch behavior, reduced motion, media height caps, and console errors where relevant.
- If project-card interaction changes, test Destination, Back, then Scroll. Confirm no card keeps focus and centered selection resumes.
- If device mockups change, check chassis visibility at the smallest shipped size.
- If content changes, check the generated route and social metadata.

## Content and route checks

The content contract protects:

- existing featured projects and their order
- required legacy URLs
- contiguous project order values
- required project presentation fields
- writing descriptions
- no public drafts or underscore routes
- expected generated static routes

Additive projects and essays should not require editing a hard-coded list, except when intentionally changing the established first five project order.

## Recovery and troubleshooting

- A successful Git push is not proof that Cloudflare has finished. Reload the staging or production URL until the new page title or copy is visible.
- A successful `main` deployment does not prove the custom domain has moved. Check the response server and rendered site at both `www.nathanpannell.com` and `nathanpannell.com` before calling the cutover complete.
- The static build may print Rollup advisory messages about Astro's internal `use astro:head-inject` directive for MDX. At the current toolchain version, these do not fail the build or affect generated routes.
- If a deployed route appears stale, verify the branch and commit first, then wait for Cloudflare's Git build before attempting a manual deployment.
- If the browser Back state appears stuck, inspect both `project-polaroids.ts` and `navigation-focus.ts` and test BFCache behavior rather than adding more CSS focus overrides.
