---
"@prosopo/provider": patch
---

fix(provider): apply autoBanScoreThreshold after access-policy bump

`handleAccessPolicy` applies `scoreIncreaseAccessPolicy` and then short-circuits
to `sendImageCaptcha` / `sendPowCaptcha` / `sendPuzzleCaptcha` for non-block
policies. The autoBan check in `runDecisionMachine` never sees the post-bump
score because the access-policy outcome returns first. Re-evaluate the
threshold after the bump so a session whose access-policy penalty pushes it
over `autoBanScoreThreshold` is registered as `AUTO_BAN_SCORE` and 401's,
regardless of whether the policy routes to image, pow, or puzzle.
