# Portfolio repository guidance

Read `CONTEXT.md`, `ARCHITECTURE.md`, and `OPERATIONS.md` before changing or releasing this site.

- This is one static Astro site. Cloudflare Pages project `portfolio-2026-staging` deploys `staging` to `https://staging.nathanpannell.com`; project `portfolio-2026` deploys `main` to `https://www.nathanpannell.com`.
- Start changes from the latest `staging` commit on a feature branch. Open a draft PR to `staging`. Do not push feature work directly to `staging` or `main`.
- Use `scripts/preview-pr.ps1` for an isolated, agent-owned PR preview. Verify its exact head commit in a browser before marking the PR ready.
- Merge the reviewed PR to `staging`, wait for its Cloudflare Git deployment, and test the affected journey at the stable staging URL. Keep the preview available until staging passes, then use `scripts/teardown-preview-pr.ps1` and verify its project is absent before reporting completion.
- Promote staging to `main` only when the operator explicitly requests production release. Use a PR from `staging` to `main` and verify the custom domain after merge.
- Run `npm run build` before opening a PR. Keep `.codex-remote-attachments/` and provider credentials out of commits.
