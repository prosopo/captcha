---
"@prosopo/provider": patch
---

fix(provider): pick the harshest matching access rule, not the first. When multiple access rules match a request, ranking now sorts by harshness first (Block > Restrict[image, rounds DESC] > Restrict[puzzle] > Restrict[pow]) with specificity as a tiebreaker. Block always beats Restrict regardless of specificity — closes a gap where a more-specific Restrict could be picked over a less-specific Block. `deferToVerify` is preserved on the chosen rule and continues to control request-time vs verify-time enforcement.
