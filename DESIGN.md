---
name: Nathan Pannell Portfolio
description: A photo-led Vancouver Island portfolio with tactile project prints and photographic writing rows.
colors:
  ink: "#101b1b"
  paper: "#f1f0e8"
  paper-deep: "#e7e5db"
  paper-bright: "#f8f8f4"
  paper-soft: "#f6f4ec"
  print-white: "#fbfaf4"
  lime: "#b8f53d"
  coral: "#ff9a5d"
  sea: "#1c5361"
  project-field: "#dce6d3"
  writing-room: "#111414"
  writing-muted: "#a8ada9"
  writing-copy: "#c6cbc6"
  writing-line: "#424744"
  media-stage: "#0b1313"
  media-black: "#030303"
  hero-water: "#315c68"
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
    fontSize: "clamp(3.35rem, 5vw, 5.75rem)"
    fontWeight: 720
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Ysabeau Variable, Trebuchet MS, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
  handwritten:
    fontFamily: "Caveat Variable, Segoe Print, cursive"
    fontWeight: 650
    lineHeight: 0.95
  label:
    fontFamily: "Strichpunkt Sans Variable, Bricolage Grotesque Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 720
    lineHeight: 1
    letterSpacing: "-0.025em"
rounded:
  prose-media: "0.75rem"
  paper: "0.2rem"
  media: "1rem"
  screenshot: "1.35rem"
  pill: "999px"
spacing:
  tight: "0.75rem"
  control-inline: "1.35rem"
  cluster: "2rem"
  section-inline: "clamp(1.25rem, 5vw, 5rem)"
  section-block: "clamp(4.5rem, 7vw, 7rem)"
  project-gap: "clamp(1.2rem, 3vw, 3.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.print-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.8rem 1.35rem"
    height: "3.25rem"
  contact-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "0"
    padding: "0.55rem 0.1rem"
    height: "2.75rem"
  project-print:
    backgroundColor: "{colors.print-white}"
    textColor: "{colors.ink}"
    typography: "{typography.handwritten}"
    rounded: "{rounded.paper}"
    padding: "clamp(0.65rem, 1.1vw, 1.05rem) clamp(0.65rem, 1.1vw, 1.05rem) clamp(5.6rem, 6.6vw, 6.6rem)"
---

# Design System: Nathan Pannell Portfolio

## Overview

**Creative North Star: "The Island Field Deck"**

The homepage starts with one real photograph of Nathan on a sailboat off Vancouver Island. The photo fills the first viewport, the masthead sits transparently over it, and the short claim stays in the lower-left water. From there, the story moves through Parkdex, three selected project prints, three selected essays, and a direct contact footer.

The system is candid, tactile, and technically precise. Fog paper and deep green-black ink carry the page. Lime marks actions and focus. Coral is reserved for the final phrase in the hero claim. The photograph, project artifacts, and essay images carry the personality, so the interface keeps supporting copy short.

**Key Characteristics:**

- One full-height, real sailboat photograph leads every homepage visit.
- A transparent, borderless masthead overlays the hero without a white panel or divider.
- Large, tightly set display type uses short, concrete claims.
- Project cards feel like warm-white photographic prints with paper texture, rotation, and depth.
- The homepage curates three projects and three essays while preserving archives in place.
- Responsive layouts keep the same photo-first hierarchy on phone and desktop.

## Colors

The palette combines coastal water, fogged paper, forest shade, and Parkdex's electric signal. Light surfaces carry most of the page, while dark stages belong to project media and writing hover states.

`tokens.css` is the implementation source for palette, typography, motion, spacing, radii, and shadows. Page and component styles should consume those variables instead of creating local color values.

### Primary

- **Parkdex Lime:** Action underline, text selection, focus outline, and small confirmation signal. Use it sparingly so the clearest action stays obvious.

### Secondary

- **Sea Green:** Supporting copy, scrollbars, and cool explanatory emphasis.
- **Coral Punctuation:** The warm accent on the hero's closing phrase. It punctuates the claim rather than decorating the page.

### Neutral

- **Inlet Ink:** Default text, primary button, and footer text on dark surfaces.
- **Fog Paper:** Main page ground.
- **Deep Paper:** Secondary paper fields and image wells.
- **Paper Bright:** Lighter article and media surfaces.
- **Print White:** Project print stock and bright text over photographic states.
- **Project Field:** Green-tinted ground for the selected project deck.
- **Writing Room:** Near-black writing and media interaction state.
- **Writing Muted:** Secondary essay dates and metadata.
- **Hairline:** Quiet rules between editorial rows and sections.

**The Rare Accent Rule.** Lime and coral are signals. Do not spread either color evenly across a surface.

**The One Light Story Rule.** The homepage remains one paper-and-photograph sequence. Dark areas are limited to media, writing interaction states, and the closing contact area.

## Typography

**Display Font:** Strichpunkt Sans Variable, with Bricolage Grotesque Variable as fallback

**Body Font:** Ysabeau Variable, with Trebuchet MS as fallback

**Handwritten Font:** Caveat Variable, with Segoe Print as fallback

**Character:** Strichpunkt gives the page a sturdy, warm display voice with a slightly condensed width. Ysabeau keeps narrative copy open and human. Caveat is limited to the full physical project-print captions, including the title, date, and story line, where it supports the printed artifact metaphor.

### Hierarchy

- **Hero:** Bold display text at the `hero` scale, with a tight line box and condensed width. It stays a short two-part claim over the lower-left of the photo.
- **Section display:** Bold display type for Parkdex, Projects, Writing, and the footer prompt. Keep line breaks intentional and tracking tight.
- **Project print title:** Caveat at a medium-bold weight. The title and date share one caption row.
- **Essay title:** Display type at a large row scale. Titles are the main content of each writing row.
- **Body:** Ysabeau at the site default size and line-height. Reading copy stays near 63 characters per line on homepage stories and near 72 characters per line on detail pages.
- **Label:** Display type with compact tracking for the masthead, actions, dates, and metadata.

**The No Micro-Subtitle Rule.** Do not add decorative eyebrows, tiny category labels, or stacked explanatory captions. Small type is for real dates, image credit, status, or accessibility context.

**The Short Claim Rule.** Large type makes one concrete point in Nathan's voice. Avoid generic positioning nouns such as builder, creator, innovator, or founder.

## Layout

The homepage follows one experience sequence: full-height photo hero, Parkdex story, selected project deck, selected writing list, and email-first footer. Sections use fluid horizontal and vertical padding. The project and section grids cap near 94rem on wide screens so the artifacts have room to breathe.

The hero is `100svh` tall. Its single wide boat photograph is absolutely positioned, covers the entire section, and keeps the subject on the right through a desktop and phone object position. The transparent masthead sits at the top. The headline and Victoria subcopy sit in the lower-left with fluid inset and width; on phone, the copy uses a one-rem inset on both sides.

Parkdex uses an asymmetric story-and-gallery grid. The gallery contains one wide map screenshot in a matte laptop frame and two narrow phone frames, all lightly rotated. The project deck uses three columns on wide screens, two columns below 980px, and a vertical stack below 720px. Cards may alternate edges on phone to keep the deck tactile without changing reading order. The writing section uses a sticky introduction beside essay rows until the 980px breakpoint, then returns the introduction to normal flow.

Only entries with `homeOrder` appear in the featured deck or first writing list. The homepage currently shows Parkdex, Doxxme, and Go Fetch, followed by ICBC, Suno Slayers, and What a Failed Hackathon Taught Me. `More projects` and `All writing` disclose the remaining routable entries in place and preserve their direct routes.

Detail pages use paper, a two-column opening, and a dark media stage below. Page-level image, video, and iframe media use intrinsic aspect ratios, `contain`, and a visible-screen height cap. They do not depend on a homepage card crop.

**The Artifact Before Grid Rule.** Use asymmetry and rotation to help a real artifact lead the eye. Keep the source order and destination clear.

## Elevation & Depth

Depth is physical and restrained. Project cards use warm-white stock, a paper texture, a contact shadow, and a broad falloff. Editorial sections use rules and tonal changes instead of floating panels. The hero uses a subtle dark photographic shade at the bottom for readable copy. There is no white hero wash, glass panel, or moving glare.

Fine-pointer hover and keyboard focus lift a project print by 0.8rem and add less than one degree of rotation. A touch layout selects the card nearest the viewport center while the deck is visible, then clears the state outside the deck. Essay rows use their photographic cover as a dark wash on hover, keyboard focus, and the centered mobile row. Reduced motion removes the lifts, rotations, and transitions.

**The Flat Until Touched Rule.** Editorial surfaces stay flat. Shadows and movement belong to photographic artifacts and direct interaction states.

### Shadow Vocabulary

- **Print contact:** Small dark contact shadow directly under the paper edge.
- **Print falloff:** Broad, low-opacity shadow that separates the print from the green deck ground.
- **Device contact:** Short shadow under the laptop base and phone rails.
- **Hero text shade:** A restrained photographic shadow that protects the lower-left claim without adding a panel.

## Shapes

Project cards are square-cornered instant-film prints with a paper border, a fixed 4:3 image window, and a deep caption well. Their individual rotations are small and stable. The homepage action is the rounded pill family. Parkdex device frames use rounded screen and hardware edges because they represent physical devices. Essay rows are flat rectangles separated by one-pixel rules.

Use circles only when an artifact or project identity requires one. Do not round every section into a generic card. Let paper, spacing, image windows, and rules establish the composition first.

**The Two Shape Families Rule.** Use square paper objects for project evidence and pills for actions. Rounded containers are reserved for media framing and device silhouettes.

## Components

### Hero and Masthead

The hero is the signature component: one source photograph fills `100svh`, with no card, whitewash, or header rule covering it. The masthead is a transparent absolute overlay with Nathan Pannell on the left and Email me on the right. Email me is a typographic link with a lime underline and directional arrow. Hero copy is white with a coral final phrase and sits low on the left; Nathan's face and the boat remain visible on the right.

### Buttons and Text Links

Primary actions are ink-filled pills with bright text, a minimum 3.25rem height, and a small hover lift on fine pointers. Text links and disclosure summaries use a lime underline and a compact arrow. Every interactive control retains the global lime focus outline.

### Parkdex Gallery

The gallery uses a wide map screenshot in a simplified matte laptop frame and two narrow neutral phone frames. Source pixels remain visible. The frame uses a dark rail, recessed screen edge, and contact shadow rather than chrome or screen sheen. Light rotation makes the three views read as objects laid out for review.

### Project Prints

The featured cards are real links to Parkdex, Doxxme, and Go Fetch. Each uses the optional `cardImage` and `cardImageAlt` when present, so the homepage cover can be a photographic still life or user-owned photo while the project detail page keeps its evidence-led `cover`. The full physical caption uses Caveat for the title, date, and one factual story line. Project-specific accents stay outside the print stock and do not recolor the paper border.

### Lost Trail Page

The 404 route is a useful field note rather than a centered utility message. Pair one tactile 404 marker with a short “Lost the trail.” explanation and direct destinations for Home, Parkdex, and Writing. Preserve the same paper, ink, coral punctuation, and typographic rules as the rest of the site.

### Writing Rows

The three featured rows are ICBC, Suno Slayers, and What a Failed Hackathon Taught Me. Each row has a photographic cover, title, date, and arrow. Fine-pointer hover and keyboard focus reveal the cover through a dark wash. On phone, the row nearest the viewport center receives the same state while the list is visible. The archive disclosure adds older writing in place without changing its flat route.

### Archive Disclosures

`More projects` and `All writing` are native `details` controls. Their summaries are compact typographic controls with an arrow that rotates when open. Archive rows preserve titles, dates, short factual captions, and direct links.

### Project and Article Media

Project media sits on a near-black stage and uses `contain` sizing. Images, videos, and iframes are capped below full viewport height. Videos expose native controls and use a poster when available. Article images remain within the reading flow and use the restrained `prose-media` radius. Alt text, media titles, and useful fallbacks are required.

### Footer Contact

The shared footer closes with “Working on something that should exist?”, a direct email action, the Vancouver Island colophon, and GitHub, X, and LinkedIn links. Article pages may add a More writing link beside the email action.

### Motion and Reduced Motion

The standard interaction curve is `cubic-bezier(0.16, 1, 0.3, 1)` with short transitions between 120ms and 320ms. Motion explains focus, stacking, direction, or touch. It does not run as ambient decoration. The reduced-motion path disables smooth scrolling, collapses transitions, and removes project-card lift, scale, and rotation.

## Do's and Don'ts

### Do:

- **Do** lead with the existing real sailboat photograph at every viewport size.
- **Do** keep the masthead transparent and borderless over the photo.
- **Do** use Parkdex lime as a scarce action and focus signal.
- **Do** use real interface evidence on Parkdex detail pages and photographic covers on the selected homepage cards and essays.
- **Do** preserve the featured order through `homeOrder` and keep every routable archive entry reachable.
- **Do** keep project and article media within the visible screen height on detail pages.
- **Do** retain keyboard focus, useful alt text, skip navigation, touch behavior, and a complete reduced-motion path.

### Don't:

- **Don't** add hero preview prints, a white hero panel, or a header divider over the first photograph.
- **Don't** replace the hero photograph with a generated portrait or a different crop without an explicit source decision.
- **Don't** turn the homepage into a résumé, timeline, skills matrix, or uniform SaaS card grid.
- **Don't** distribute lime or coral as general decoration.
- **Don't** add micro-subtitles, decorative eyebrows, or redundant category labels.
- **Don't** invent a separate dark mode or a separate Writing scene.
- **Don't** use generic stock nature imagery, glassmorphism, floating gradient blobs, or cursor-following card effects.
- **Don't** crop page-level demo media merely to fill a container or allow portrait media to exceed the viewport.
