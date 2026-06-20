---
"@prosopo/provider": patch
"@prosopo/types": patch
---

Extend verify-phase `DecisionMachineInput` with the session-derived fields the internal scorer/router already uses: `score`, `threshold`, `scoreComponents`, `decryptedHeadHash`, `userSitekeyIpHash`, `providerSelectEntropy`, `simdReadings`, `frictionlessReason`, `ruleType`, `webView`, `iFrame`. All fields are optional; existing decision-machine artifacts continue to work. Populates the new fields from `sessionRecord` at the three verify call sites (`powTasks`, `imgCaptchaTasks`, `puzzleTasks`).

Also move the `autoBanScoreThreshold` check in `runDecisionMachine` to after all score-based penalties (webView, oldTimestamp, unverifiedHost) are applied. Previously the check ran against the pre-penalty score (`baseBotScore + lScore`), meaning thresholds above 1.0 were unreachable for clients whose detector saturates at 1.0 even when the post-penalty sum (the value the bot-score-above-threshold branch sees) comfortably exceeded the operator-set threshold. The check now operates on the full scored sum, matching the semantic operators expect from an "auto-ban threshold" knob. UA-mismatch and context-aware short-circuits still run first since neither touches the score.
