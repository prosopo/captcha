---
"@prosopo/client-example-server": patch
"@prosopo/cypress-shared": patch
"@prosopo/scripts": patch
"@prosopo/procaptcha-react": patch
---

Fix docs that still pointed at the removed React `client-example` demo and at scripts that no longer exist (`start:demo`, `build:bundle`, `cypress:open:client-example*`). They now use `client-bundle-example`, `start:bundle`, `bundle:all` and the per-spec `cypress:open:client-bundle-example:<spec>` scripts. The architecture diagram's header now cites symbols instead of line numbers, which had drifted.
