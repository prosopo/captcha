# @prosopo/captcha-severity

## 1.1.0
### Minor Changes

- 424e467: Add `@prosopo/captcha-severity` and use it for the access rules and the traffic filter.
  
  "Which captcha challenge is stricter" is one idea with several callers, and each answered it with its own table: the traffic filter combining multiple `challenge` matches on one request (`resolveChallengePolicy`), the access rules breaking ties between equally-specific rules (`ruleHarshness`), and downstream routing consumers. They agreed on the order — image > puzzle > pow > frictionless — but nothing held them to it, and they disagreed on the encoding.
  
  The new package has **zero dependencies**, deliberately. Captcha types are string enums, so a plain `string` parameter accepts them without importing `CaptchaType` — and that import would not be free, because it lives in a module that pulls zod in for its schemas. Some consumers bundle this standalone under a hard source-size ceiling that a runtime dependency on the `@prosopo/types` barrel has breached before.
  
  Two APIs, because "stricter" means two different things:
  
  - `rankCaptchaType` / `isStricterCaptchaType` compare the **type alone**, for callers that choose the type independently of its settings — as the traffic filter does, picking the strictest type and then separately merging the hardest parameters from every matched category.
  - `captchaPolicySeverity` / `isStricterCaptchaPolicy` compare a **whole policy**, type first and its own difficulty setting second, for callers where one complete policy must beat another and a tie on type alone would otherwise be decided by argument order.
  
  **Fixes an ordering bug in the access rules.** `ruleHarshness` scored `base + solvedImagesCount` with tiers 10 apart, and `solvedImagesCount` is validated by `imageMaxRoundsFieldSchema` — `number().int().min(2)`, with no upper bound and an `imageMaxRounds` default of 32. A `Restrict[pow]` rule carrying 32 rounds therefore scored 42 and outranked a `Restrict[image]` rule at 30, exactly inverting the intended order; 11 rounds on a puzzle rule was enough to do it. The intra-type component is now clamped below the tier gap, so no setting can lift a rule over a stricter captcha type.
  
  One further behaviour change: pow rules now break ties on `powDifficulty` rather than `solvedImagesCount`. Rule authoring drops `solvedImagesCount` for pow, so every pow rule previously scored at the bottom of its tier regardless of difficulty. Image and puzzle both keep `solvedImagesCount` — it is the severity currency they share, which the provider maps onto a puzzle difficulty level via `severityToPuzzleDifficulty` rather than treating as a literal round count.
- 3d2176d: Move the puzzle difficulty ladder into `@prosopo/captcha-severity`, so every consumer derives a difficulty from one table.
  
  `PUZZLE_DIFFICULTY_LEVELS`, `MAX_AUTO_ESCALATION_LEVEL`, `MIN_DECOY_HOLE_DARKEN_MARGIN`, `clampDifficultyLevel` and `severityToPuzzleDifficulty` lived in `provider/src/tasks/puzzle/puzzleDifficulty.ts`, reachable only from inside the provider — the severity package's own docs described the ladder at length but did not hold it. Anything else that has to answer "what difficulty is this puzzle" had to restate the mapping, and the consumers that author and edit puzzle rules sit outside the provider.
  
  They can import it now. The severity package already answers "which of these policies is stricter" off `solvedImagesCount`; the ladder answers what a puzzle policy carrying that number is actually served at, which is the same question one step further in.
  
  Sampling a concrete render from a level's bands stays in the provider as `samplePuzzleDifficulty`: it needs `IPuzzleSettings` from `@prosopo/types` and a `node:crypto`-backed sampler, and the severity package's zero-dependency, browser-safe property is load-bearing for consumers that bundle it standalone.
  
  Adds `puzzleDifficultyToSeverity`, the inverse of `severityToPuzzleDifficulty`. Writers need that direction — a rule editor turning a chosen difficulty into the field the rule carries, or rule authoring normalising a count inherited from the image path. Each level spans two rounds, so without a canonical value per level a writer picks between numbers that produce the identical puzzle, and the difference survives only to break severity ties arbitrarily. The round-trip is pinned by tests.
  
  No behaviour change in the provider: same table, same thresholds, same clamping.
