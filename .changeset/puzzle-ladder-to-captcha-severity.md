---
"@prosopo/captcha-severity": minor
"@prosopo/provider": patch
---

Move the puzzle difficulty ladder into `@prosopo/captcha-severity`, so every consumer derives a difficulty from one table.

`PUZZLE_DIFFICULTY_LEVELS`, `MAX_AUTO_ESCALATION_LEVEL`, `MIN_DECOY_HOLE_DARKEN_MARGIN`, `clampDifficultyLevel` and `severityToPuzzleDifficulty` lived in `provider/src/tasks/puzzle/puzzleDifficulty.ts`, reachable only from inside the provider — the severity package's own docs described the ladder at length but did not hold it. Anything else that has to answer "what difficulty is this puzzle" had to restate the mapping, and the consumers that author and edit puzzle rules sit outside the provider.

They can import it now. The severity package already answers "which of these policies is stricter" off `solvedImagesCount`; the ladder answers what a puzzle policy carrying that number is actually served at, which is the same question one step further in.

Sampling a concrete render from a level's bands stays in the provider as `samplePuzzleDifficulty`: it needs `IPuzzleSettings` from `@prosopo/types` and a `node:crypto`-backed sampler, and the severity package's zero-dependency, browser-safe property is load-bearing for consumers that bundle it standalone.

Adds `puzzleDifficultyToSeverity`, the inverse of `severityToPuzzleDifficulty`. Writers need that direction — a rule editor turning a chosen difficulty into the field the rule carries, or rule authoring normalising a count inherited from the image path. Each level spans two rounds, so without a canonical value per level a writer picks between numbers that produce the identical puzzle, and the difference survives only to break severity ties arbitrarily. The round-trip is pinned by tests.

No behaviour change in the provider: same table, same thresholds, same clamping.
