# Open issues #4 through #8 visual review

Before images are from the live production site on September 23, 2026. After images are from the combined candidate's local production build at the same viewport sizes. The draft PR preview and persistent staging release are verified separately before delivery.

| Issue | Before | After |
| --- | --- | --- |
| #4, hero subtext size | ![Hero before](hero-before.png) | ![Hero after](hero-after.png) |
| #5 and #6, Parkdex frames and waitlist link | ![Parkdex section before](devices-before.png) | ![Parkdex section after](devices-after.png) |
| #7, project intro height | ![Project intro before](project-hero-before.png) | ![Project intro after](project-hero-after.png) |
| #8, detail media flow | ![Project media before](project-media-before.png) | ![Project media after](project-media-after.png) |
| Phone homepage | ![Phone homepage before](homepage-mobile-before.png) | ![Phone homepage after](homepage-mobile-after.png) |
| Phone project page | ![Phone project before](project-mobile-before.png) | ![Phone project after](project-mobile-after.png) |

Local production build passed the content contract, Astro diagnostics, static generation, and SEO contract. Browser checks at 1707×791, 768×900, 390×844, and 320×700 found no page errors, failed requests, or horizontal overflow on the affected journeys. At 1707×791, the homepage subtext and masthead are both 42.4px, the project intro ends at the viewport edge, and the Parkdex detail image is 301px tall, or 38% of viewport height. The phone subtext and masthead are both 20px.
