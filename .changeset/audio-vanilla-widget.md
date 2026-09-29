---
"@prosopo/procaptcha-audio": minor
"@prosopo/procaptcha-common": minor
"@prosopo/procaptcha-frictionless": patch
"@prosopo/procaptcha-react": patch
"@prosopo/procaptcha-puzzle": patch
"@prosopo/procaptcha-icon-order": patch
"@prosopo/client-bundle-example": patch
"@prosopo/cypress-shared": patch
---

Bring the audio widget in line with main.

The audio widget is rebuilt in plain TypeScript and DOM, like every other widget since React was removed. It now opens on the same challenge surface as the puzzle and icon-order challenges, so Escape closes it and focus stays inside it. After a wrong answer the replacement clip still tells the user they missed, including to a screen reader. It also picks up main's fixes to the other widgets: it no longer asks for a second challenge on a session it has already used, and it sends scroll events with the rest of the behaviour data.

The "Use audio instead" button is now a shared plain-DOM component in procaptcha-common, shown on the image, puzzle and icon-order challenges when the site has turned audio on. Like the other widget controls, it ignores clicks that a script makes.

The frictionless wrapper mounts the audio widget when the user asks for it, and keeps them on audio after a wrong answer.

The demo's audio pages are rebuilt on the new playground layout, and the audio end-to-end test now presses the button with a real click, including in the wrong-answer test, which never pressed it before.
