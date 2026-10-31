# Design

## Concept

"I build for real people." The page is a stack of full-screen frames. A little scroll guides you into the next one, it plays, and every section has one physical thing to press or pull. Every project is its own world with its own type, colour, motion, and way of opening. There is no shared card.

Inspiration: cut-out collage and sticker posters on Dribbble, for the Offbooked spread, and the theatre itself. The site borrows each product's real brand instead of imposing one.

## The worlds

| World | Type | Colour | Signature motion | The thing to click |
| --- | --- | --- | --- | --- |
| Hero | Archivo, JetBrains Mono | Each option's own | Doors swing open | Five options on review. See `OPERATIONS.md` |
| AI Build Night | Archivo, JetBrains Mono | Signal orange, bone, sea glass, harbour | The live site opens out of the block cursor and reads down itself, then the room plays doors to demos, then the tenets wipe on | A chunky Enter key |
| Offbooked | Newsreader, JetBrains Mono | Oxblood, paper, highlighter | Curtains bunch open, then the ad slams on stage piece by piece: follow spots, flipping phones, voices, stamp, ticket | A rope with a tassel, to click or pull down |
| Parkdex | Bricolage Grotesque | Sky, greens, orange, ink outlines | Kip rides the vine from the sky through the canopy to a clearing, where the phones swing in and score | Plant! |
| Play by the Sandbox | Chewy, Gaegu | Cream, crayon rainbow, pastels | Crayons spring out, the rainbow crosses the screen, then throwable toys | A toy box |
| Index | Archivo | Ink, bone, signal | Rules slam in, rows fill with an image | None: this one just scrolls |

Each world follows its product's real brand. Check the product before changing its colours or fonts: AI Build Night's are in its `DESIGN-BRIEF.md`.

## Rules

- Phones stay visibly different: matte black hardware in Offbooked, chunky cartoon outlines in Parkdex, plain outlines in AI Build Night.
- Screens in mockups are real captures. Never redraw app UI.
- Animate `transform` and `opacity`. Keep canvases paused when off screen.
- Text over a busy image needs a scrim or a card. Check every row of the index with its fill on.
- Leave room for touch: toys capture their own gestures, and the page must still scroll everywhere else.
- Reduced motion is a designed layout, not motion turned off.
- Keep words few. The site is something to scroll through and poke at, and links out do the explaining.
- A click moment is a physical object from that world, and it is never the only way in. See "Click moments" in `ARCHITECTURE.md`.
- Motion plays on a clock once a frame arrives. Nothing is tied to the scroll position.
