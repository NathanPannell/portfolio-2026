# Design

## Concept

"I build for real people." The page is a stack of full-screen frames. Scrolling the whole site shows five simple closed screens, each asking for one press or pull, and that press opens the project. Every project is its own world with its own type, colour, motion, and way of opening. There is no shared card.

Inspiration: cut-out collage and sticker posters on Dribbble, for the Offbooked spread, and the theatre itself. The site borrows each product's real brand instead of imposing one.

## The worlds

| World | Type | Colour | Signature motion | The thing to click |
| --- | --- | --- | --- | --- |
| Hero | Archivo, JetBrains Mono | Ink, bone, signal, one colour per door | A door swings open before the page moves on | Five doors |
| AI Build Night | Archivo, JetBrains Mono | Signal orange, bone, sea glass, harbour | Four steps open out of the block cursor, on one screen | A big mechanical Enter key that thoccs |
| Offbooked | Newsreader, JetBrains Mono | Oxblood, paper, highlighter | Curtains bunch open, then follow spots, the title, one link and four phones land. Nothing follows the pointer | A rope with a tassel, to click or pull down |
| Parkdex | Bricolage Grotesque | Sky, greens, orange, ink outlines | Kip rides the vine from the sky through the canopy to a clearing, where the phones swing in. Then Kip slides on down to the park and jumps off the end of the vine | Plant!, then Slide down with Kip |
| Play by the Sandbox | Chewy, Gaegu | Cream, crayon rainbow, pastels | Crayons spring out, the rainbow crosses the screen, then three steps on paper | A toy box |
| Not Quite My Tempo | Big Shoulders Display, Cormorant Garamond, JetBrains Mono | Near-black, amber, cream | The view from the stool, then the press's verdict hangs in the air and the room comes up behind it | The game's own tap ring, closing on a silent beat. Any press opens it, and it says how the press landed |
| Index | Archivo | Ink, bone, signal | Rows fill with an image | None: this one just scrolls |

Each world follows its product's real brand. Check the product before changing its colours or fonts: AI Build Night's are in its `DESIGN-BRIEF.md`.

## Rules

- Phones stay visibly different: matte black hardware in Offbooked, chunky cartoon outlines in Parkdex, plain outlines in AI Build Night.
- Screens in mockups are real captures. Never redraw app UI.
- Animate `transform` and `opacity`. Keep canvases paused when off screen.
- Text over a busy image needs a scrim or a card. Check every row of the index with its fill on. Those fills are drawn for a row's shape, subject to the right, and are never cropped to fit.
- Reduced motion is a designed layout, not motion turned off.
- Keep words few. A section's steps do the explaining, so a visitor knows what it is from a first look, and links out do the rest.
- Every step has its own real picture. See "Steps" in `ARCHITECTURE.md`.
- No two sections' steps should look stamped from one template. A main window belongs to its section: a browser, a phone by a script, a phone on the vine, a crayon drawing, the game's own screen with his patience running out over it.
- Each press has a sound of its own, and nothing else on the page makes one.
- A click moment is a physical object from that world, and the only thing that opens the scene. A closed screen stays simple: the name and the one thing to press. See "Click moments" in `ARCHITECTURE.md`.
- Motion plays on a clock once a frame arrives. Nothing is tied to the scroll position, and the only scroll help is a gentle settle after a pause.
