---
"@prosopo/client-bundle-example": minor
"@prosopo/cypress-shared": patch
---

Redesign the demo site as a Prosopo-branded playground. Every demo page now has the prosopo.io header, a sidebar to switch captcha type, mode, rendering and challenge placement, the event log and the code for the current setup side by side, and sign-up links. The home page is now the frictionless captcha instead of the image captcha, which moves to `/image-implicit.html`; the cypress configs that opened the home page for the image captcha now open that page. The MUI stylesheet and the float-label script are gone.
