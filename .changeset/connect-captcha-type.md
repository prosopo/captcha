---
"@prosopo/connect-assets": minor
"@prosopo/procaptcha-connect": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/database": minor
"@prosopo/provider": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/locale": minor
"@prosopo/keyring": minor
"@prosopo/widget-skeleton": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/cli": patch
---

Add `connect`, a fourth solvable captcha type, alongside `image`, `pow` and `puzzle`.

The user is shown a board of procedurally generated tiles with one line one tile short of complete, and drags a loose tile into the gap that finishes it. Boards are laid out server-side with exactly one winning move, persisted, and then rendered — the submitted move is scored by replaying it against the stored board rather than by comparing it to a remembered answer, so any move that genuinely completes a line is accepted.

Tiles are synthesised per challenge from a seeded PRNG (`@prosopo/connect-assets`) with per-cell rotation, scale and hue jitter, so no two tiles of the same icon are byte-identical and nothing is learnable across sessions. Board size, line length, icon count and decoy density are configurable per client and per traffic-filter category, defaulting to a 5x5 board and a line of five.

`connect` is a peer of the existing types throughout: it has its own `/captcha/connect`, `/connect/solution` and `/connect/verify` endpoints, its own session and captcha records, its own widget (`@prosopo/procaptcha-connect`), and it can be selected by a site's `captchaType`, by an access-rule Restrict policy, by a traffic-filter category, and by a routing machine. The shipped global routing machine is unchanged and does not yet route to it.
