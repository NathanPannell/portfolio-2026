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

`.github/workflows/ci.yml` runs on every pull request to `main` and on every push to `main` (owner's decision, 2026-10-24); it does not run for `staging`. For a PR to `staging`, run the same checks locally; every job must pass on the PR's head commit before it is marked ready or merged.

| Job | What it runs |
| --- | --- |
| Format | `npm ci`, then `prettier --check .` |
| Lint | `eslint --max-warnings=0 .` |
| Types | `astro check` |
| Build | `npm run build`: the content contract, `astro check`, `astro build`, then the generated-output SEO contract |
| E2E | Playwright (desktop and mobile Chromium) against `astro preview` of the Build job's `dist/`: every sitemap route renders with no console errors or failed requests, every interaction, no sideways scroll at six widths, reduced motion, no JavaScript, the 404 page, and a crawl that fails on any broken internal link, asset, or `#fragment` |
| Security | `npm audit --audit-level=high`, no committed `.env` files, and a gitleaks scan of the full git history |

There is no unit-test coverage job: the site has no unit-testable modules, so the contracts and the e2e suite are its tests. There is no database job because the site has no database. The workflow says the same in a comment.

Never weaken the gate to get green: no new test skips or deleted tests, no `continue-on-error`, no new lint or format ignores, and no rerunning a flaky job until it passes.

GitHub returns HTTP 403 for branch protection and rulesets on this private repository, with a message requiring GitHub Pro or a public repository. Until rulesets are available, the gate is enforced by the delivery rule: never merge a PR to `main` with a CI check failing, pending, or missing on the head commit, or a PR to `staging` without every local check passing on it.

Run the E2E job at the configured worker count. More than about four software-rendered browsers on one machine starve each other, frames stop for seconds at a time, and timed tests fail for reasons that have nothing to do with the site.

## Branch and deployment model

| Branch | Purpose | Destination |
| --- | --- | --- |
| Draft PR targeting `staging` | Review and local check gate | None. Local checks are the gate; there are no preview deployments. |
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
6. Make sure every local check passed on the head commit you pushed. (On a PR to `main`, wait for every CI job to pass; on a failure, read the job log, fix the cause, and push.)
7. Review the full diff against `origin/staging` and fix blocking findings. Mark the PR ready once every check is green on the current head commit.
8. Squash-merge the PR into `staging`. Cloudflare Pages' Git integration deploys `staging` to <https://staging.nathanpannell.com>.
9. Confirm the staging deployment serves the merge commit (no CI runs on `staging`), then check the affected page at <https://staging.nathanpannell.com> in a browser. If anything breaks, fix forward with a new PR.
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

Use Cloudflare Web Analytics through Pages, which injects the beacon into the HTML at deploy time. As of 2026-10-31 it is off on both projects: no beacon on either domain, and no Web Analytics site on the account. The Cloudflare API token on the owner's machine can read Web Analytics but can't create a site, so turning it on is a dashboard step.

To turn it on, for `portfolio-2026-staging` and then `portfolio-2026`: Cloudflare dashboard > Workers & Pages > the project > Metrics > Web Analytics > Enable. It takes effect from the project's next deployment.

- Do not add an analytics beacon to the source. `tests/content-contract.mjs` fails if one appears.
- Do not add `Cache-Control: no-transform` to HTML responses.
- After enabling, verify exactly one beacon on the custom domain before claiming analytics is active: one `static.cloudflareinsights.com/beacon.min.js` script and one `cdn-cgi/rum` request.

## Choosing each section's steps layout

Each section's steps can be side by side or rotating, and the owner is choosing per section. Sections start on: AI Build Night rotating, Offbooked rotating, Parkdex side by side, Sandbox side by side, Not Quite My Tempo rotating. A small pill at the top right of each opened section switches it, and only appears on `staging.nathanpannell.com` and local builds. Every switch updates the address bar, so the link can be sent as it stands. Links name each section by `abn`, `offbooked`, `parkdex`, `sandbox` and `tempo`, each `side` or `rotating`:

`https://staging.nathanpannell.com/?abn=rotating&offbooked=side&parkdex=rotating&sandbox=side&tempo=rotating`

To settle on one for each section:

1. Set the `layout` prop on each `<Steps>` in `BuildNight.astro`, `Offbooked.astro`, `Sandbox.astro` and `Tempo.astro`, and `data-layout-default` in `Parkdex.astro`, to the chosen layout.
2. Delete `src/components/StepsToggle.astro` and each `<StepsToggle />`, with Parkdex's import of it.
3. In `src/scripts/steps.ts`, remove `REVIEW_HOSTS`, the `review` and `onChoose` arguments, `writeLink`, the `choices` and `toggle` code and the `asked` lookup.
4. Remove the toggle's tests from `e2e/pages.spec.ts`, the production test among them, and move the rest off the review links at the top of the steps tests.
5. If no section ended up rotating, delete `steps.ts` and its call in `index.astro`, the window markup and rotating styles, `--progress` in `global.css`, `data-counting`, and `moment:landed` in `ride.ts`. If none stayed side by side, keep the side-by-side markup and styles anyway: they are what shows without JavaScript.

## Required UI verification

For interface changes:

- Capture focused before and after evidence for the changed surfaces.
- Test the deployed staging URL with browser-use.
- Check phone, intermediate, desktop, and wide layouts.
- Verify keyboard focus, touch behavior, reduced motion, media height caps, and console errors where relevant.
- If a frame or click moment changes, go through it both ways on a real phone width, once clicking and once just scrolling past, which must leave it closed, and confirm its reduced-motion layout.
- If device mockups change, check chassis visibility at the smallest shipped size.
- If content changes, check the generated route and social metadata.

## Content and route checks

The content contract protects:

- the order of the homepage's sections
- the outbound links that were checked against the live products
- no Offbooked store link or price, no Parkdex tester link, and no link to the unconnected notquitemytempo.com
- no analytics beacon in the source, and no return of the lines the owner cut
- the image-fill interaction and its touch equivalent
- a reduced-motion layout in every world
- the media size budget, and that every referenced media file exists
- that the build contains only the homepage and the 404 page

## Recovery and troubleshooting

- A successful Git push is not proof that Cloudflare has finished. Reload the staging or production URL until the new page title or copy is visible.
- A successful `main` deployment does not prove the live routes have updated. Check the rendered site at `www.nathanpannell.com` and confirm `nathanpannell.com` returns HTTP 308 to the `www` URL.
- The static build may print Rollup advisory messages about Astro's internal `use astro:head-inject` directive for MDX. At the current toolchain version, these do not fail the build or affect generated routes.
- If a deployed route appears stale, verify the branch and commit first, then wait for Cloudflare's Git build before attempting a manual deployment.

## Technical SEO behavior

The built homepage has one production canonical, a 1200x630 share card, and Person and WebSite structured data. The 404 output has noindex and omits canonical and og:url. Run the `site-metadata` skill's audit after every deploy: with `--allow-noindex` against staging, and without it against production.

Cloudflare `_headers` excludes Pages diagnostic hosts, including per-PR Pages hosts, and the staging custom domain from indexing with host-scoped X-Robots-Tag rules. The production `www` host remains indexable. Robots.txt continues allowing crawlers so they can read those noindex responses.

Hashed `/_astro/` assets cache for one year with immutable. Stable `/media/` URLs cache for one day and revalidate; do not mark them immutable. HTML keeps Cloudflare Pages' default revalidation behavior. Avoid a global Cache-Control rule that would combine with asset-specific rules.

`npm run build` includes the generated-output SEO contract in `tests/seo-contract.mjs`. Verify actual host headers after deployment because local Astro preview does not apply Cloudflare `_headers`. Search Console ownership, sitemap submission, indexing outcomes, and field Core Web Vitals are separate account-level checks and are not claimed by these source tests.
