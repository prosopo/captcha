---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

Stop the puzzle difficulty ladder silently replacing a site's own puzzle settings.

An escalated puzzle session samples its render settings from a difficulty band, and a sampled band sets every knob — decoy count, edge darkness, hole darken, piece scale and tolerance. While that is happening the site's configured `puzzle` block and `puzzleTolerance` are not consulted at all. For a site using escalation that is the intent; for a site that deliberately configured an easier puzzle it means the settings it saved never render, which reads as "my settings aren't being saved".

Two changes:

`puzzleMaxDifficulty` is a new client setting — the puzzle counterpart to `imageMaxRounds`. It caps how far automatic escalation may climb the ladder, and `0` pins the site to level 0, the documented "nothing escalated" case where the session is left bare and the site's own settings render every time. It defaults to `MAX_AUTO_ESCALATION_LEVEL`, so sites that never set it keep the behaviour they have.

Separately, the paths that measured nothing about a client — `MISSING_TOKEN`, `MISSING_HEAD_HASH` and `DECRYPTION_FAILED` — no longer feed the ladder. Each sizes its challenge from a fixed constant chosen to be short ("prove you're human quickly", per their own comments), not from any signal the client produced, but those constants sit above the default baseline of `DEFAULT_SOLVED_COUNT` and so scored as an escalation. A site whose CSP blocks the detector bundle sends no token on every request, so every one of its users was permanently escalated. `OLD_TIMESTAMP` deliberately keeps the ladder: its round count comes from `timestampDecayFunction`, which scales with staleness and is a real graduated measurement.

Explicit router and traffic-filter overrides are unaffected in both cases — an operator naming a value still gets it.
