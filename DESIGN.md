# Design

## Concept

"I build for real people." A crowd of tiny squares spells out who the work is for, then funnels into the AI Build Night cursor, which grows into the next screen. From there, every project is its own world with its own type, colour, motion, and way of arriving. There is no shared card.

Inspiration: cut-out collage and sticker posters on Dribbble, for the Offbooked spread, and the theatre itself. The site borrows each product's real brand instead of imposing one.

## The worlds

| World | Type | Colour | Signature motion | Way in |
| --- | --- | --- | --- | --- |
| Hero | Archivo, JetBrains Mono | Ink, each audience's colour | Canvas crowd, pointer repels it | Page load |
| AI Build Night | Archivo, JetBrains Mono | Signal orange, bone, sea glass, harbour | Room scrubbed from doors to demos, tenets wipe in | Hero block fills the screen |
| Offbooked | Newsreader, JetBrains Mono | Oxblood, paper, highlighter | Curtains bunch open, then the ad slams on stage piece by piece: follow spots, flipping phones, voices, stamp, ticket | Curtain |
| Parkdex | Bricolage Grotesque | Sky, greens, orange, ink outlines | Kip rides a vine from the sky down through the forest, points, Plant! | Clouds rise over the paper |
| Play by the Sandbox | Chewy, Gaegu | Cream, crayon rainbow, pastels | Throwable toys, bobbing bubble | Crayons colour in the screen, then the paper rises |
| Index | Archivo | Ink, bone, signal | Rules sweep in, rows fill with an image | Hard cut |

Each world follows its product's real brand. Check the product before changing its colours or fonts: AI Build Night's are in its `DESIGN-BRIEF.md`.

## Rules

- Phones stay visibly different: matte black hardware in Offbooked, chunky cartoon outlines in Parkdex, plain outlines in AI Build Night.
- Screens in mockups are real captures. Never redraw app UI.
- Animate `transform` and `opacity`. Keep canvases paused when off screen.
- Text over a busy image needs a scrim or a card. Check every row of the index with its fill on.
- Leave room for touch: toys capture their own gestures, and the page must still scroll everywhere else.
- Reduced motion is a designed layout, not motion turned off.
- Keep words few. The site is something to scroll through and poke at, and links out do the explaining.
