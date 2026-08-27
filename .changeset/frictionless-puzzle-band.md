---
"@prosopo/types-database": minor
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/cli": minor
---

Add a puzzle band to the frictionless flow.

`settings.frictionlessThreshold` becomes an object with two rungs instead of a single number:

```
frictionlessThreshold: {
  frictionlessPuzzleThreshold: 0.5,
  frictionlessImageThreshold: 1.0,
}
```

Scores at or below the puzzle rung still pass silently to PoW and scores at or above the image rung still get an image captcha, but everything in between — suspicious without being conclusive — now gets a puzzle rather than being lumped in with the worst traffic.

The puzzle rung defaults to the value `frictionlessThreshold` already had, so no site's silent-pass boundary moves. Putting both rungs on the same value opts out of the middle band.

A bare number is still accepted wherever the setting is read or parsed, and means what it always meant (the puzzle rung), so records written before this release keep working while they are migrated. Unlike the puzzle rung, the image rung is not capped at 1: the score it is compared against is a total that server-side penalties add to.

Image challenges served on the score path are now sized by how many signals fired, rather than a fixed count.
