---
"@prosopo/provider": patch
---

fix(provider): on equal specificity, pick the harshest matching access rule. Specificity remains the primary criterion (a more-specific rule still wins), but the equal-specificity tiebreaker is extended from the previous Block-vs-Restrict-only severity check to a full harshness ordering: Block > Restrict[image, rounds DESC] > Restrict[puzzle] > Restrict[pow]. `deferToVerify` continues to control request-time vs verify-time enforcement and doesn't affect ranking.
