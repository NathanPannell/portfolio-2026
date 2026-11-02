# Portfolio 2026 handoff

Last updated: October 31, 2026.

This is the first file a new chat should read. It records the current working state and points to the durable sources of truth.

## Read in this order

1. `CONTEXT.md` for current state, branch safety, and settled decisions.
2. `PRODUCT.md` for audience, positioning, and factual constraints.
3. `DESIGN.md` for each world's look, motion, and responsive rules.
4. `CONTENT.md` before changing copy or claims.
5. `ARCHITECTURE.md` before changing the page structure or scripts.
6. `OPERATIONS.md` before building, testing, deploying, or promoting staging to production.
7. `ASSETS.md` before replacing or creating media.

## Current repository state

- Repository: `NathanPannell/portfolio-2026`
- Local workspace: `C:\repo\portfolio-2026-workspace`
- Framework: Astro 7, static output, no client framework
- Hosting: Cloudflare Pages. `staging` deploys to <https://staging.nathanpannell.com>; `main` deploys to <https://www.nathanpannell.com>.
- The apex <https://nathanpannell.com> redirects to `www` with HTTP 308.

`staging` carries the October 2026 rebuild: one interactive page. `main` still carries the older multi-page portfolio until Nathan asks to promote. Do not update `main` without that request.

`portfolio-2026.pages.dev` is unrelated to this repository. Never deploy to it or link to it.

The workspace may contain an untracked `.codex-remote-attachments/` directory owned by the user. Do not add, move, delete, or modify it.

## What is settled

- One page of full-screen frames: a hero, then five worlds in the owner's order, a link index, and a contact footer. Each world is one simple closed screen until it is pressed, and then one screen of content, or two for Parkdex.
- The hero is Doors, by the owner's choice. The other seven options and the review toggle are gone, and remain in git history.
- Each opened section explains itself in three or four numbered steps, close to the owner's wording, except Not Quite My Tempo, which is one looping window and one link. The owner found four side-by-side layouts too formulaic and chose per section: AI Build Night and Offbooked rotate in a main window, and Parkdex and Sandbox stay side by side. See `OPERATIONS.md`.
- There is no fixed name on the screen. The owner removed it: the name is in the Doors headline.
- AI Build Night leads. Offbooked is the one presented as a possible business. Parkdex is the playful one. Play by the Sandbox is shown as a website Nathan designed. Not Quite My Tempo, the game, closes the set before the index, as a featured project with the same standing as the others.
- The site positions Nathan as someone who builds for real people, tests with real users and builds an AI community. Avoid nature-guy framing.
- Every world has its own fonts, colours, motion, and transition in. Do not unify them into one card template.
- The index keeps one interaction from the old homepage: a row's whole background fills with a full-colour image. Keep hover, keyboard focus, and the touch equivalent together.
- Old project and essay URLs redirect home through `public/_redirects`. The old content lives in git history and on production until promotion.

## Interaction behavior that must be preserved

- Every animation has a still fallback under `prefers-reduced-motion`, and every section is simply open.
- With JavaScript off, every section, heading, and link is still present.
- No width scrolls sideways.
- Hover effects sit behind `(hover: hover) and (pointer: fine)`. Touch gets its own equivalent.
- Keyboard focus reaches every link.
- The page never traps a scroll. The only help is a gentle settle after the page has been left alone for a moment, which any real input stops at once, so wheel, trackpad, touch and keys can pass through every screen without clicking anything.
- Each section's click moment is a real button that works by keyboard, and the owner wants it to be the only way in: nothing opens by a timer or on the way past. Under reduced motion, or if the script fails, every section is simply open, so nothing is out of reach.
- Motion plays on a clock. Nothing is pinned or scrubbed by the scroll position.

## Open items

- Confirm Cloudflare Web Analytics configuration before claiming analytics is active. See `OPERATIONS.md`.
- AI Build Night's window will become a scrolling capture of the new site, with its steps taken from that site, once it is live. Its pictures and steps stay as they are until then.
- Night 001 photos can come onto the site once attendee permission is cleared.
- Offbooked has no store listing. Link one only once it is live, and show prices only when they can be paid.

## Starting a new task safely

1. Run `git status --short` and `git branch -vv` before editing.
2. Preserve unrelated changes and the user-owned attachment directory.
3. Create a feature branch from the latest `staging` commit and use the draft PR and local gate in `OPERATIONS.md`. Do not work directly on `main`.
4. For UI work, verify the affected journey on deployed staging afterward, at desktop and phone widths.
5. Do not promote staging to `main` without explicit approval.
