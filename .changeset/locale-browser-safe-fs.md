---
"@prosopo/locale": patch
---

Browser apps that bundle `@prosopo/locale` (such as the portal) build again. The server catalogue lookup imported `existsSync` by name from `fs`, which browser bundlers replace with an empty module, so the build failed. It now reaches `fs` only when the server starts i18next.
