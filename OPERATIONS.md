# Development and deployment operations

## Local requirements

- Node.js 22 is the intended runtime (`.nvmrc`). `package.json` allows Node 22 through 24.
- Install from the committed lockfile with `npm ci`.

Common commands:

```sh
npm run dev
npm run format        # rewrite files with Prettier
npm run format:check
npm run lint          # ESLint, zero warnings allowed
npm run check         # astro check
npm run build         # content contract, astro check, astro build, SEO contract
npm run test:e2e      # Playwright against astro preview of dist/; run after npm run build
npm run preview
```

Run `npx playwright install chromium` once before the first local e2e run.

## CI gate

`.github/workflows/ci.yml` runs on every pull request to `staging` or `main` and on every push to `staging`. Every job must pass on the PR's head commit before it is marked ready or merged.

| Job | What it runs |
| --- | --- |
| Format | `npm ci`, then `prettier --check .` |
| Lint | `eslint --max-warnings=0 .` |
| Types | `astro check` |
| Build | `npm run build`: the content contract, `astro check`, `astro build`, then the generated-output SEO contract |
| E2E | Playwright (desktop and mobile Chromium) against `astro preview` of the Build job's `dist/`: every sitemap route renders with no console errors or failed requests, the 404 page, the main navigation journeys, and a crawl that fails on any broken internal link, asset, or `#fragment` |
| Security | `npm audit --audit-level=high`, no committed `.env` files, and a gitleaks scan of the full git history |

There is no unit-test coverage job: the site has no unit-testable modules, so the contracts and the e2e suite are its tests. There is no database job because the site has no database. The workflow says the same in a comment.

Never weaken the gate to get green: no skipped tests, no `continue-on-error`, no new lint or format ignores, and no rerunning a flaky job until it passes.

GitHub returns HTTP 403 for branch protection and rulesets on this private repository, with a message requiring GitHub Pro or a public repository. Until rulesets are available, the CI gate is enforced by the delivery rule: never merge with a check failing, pending, or missing on the head commit.

## Branch and deployment model

| Branch | Purpose | Destination |
| --- | --- | --- |
| Draft PR targeting `staging` | Review and CI gate | None. CI is the gate; there are no preview deployments. |
| `staging` | Shared QA and release candidate | <https://staging.nathanpannell.com> (Cloudflare Pages project `portfolio-2026-staging`) |
| `main` | Production | <https://www.nathanpannell.com> (Cloudflare Pages project `portfolio-2026`) |

The canonical production URL is `https://www.nathanpannell.com`, and it serves the current portfolio from Cloudflare Pages. It is bound to the production Pages project through a `www` CNAME to `portfolio-2026-ady.pages.dev`. The apex domain remains on Vercel and returns HTTP 308 to the canonical `www` URL. Keep the Pages hostname as a diagnostic origin, not the public production URL.

Do not use `https://portfolio-2026.pages.dev`. It is an unrelated site and is not connected to this repository.

Default workflow, from a branch to staging:

1. Begin with `git status --short` and `git branch -vv`.
2. Branch from the latest `origin/staging` as `feat/`, `fix/`, `chore/` or `ci/<name>`. Keep temporary files in `.claude/tmp/<branch>/`.
3. Make the change and commit only relevant repository files. Never add `.codex-remote-attachments/`.
4. Run the CI checks locally: `npm ci`, `npm run format:check`, `npm run lint`, `npm run build`, `npm run test:e2e`, and `npm audit --audit-level=high`.
5. Push and open a same-repository **draft** PR targeting `staging`.
6. Wait for every CI job to pass on the head commit. On a failure, read the job log, fix the cause, and push.
7. Review the full diff against `origin/staging` and fix blocking findings. Mark the PR ready once every check is green on the current head commit.
8. Squash-merge the PR into `staging`. Cloudflare Pages' Git integration deploys `staging` to <https://staging.nathanpannell.com>.
9. Confirm the CI run for the merge commit on `staging` passes and the staging deployment serves that commit, then check the affected page at <https://staging.nathanpannell.com> in a browser. If anything breaks, fix forward with a new PR.
10. Leave production unchanged until Nathan explicitly authorizes promotion.

When production promotion is explicitly authorized:

1. Confirm the workspace is clean except for known user-owned untracked files.
2. Open a promotion PR from `staging` to `main` and let the same CI gate pass. Confirm it contains the exact reviewed `staging` state.
3. Merge the promotion PR into `main` without rewriting history, only after Nathan approves. Cloudflare's Git integration deploys the configured production branch.
4. Verify `https://www.nathanpannell.com`, the apex HTTP 308 redirect, and important routes after Cloudflare finishes.
5. Confirm that staging and production point to the expected commits.

Never force-push either deployment branch.

## Cloudflare Pages settings

- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22`
- Framework output: fully static
- Pages Functions: none
- Astro Cloudflare adapter: not required

The persistent staging and production projects use Cloudflare's Git integration. Wrangler and Cloudflare credentials are not required: merging to `staging` or `main` deploys automatically. No provider token should be stored in the repository.

### Git-connected project audit

There are two Cloudflare Pages projects connected to GitHub: the production project tracks `main`, and the staging project tracks `staging`. Automatic non-production branch previews are disabled in both projects. Automatic deployments remain enabled for the configured production branch in the production project and the configured staging branch in the staging project.

A feature-branch push can still leave an `Idle` deployment record in each Git-connected project even with previews set to `none`; those recorded URLs return HTTP 404 and are not usable preview sites.

The current production site is live at `www.nathanpannell.com`. Staging is the shared QA target at `staging.nathanpannell.com`.

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
