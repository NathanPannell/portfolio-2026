---
name: Nathan Pannell Portfolio
description: A Vancouver Island field deck where one real photograph gives way to tangible project prints.
colors:
  ink: "#101b1b"
  paper: "#f1f0e8"
  paper-deep: "#e7e5db"
  print-white: "#fbfaf4"
  lime: "#b8f53d"
  coral: "#ff9a5d"
  sea: "#1c5361"
  project-field: "#dce6d3"
  writing-room: "#111414"
  writing-muted: "#a8ada9"
  line: "rgba(16, 27, 27, 0.2)"
typography:
  display:
    fontFamily: "Strichpunkt Sans Variable, Bricolage Grotesque Variable, sans-serif"
    fontSize: "clamp(3.2rem, 5.6vw, 5.75rem)"
    fontWeight: 720
    lineHeight: 0.93
    letterSpacing: "-0.04em"
  hero:
    fontFamily: "Strichpunkt Sans Variable, Bricolage Grotesque Variable, sans-serif"
    fontSize: "clamp(4rem, 6.81vw, 6.75rem)"
    fontWeight: 720
    lineHeight: 0.91
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Ysabeau Variable, Trebuchet MS, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Strichpunkt Sans Variable, Bricolage Grotesque Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
rounded:
  prose-media: "0.75rem"
  media: "1rem"
  screenshot: "1.35rem"
  pill: "999px"
spacing:
  tight: "0.75rem"
  control-inline: "1.35rem"
  cluster: "2rem"
  section-inline: "clamp(1.25rem, 5vw, 5rem)"
  section-block: "clamp(4.5rem, 7vw, 7rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.8rem 1.35rem"
    height: "3.25rem"
  button-contact:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "0"
    padding: "0.55rem 0"
    height: "2.7rem"
  project-print:
    backgroundColor: "{colors.print-white}"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "clamp(0.65rem, 1.1vw, 1.05rem) clamp(0.65rem, 1.1vw, 1.05rem) clamp(5.6rem, 6.6vw, 6.6rem)"
---

# Design System: Nathan Pannell Portfolio

## Overview

**Creative North Star: "The Island Field Deck"**

The portfolio feels like a day outside followed by a table covered in things Nathan has made. A real Vancouver Island photograph establishes place and personality before the interface shifts into fog-white paper, layered screenshots, and instant-film project prints. The work is the proof. The site should never collapse into a résumé-first card grid or a polished corporate personal brand.

The system is light, candid, tactile, and technically precise. Deep green-black ink and cool paper carry most surfaces. Parkdex lime marks action and focus, while coral is a rare point of warmth. Writing stays inside the homepage paper world rather than splitting into a separate destination.

**Key Characteristics:**

- One full-bleed, real outdoor photograph as the emotional anchor.
- Large, tightly set display type that speaks in short, direct sentences.
- Physical project artifacts with paper texture, rotation, overlap, depth, and restrained motion.
- Editorial content with generous space and readable line lengths.
- One continuous homepage story from photograph to field notes.
- Minimal supporting copy. The projects and essays carry the story.

## Colors

The palette comes from coastal water, fogged paper, forest shade, and Parkdex. Most screens stay neutral so photography, screenshots, and project-specific accents remain credible.

`tokens.css` is the implementation source of truth for colour, typography, motion, spacing, rules, and radii. Component and page styles must consume named variables from that file instead of declaring local colour literals.

### Primary

- **Parkdex Lime:** Reserved for the primary contact action, text selection, focus outlines, and rare moments of confirmation. Its scarcity gives it force.

### Secondary

- **Sea Green:** Used for explanatory emphasis, interactive writing states, scrollbars, and cool supporting text.
- **Coral Punctuation:** Used as a single warm accent in the hero claim. It should punctuate a composition, not become a general decoration color.

### Neutral

- **Inlet Ink:** The default text, dark footer, and primary-button surface.
- **Fog Paper:** The main page ground.
- **Deep Paper:** A slightly denser neutral for image wells and secondary surfaces.
- **Print White:** The brighter stock used by Polaroids and screenshot frames.
- **Project Field:** A quiet green ground that separates the project deck from editorial sections.
- **Writing Wash:** The dark photographic hover and focus state behind homepage essay rows.
- **Writing Muted:** Secondary dates and metadata in the Writing list.
- **Hairline:** Dividers and quiet structure on light surfaces.

**The Rare Accent Rule.** Lime and coral are signals, not atmosphere. Never distribute either color evenly across a page.

**The One Light Story Rule.** The homepage stays in one paper-and-photograph world. Dark surfaces are reserved for project media stages and the closing contact area, not a second theme.

## Typography

**Display Font:** Strichpunkt Sans Variable, with Bricolage Grotesque Variable as fallback  
**Body Font:** Ysabeau Variable, with Trebuchet MS as fallback

**Character:** The display face is sturdy, warm, and slightly unusual, with enough mass for poster-scale statements. Ysabeau keeps longer passages human and open. Together they feel personal and outdoors-rooted without becoming rustic or nostalgic.

### Hierarchy

- **Hero:** Bold and compact, with a very tight line box and a slightly condensed variable width. It occupies open photographic space and should remain a short claim.
- **Section Display:** Used for project stories, section openings, article titles, and contact statements. Keep tracking tight and line breaks intentional.
- **Project and Essay Title:** Display face at medium-bold weights. Scale it with the artifact or list row instead of introducing an extra subtitle tier.
- **Body:** Ysabeau at a comfortable reading size. Narrative text stays near 63 characters per line; long-form article and project bodies stop at 72 characters per line.
- **Label:** Display face, bold and compact, for navigation, calls to action, dates, and concise metadata.

**The No Micro-Subtitle Rule.** Do not add decorative eyebrows, all-caps section kickers, tiny category labels, or stacked explanatory captions. Use one clear heading and let the artifact provide context. Small type is reserved for real metadata such as a date, status, or image credit.

**The Short Claim Rule.** Large display type should sound like Nathan and make one concrete point. Do not stack generic nouns such as builder, creator, innovator, or founder.

## Layout

The homepage follows an experience sequence: photograph, Parkdex story, project deck, writing preview, and email-first contact. Sections use fluid horizontal and vertical padding rather than a rigid max-width wrapper. Content grids cap near 94rem so the deck can breathe on large screens.

The desktop hero fills one viewport. The photograph occupies the upper 70 percent, while the lower paper ground catches three overlapping preview prints. The headline and one concrete identity line sit in open water or sky rather than covering Nathan. The Parkdex section uses an asymmetric story-and-gallery grid. The project collection uses a twelve-column deck with deliberately uneven spans, rotations, and vertical offsets. The writing preview pairs a sticky introduction with compact essay rows.

At 980px and below, story, heading, and writing grids become single-column. Sticky writing copy returns to normal flow. At 720px and below, the photo is raised by roughly one-tenth of the viewport so enough open sky remains around the masthead while the title and first field-note print still arrive early. Building apps overlaps the upper part of the Vancouver Island photo across the paper transition and leads directly into Parkdex; its full caption stays unobstructed. The project deck becomes a vertical stack with cards up to 95 percent width; alternating cards align to the opposite edge to preserve the tabletop rhythm.

Project pages open on paper with a two-column composition: short story, actions, stable metadata, and proof points beside one project-specific artifact. This first artifact carries the project identity; a generic nature photograph never substitutes for the work. Additional screenshots and demos move to the dark media stage below. Every image, video, and embedded player must fit inside `calc(100svh - 2rem)`. Preserve the media's aspect ratio, use contain rather than crop for page-level demos, and never let a project visual become taller than the visible screen. On small screens, project media runs edge to edge while narrative text keeps the homepage's 1.15rem horizontal gutter.

**The Artifact Before Grid Rule.** Layout should feel composed, not templated. Use asymmetry, overlap, and varied scale only when they help an artifact lead the eye.

## Elevation & Depth

Depth is physical rather than glassy. Instant-film prints keep neutral, warm-white coated stock in every state, with a visible laminated edge, a darker contact shadow, and a broader ambient falloff. Project colors must never replace the white film border. Flat editorial sections use dividers and tonal shifts instead of card shadows. There are no translucent dashboard panels, glass effects, or floating gradient blobs.

The project deck increases elevation in response to fine-pointer hover or keyboard focus. On mobile, the single card nearest the viewport center receives the same restrained emphasis while it is inside the deck. The neutral print keeps its paper surface, lifts, and rotates by less than one additional degree; there is no moving glare or sheen. Parkdex screenshots are framed and slightly rotated to suggest photographs laid out for review.

**The Flat Until Touched Rule.** Editorial surfaces stay flat. Stronger shadows belong to photographic artifacts and interactive elevation states.

## Shapes

The core silhouette is the square-cornered instant-film print: a bright paper border, a fixed image window, and a deeper caption area. Small rotations make each print distinct without imitating a messy scrapbook. Screenshot frames and project-page media use gently rounded corners, while actions use fully rounded pills.

Use circles only for functional details already present in an artifact or project identity. Avoid a page full of rounded rectangles. Containers should be shaped by content, spacing, tonal fields, or dividers before receiving a border radius.

Project-print captions use a compact two-level label: the handwritten title and date share the first line, with one concise factual story below. The shorter caption well keeps the work image dominant without sacrificing context.

**The Two Shape Families Rule.** Use square paper objects for projects and pills for actions. Rounded panels are reserved for media framing, not generic content cards.

## Components

### Navigation

The header is a restrained one-line masthead: Nathan Pannell on the left and Email me on the right. There are no section navigation links. Over the homepage's light sky, the masthead uses dark ink for direct contrast. Email me remains a simple dark-ink link with a lime underline and drawn arrow. The shared footer carries the social routes.

### Buttons and Text Links

Primary buttons are ink-filled pills with white text and a minimum 3.25rem height. The header Email me action and in-page list expanders stay typographic with a lime underline. Text links use a compact directional arrow whose motion reinforces direction. All actions retain a visible lime focus outline.

The shared footer is intentionally concise: “Working on something that should exist?”, “Tell me about it”, the Vancouver Island colophon, and one horizontal line for GitHub, X, and LinkedIn. Article pages may add More writing beside the email action.

### Hero Preview Prints

Three content-sized instant-film objects rise into the desktop fold as one overlapping group. Their image windows preserve each source photograph's intrinsic aspect ratio, so labels and image content remain visible even on short desktop viewports. Their centered captions combine a handwritten title with one brief factual story line. Their entrance settles upward over 820ms with staggered delays and the system's spring-like easing. Fine-pointer hover or focus raises any selected print and brings it to the front. On mobile, Parkdex leaves the preview group while Building apps and Vancouver Island overlap on the paper transition as a fixed, readable bridge into the Parkdex feature.

### Project Polaroids

Each card is a real link to a project page and has four tactile states:

- **Rest:** Slight project-specific rotation and soft print shadow.
- **Hover or keyboard focus:** Lifts 0.8rem and rotates by less than one additional degree while the paper surface and shadow remain stable.
- **Fine-pointer movement:** No cursor-following tilt or glare. The physical response is a single stable hover state.
- **Active:** Settles to a shallower 0.2rem lift for a quiet press response.

On desktop, the deck stays still while the visitor scrolls. On mobile, the card nearest the viewport centre receives the established lifted focus state so the vertical deck keeps a clear reading position; only one card may be active, and the state clears outside the project section. The card link itself remains the paper, shadow, and transform surface. Fine pointers receive one hover lift and small rotation, while touch scrolling preserves native vertical panning and whole-card taps. Pointer-activated links clear restored focus when visitors return through browser history, while live keyboard focus remains visible. Back-forward cache restores must resume the mobile focus calculation without duplicating listeners.

### Lost Trail Page

The 404 route is a useful field note rather than a centred utility message. Pair one tactile 404 marker with a short “Lost the trail.” explanation and three direct destinations: Home, Parkdex, and Writing. Preserve the same paper, ink, coral punctuation, and typographic rules as the rest of the site.

### Parkdex Gallery

Use one wide map screenshot inside a simplified matte laptop frame and two narrower screenshots inside slim neutral phone frames. The frames are content-sized divs: screenshot width determines frame width, intrinsic image height determines frame height, and every source pixel remains visible. Use one dark rail, one recessed screen edge, and a contact shadow rather than decorative hardware, chrome, or screen sheen. Keep the three frames lightly rotated and layered like objects set down for review. This is a product story, not a carousel.

### Writing List

Writing lives on the homepage as a flat editorial list. The three newest entries show first; All writing expands the remaining published flat articles in place. Fine-pointer hover and keyboard focus reveal a dark photographic wash drawn from the essay while its title and metadata brighten. On mobile only, the row nearest the viewport centre receives that same state while the writing list is visible; desktop scrolling never selects a row.

### Project and Article Media

Project media sits on a near-black stage and uses contain sizing. Images, videos, and iframes are capped below full viewport height. Videos expose native controls and use a poster when available. Article images remain within the reading flow and use a restrained radius. Alt text, media titles, and useful fallbacks are required.

### Motion and Reduced Motion

The standard interaction curve is `cubic-bezier(0.16, 1, 0.3, 1)`, usually over 180ms to 320ms. Motion should explain touch, focus, stacking, or direction. It should not run as ambient decoration.

When reduced motion is requested, smooth scrolling is disabled, animations and transitions collapse to effectively instant, and project cards do not lift, scale, or rotate. No important information may depend on motion, hover, or pointer position.

## Do's and Don'ts

### Do:

- **Do** lead with real outdoor photography and real project interfaces.
- **Do** let Parkdex lime mark the clearest action or focus target.
- **Do** preserve generous whitespace, large headings, and readable 63ch to 72ch text measures.
- **Do** make project prints feel physical through paper, crop, rotation, overlap, and stateful depth.
- **Do** keep every project-page image, video, and embed within the visible screen height.
- **Do** provide keyboard focus, semantic headings, useful alt text, skip navigation, and touch behavior that works without hover.
- **Do** treat motion as feedback and provide a complete reduced-motion path.

### Don't:

- **Don't** turn the homepage into a résumé, timeline, skills matrix, or uniform SaaS card grid.
- **Don't** add micro-subtitles, decorative eyebrows, redundant category labels, or explanatory text under every heading.
- **Don't** invent a dark mode or a separate Writing scene. Preserve the single homepage story.
- **Don't** use generic stock nature imagery, wellness branding, hippie cues, or faux-adventure copy.
- **Don't** add glassmorphism, floating gradient blobs, excessive rounding, or animation without an interaction purpose.
- **Don't** crop page-level demo media merely to fill a container, or allow portrait media to exceed the viewport.
- **Don't** make project cards depend on cursor effects. Their hierarchy, label, and destination must remain clear at rest and on touch.
