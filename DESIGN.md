# Design

## Concept

"I build for real people." The page is a stack of full-screen frames. Scrolling the whole site shows four simple closed screens, each asking for one press or pull, and that press opens the project. Every project is its own world with its own type, colour, motion, and way of opening. There is no shared card.

Inspiration: cut-out collage and sticker posters on Dribbble, for the Offbooked spread, and the theatre itself. The site borrows each product's real brand instead of imposing one.

## The worlds

| World | Type | Colour | Signature motion | The thing to click |
| --- | --- | --- | --- | --- |
| Hero | Archivo, JetBrains Mono | Each option's own | Each option's own, one idea each | Eight options on review. See `OPERATIONS.md` |
| AI Build Night | Archivo, JetBrains Mono | Signal orange, bone, sea glass, harbour | The live site opens out of the block cursor and reads down itself, beside the north star lines, all on one screen | A big mechanical Enter key that thoccs |
| Offbooked | Newsreader, JetBrains Mono | Oxblood, paper, highlighter | Curtains bunch open, then the ad lands: follow spots, the title, the waveform, one phone and a detailed ticket. Nothing follows the pointer | A rope with a tassel, to click or pull down |
| Parkdex | Bricolage Grotesque | Sky, greens, orange, ink outlines | Kip rides the vine from the sky through the canopy to a clearing, where the phones swing in. Then Kip slides on down to the park and jumps off the end of the vine | Plant!, then Slide down with Kip |
| Play by the Sandbox | Chewy, Gaegu | Cream, crayon rainbow, pastels | Crayons spring out, the rainbow crosses the screen, then toys tumble onto the floor of the screen | A toy box |
| Index | Archivo | Ink, bone, signal | Rows fill with an image | None: this one just scrolls |

Each world follows its product's real brand. Check the product before changing its colours or fonts: AI Build Night's are in its `DESIGN-BRIEF.md`.

## Rules

- Phones stay visibly different: matte black hardware in Offbooked, chunky cartoon outlines in Parkdex, plain outlines in AI Build Night.
- Screens in mockups are real captures. Never redraw app UI.
- Animate `transform` and `opacity`. Keep canvases paused when off screen.
- Text over a busy image needs a scrim or a card. Check every row of the index with its fill on. Those fills are drawn for a row's shape, subject to the right, and are never cropped to fit.
- Leave room for touch: toys take sideways drags, and a swipe up or down still scrolls the page, even from on top of one.
- Reduced motion is a designed layout, not motion turned off.
- Keep words few. The site is something to scroll through and poke at, and links out do the explaining.
- Each press has a sound of its own, and nothing else on the page makes one.
- A click moment is a physical object from that world, and the only thing that opens the scene. A closed screen stays simple: the name and the one thing to press. See "Click moments" in `ARCHITECTURE.md`.
- Motion plays on a clock once a frame arrives. Nothing is tied to the scroll position, and the only scroll help is a gentle settle after a pause.
