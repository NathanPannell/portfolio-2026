# Portfolio repository guidance

Read `CONTEXT.md`, `ARCHITECTURE.md`, and `OPERATIONS.md` before changing or releasing this site.

- This is one static Astro site. Cloudflare Pages project `portfolio-2026-staging` deploys `staging` to `https://staging.nathanpannell.com`; project `portfolio-2026` deploys `main` to `https://www.nathanpannell.com`.
- Start changes from the latest `origin/staging` on a `feat/`, `fix/`, `chore/` or `ci/` branch. Open a draft PR to `staging`. Do not push directly to `staging` or `main`.
- There are no preview deployments. GitHub CI runs only for PRs and pushes to `main`. A PR to `staging` must pass the checks in `.github/workflows/ci.yml` (format, lint, types, build with the content and SEO contracts, Playwright e2e against `astro preview`, dependency audit, secret scan), run locally on its head commit. Never weaken the gate to get green.
- Review the diff, mark the PR ready once every local check is green, and squash-merge it into `staging`. Cloudflare Pages then deploys `staging` to `https://staging.nathanpannell.com`. Confirm that deployment serves the merge commit and check the affected page there before reporting completion.
- Promote staging to `main` only when the operator explicitly requests a production release. Use a PR from `staging` to `main` and verify the custom domain after merge.
- Temporary files (logs, screenshots, test output) go in `.claude/tmp/<branch>/`, which is git-ignored. Do not add to the old `.codex/` folder.
- Keep `.codex-remote-attachments/` and provider credentials out of commits.
