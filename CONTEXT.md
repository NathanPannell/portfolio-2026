# Portfolio 2026 handoff

Last updated: September 23, 2026.

This is the first file a new chat should read. It records the current working state and points to the durable sources of truth.

## Read in this order

1. `CONTEXT.md` for current state, branch safety, and unfinished work.
2. `PRODUCT.md` for audience, positioning, scope, and factual constraints.
3. `DESIGN.md` for the visual world, responsive rules, motion, and interaction behavior.
4. `CONTENT.md` before adding or editing projects, writing, or legacy posts.
5. `ARCHITECTURE.md` before changing routing, layouts, shared components, or interaction scripts.
6. `OPERATIONS.md` before building, testing, deploying, or promoting staging to production.
7. `ASSETS.md` before replacing or creating media.

## Current repository state

- Repository: `NathanPannell/portfolio-2026`
- Local workspace: `C:\repo\portfolio-2026-workspace`
- Framework: Astro 7 with MDX and static output
- Hosting target: Cloudflare Pages
- Intended canonical URL: <https://www.nathanpannell.com>
- Current Cloudflare production project: <https://portfolio-2026-ady.pages.dev>
- Staging URL: <https://staging.nathanpannell.com>
- Apex URL: <https://nathanpannell.com> redirects to `www.nathanpannell.com` with HTTP 308.

### Branches

- `main` is the Cloudflare production branch. At this handoff, `origin/main` is `72de61d` (`Merge pull request #3 from NathanPannell/staging`).
- `staging` is the shared review and QA branch. At this handoff, `origin/staging` is `53e0971` (`Merge pull request #2 from NathanPannell/codex/portfolio-parkdex-web-links`).
- Do not update `main` or production without Nathan explicitly asking to promote staging.

Cloudflare deploys the persistent `staging` and `main` branches through Git integration. The `www.nathanpannell.com` production domain is live on Cloudflare Pages. The apex domain remains on Vercel and responds with HTTP 308 to the `www` URL.

The staging workflow starts with a same-repository draft PR targeting `staging`. The PR head must include the current `staging` commit. `scripts/preview-pr.ps1` creates a temporary, isolated Cloudflare Pages Direct Upload project for review. The script defaults to provider-free plan mode; add `-Apply` and the Cloudflare account ID to create the preview. Test the deployed preview and keep it available through the merge and staging verification. The scripts track preview resources in a durable external journal, which must be retained through teardown. See `OPERATIONS.md` for commands and Cloudflare authentication details.

After preview review, mark the PR ready and merge it into `staging`. Wait for the staging Git deployment and browser-test `staging.nathanpannell.com`. Then use `scripts/teardown-preview-pr.ps1` with `-Apply`, the same account ID, and `-StagingVerified` to remove the owned preview after the script confirms the exact staging deployment. For an explicitly authorized production release, open a promotion PR from the reviewed `staging` state to `main`, merge it, and verify the production custom domain.

`portfolio-2026.pages.dev` is unrelated to this repository and currently identifies itself as “sujith varughese.” Never deploy to, link to, or treat that hostname as Nathan's portfolio.

The workspace contains an untracked `.codex-remote-attachments/` directory owned by the user. Do not add, move, delete, or modify it.

The ignored `.impeccable/` directory contains historical review material and local reference artifacts. Treat `PRODUCT.md`, `DESIGN.md`, this handoff, and the current implementation as authoritative. Old critiques and mockups are history, not active instructions.

## What is settled

- The hero uses Nathan's boat photograph and the line “I build products that make life more fun.”
- The homepage sequence is hero, Parkdex, project Polaroids, featured writing, concise contact footer.
- Parkdex is the lead project and the clearest expression of the portfolio's point of view.
- Email is the primary contact route. GitHub, X, and LinkedIn are secondary.
- Mobile navigation contains only Nathan Pannell and Email me. Do not restore a hamburger menu.
- There is no About, résumé, work-history, RSS, Atom, dark-mode, or generic experiments section.
- Projects appear directly on the homepage in this order: Parkdex, Doxxme, Commons, Go Fetch, Cup of Sugar.
- Project pages lead with a project-specific artifact, concise story, stable metadata, and evidence. They do not use a generic Vancouver Island photograph as the title background.
- Writing contains non-project essays only. Project posts are represented by project pages.
- Older project writing remains available within the matching project page under “Read the original build notes.” Other legacy posts retain flat direct URLs.
- Underscore-prefixed content and entries with `draft: true` must never receive public routes.
- The dedicated Writing page is the intentional dark room. The rest of the site has no alternate theme.
- Parkdex is presented as the mobile field app. The homepage gallery is three phone frames with field app captures copied from the Parkdex landing page. There is no laptop frame and no link to `web.parkdex.app`.

## Interaction behavior that must be preserved

- Project cards are warm-white instant-film prints in every state. Brand colors may affect reflections or shadows, never the paper surface.
- On touch, the card nearest the viewport center lifts, scales, and receives gloss. It keeps its resting angle and does not depend on hover.
- Fine pointers may add bounded 3D tilt and pointer-following glare.
- Touch taps must not leave sticky focus. Returning from a project through browser Back must clear pointer-created focus and resume centered-card selection when scrolling.
- `pagehide` must not abort the interaction controller when `event.persisted` is true. `pageshow` resumes the controller for back-forward cache restores.
- Homepage writing rows use the same center-selection idea with an image wash.
- Reduced motion removes entrance animation, lift, scale, tilt, and glare without hiding information.
- Every project image, video, and embed must stay below the visible viewport height.
- Parkdex device frames must remain visibly matte, dark, and thick enough to read as hardware at the smallest shipped size. Do not add chrome-like gradients.

## Current content and asset follow-ups

- When the Parkdex landing page changes its field app captures or facts, mirror them here and update `ASSETS.md` with the new provenance.
- Nathan may rewrite project copy later. Preserve facts, dates, collaborators, results, and links while keeping the copy short.
- Do not invent testimonials, users, revenue, customers, or metrics.
- Confirm Cloudflare Web Analytics configuration and verify exactly one `cdn-cgi/rum` beacon on the production `www` domain before claiming analytics is active.

## Last verified state

The full UI verification record at `2bfb664` is historical and predates the current branch heads. It records that revision passing:

- `npm run build`, including the content contract, Astro diagnostics, and static generation
- Astro diagnostics with zero errors, warnings, or hints
- Impeccable's mechanical scan with no blocking findings
- Live Cloudflare checks at 320px, 390px, standard desktop, and wide desktop sizes
- Homepage, all project layouts, Writing, article, legacy route, and 404 journeys
- Project destination, Back, then Scroll behavior with one centered card active and no retained focus
- Browser console review with no runtime errors on the tested paths

## Starting a new task safely

1. Run `git status --short` and `git branch -vv` before editing.
2. Preserve unrelated changes and the user-owned attachment directory.
3. Create a feature branch from the latest `staging` commit and use the draft PR preview flow in `OPERATIONS.md`. Do not work directly on `main`.
4. Read the documentation relevant to the requested surface.
5. For UI work, compare the deployed URL before editing and verify the affected journey on deployed staging afterward.
6. Run `npm run build` before delivery.
7. Do not promote staging to `main` without explicit approval.
