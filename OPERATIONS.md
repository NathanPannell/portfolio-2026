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
| Draft PR targeting `staging` | Isolated review | Vercel preview deployment in project `portfolio-2026`, removed after staging QA |
| `staging` | Shared QA and release candidate | <https://staging.nathanpannell.com> |
| `main` | Cloudflare production | <https://www.nathanpannell.com> |

The canonical production URL is `https://www.nathanpannell.com`, and it serves the current portfolio from Cloudflare Pages. It is bound to the production Pages project through a `www` CNAME to `portfolio-2026-ady.pages.dev`. The apex domain remains on Vercel and returns HTTP 308 to the canonical `www` URL. Keep the Pages hostname as a diagnostic origin, not the public production URL.

Do not use `https://portfolio-2026.pages.dev`. It is an unrelated site and is not connected to this repository.

Default workflow, from a feature branch through production:

1. Begin with `git status --short` and `git branch -vv`.
2. Branch from the latest `staging` commit, make the change, and open a same-repository draft PR targeting `staging`. Keep the PR head current with `staging` before previewing.
3. Run `npm run build`.
4. Commit only relevant repository files. Never add `.codex-remote-attachments/`.
5. Create the review deployment with `scripts/preview-pr.ps1`. It requires an open PR targeting `staging` from this repository, a clean checkout of the exact PR head, and the latest `staging` commit in that head. It runs `npm run build`, packages `dist/` in Vercel's Build Output API format under the ignored `.vercel/output/`, and deploys it as a preview of the Vercel project `portfolio-2026`. Only the built output is uploaded, so untracked workspace files never leave the machine. The Vercel CLI must be logged in (`npx vercel whoami`).

   ```powershell
   .\scripts\preview-pr.ps1 -PullRequest 123
   ```

6. Test the printed `*.vercel.app` preview URL, including important routes and responsive states. Previews sit behind Vercel Deployment Protection: open them in a browser signed in to Vercel, or fetch pages with `npx vercel curl /parkdex/ --deployment <preview URL>`. Never run `vercel --prod`; the Vercel project still lists the `www` domain, but DNS serves production from Cloudflare. Vercel does not apply Cloudflare `_headers`, so check headers on staging instead. Keep the preview until staging passes.
7. Mark the PR ready and merge it into `staging`. Wait for Cloudflare's Git deployment of the exact staging commit, then test <https://staging.nathanpannell.com> in a browser.
8. After staging browser QA succeeds, remove the preview deployment. The script refuses anything that is not a preview deployment.

   ```powershell
   .\scripts\teardown-preview-pr.ps1 -DeploymentUrl https://portfolio-2026-abc123-nathanpannells-projects.vercel.app
   ```

9. Leave production unchanged until Nathan explicitly authorizes promotion. For an authorized release, open a promotion PR from the reviewed `staging` state to `main`, merge it without rewriting history, then verify the production Pages host and custom domain.

When production promotion is explicitly authorized:

1. Confirm the workspace is clean except for known user-owned untracked files.
2. Confirm the promotion PR contains the exact reviewed `staging` state.
3. Merge the promotion PR into `main` without rewriting history. Cloudflare's Git integration deploys the configured production branch.
4. Verify `https://www.nathanpannell.com`, the apex HTTP 308 redirect, and important routes after Cloudflare finishes.
5. Confirm that staging and production point to the expected commits.

Never force-push either deployment branch.

GitHub currently returns HTTP 403 for branch protection and rulesets on this private repository, with a message requiring GitHub Pro or a public repository. Until branch protection is available, the draft PR, preview verification, staging merge, and staging browser check are agent-enforced release gates.

## Cloudflare Pages settings

- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22`
- Framework output: fully static
- Pages Functions: none
- Astro Cloudflare adapter: not required

The persistent staging and production projects use Cloudflare's Git integration. Wrangler and Cloudflare credentials are not required: merging to `staging` or `main` deploys automatically. Per-PR previews run on Vercel instead. No provider token should be stored in the repository.

### Git-connected project audit

There are two Cloudflare Pages projects connected to GitHub: the production project tracks `main`, and the staging project tracks `staging`. Automatic non-production branch previews are disabled in both projects. Draft PR previews are Vercel preview deployments created on demand by `scripts/preview-pr.ps1`, then removed with `scripts/teardown-preview-pr.ps1` after the staging merge and successful staging browser QA. Automatic deployments remain enabled for the configured production branch in the production project and the configured staging branch in the staging project.

The two persistent Git-connected deployments remain the staging and production paths. The per-PR preview is a separate, explicitly managed deployment and does not add a GitHub hook or repository action. A feature-branch push can still leave an `Idle` deployment record in each Git-connected project even with previews set to `none`; those recorded URLs return HTTP 404 and are not usable preview sites. Audit status and HTTP response after the push.

The current production site is live at `www.nathanpannell.com`. Staging is the shared QA target at `staging.nathanpannell.com`. Review previews are temporary and must be torn down after successful staging QA, before final delivery.

## Analytics

Cloudflare Web Analytics is intended, but its active configuration and beacon count are unverified in this handoff. Verify exactly one `cdn-cgi/rum` request on the production `www` domain before claiming analytics is active.

- Do not add a second analytics beacon to the source.
- Do not add `Cache-Control: no-transform` to HTML responses.
- Enable or confirm Web Analytics in Cloudflare and verify exactly one `cdn-cgi/rum` request on the production custom domain.

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
- A successful `main` deployment does not prove the live routes have updated. Check the rendered site at `www.nathanpannell.com` and confirm `nathanpannell.com` returns HTTP 308 to the `www` URL.
- The static build may print Rollup advisory messages about Astro's internal `use astro:head-inject` directive for MDX. At the current toolchain version, these do not fail the build or affect generated routes.
- If a deployed route appears stale, verify the branch and commit first, then wait for Cloudflare's Git build before attempting a manual deployment.
- If the browser Back state appears stuck, inspect both `project-polaroids.ts` and `navigation-focus.ts` and test BFCache behavior rather than adding more CSS focus overrides.

## Technical SEO behavior

The built HTML uses production canonicals on every intended content route. All six standalone essays have specific descriptions, image alt text, social previews, and BlogPosting structured data with an explicit author. The homepage identifies Nathan and the website with Person and WebSite structured data. The 404 output has noindex and omits canonical and og:url.

Cloudflare `_headers` excludes Pages diagnostic hosts, including per-PR Pages hosts, and the staging custom domain from indexing with host-scoped X-Robots-Tag rules. The production `www` host remains indexable. Robots.txt continues allowing crawlers so they can read those noindex responses.

Hashed `/_astro/` assets cache for one year with immutable. Stable `/media/` URLs cache for one day and revalidate; do not mark them immutable. HTML keeps Cloudflare Pages' default revalidation behavior. Avoid a global Cache-Control rule that would combine with asset-specific rules.

`npm run build` includes the generated-output SEO contract in `tests/seo-contract.mjs`. Verify actual host headers after deployment because local Astro preview does not apply Cloudflare `_headers`. Search Console ownership, sitemap submission, indexing outcomes, and field Core Web Vitals are separate account-level checks and are not claimed by these source tests.
