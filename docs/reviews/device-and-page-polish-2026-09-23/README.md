# Device and project page review

These cropped browser screenshots compare the current staging release before the change with the combined local production build after the change. They are evidence for the staging PR and the explicitly requested production promotion.

| Surface | Desktop before | Desktop after | Phone before | Phone after |
| --- | --- | --- | --- | --- |
| Parkdex homepage device frames | [Before](devices-desktop-before.png) | [After](devices-desktop-after.png) | [Before](devices-phone-before.png) | [After](devices-phone-after.png) |
| Go Fetch project hero | [Before](hero-desktop-before.png) | [After](hero-desktop-after.png) | [Before](hero-phone-before.png) | [After](hero-phone-after.png) |
| Parkdex project story media | [Before](media-desktop-before.png) | [After](media-desktop-after.png) | [Before](media-phone-before.png) | [After](media-phone-after.png) |
| Article footer | [Before](writing-footer-desktop-before.png) | [After](writing-footer-desktop-after.png) | [Before](writing-footer-phone-before.png) | [After](writing-footer-phone-after.png) |

Before: `https://staging.nathanpannell.com` at staging commit `46ef469cbdf58ccd638dfeb754a8056ad4bb4029`. After: combined local Astro production build. All screenshots use Chromium at 1722 × 928 or 390 × 844. Images were decoded before capture.

The device overlays and placement follow the current [Parkdex landing page](https://parkdex.app/), its `src/replacement-frame.css`, and the owner-provided frame provenance in that repository. The phone screenshots now fill the clipped display aperture, and the transparent frame sits above them.
