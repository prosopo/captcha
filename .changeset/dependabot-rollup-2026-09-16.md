---
"@prosopo/cli": patch
"@prosopo/config": patch
"@prosopo/locale": patch
"@prosopo/provider": patch
"@prosopo/util-crypto": patch
"@prosopo/web-bot-auth": patch
---

chore(deps): roll up the open dependabot bumps (@noble/curves 2, cron 4, i18next-http-backend 4, i18next-chained-backend 5, @polkadot/x-randomvalues 14, smoldot 3, @rollup/plugin-typescript 12, rollup 4.63.2, cron-parser 5.10.1, cypress-real-events 1.15.1)

@babel/preset-typescript 8 and @babel/plugin-transform-runtime 8 are left out because they need @babel/core 8, and the webpack bundle cannot parse TypeScript without it. web-bot-auth now imports `@noble/curves/ed25519.js`, the only path @noble/curves 2 exports.
