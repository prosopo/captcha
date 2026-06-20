---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Extend verify-phase `DecisionMachineInput` with the session-derived fields the internal scorer/router already uses: `score`, `threshold`, `scoreComponents`, `decryptedHeadHash`, `userSitekeyIpHash`, `providerSelectEntropy`, `simdReadings`, `frictionlessReason`, `ruleType`, `webView`, `iFrame`. All fields are optional; existing decision-machine artifacts continue to work. Populates the new fields from `sessionRecord` at the three verify call sites (`powTasks`, `imgCaptchaTasks`, `puzzleTasks`).
