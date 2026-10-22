---
"@prosopo/captcha-severity": patch
---

Add the touch floors and the stale-payload ceiling to the Rust port of the captcha severity package (`TOUCH_MIN_TOLERANCE_PX`, `TOUCH_MIN_PIECE_SCALE`, `MAX_STALE_PAYLOAD_LEVEL`, `easeToleranceForTouch`, `easePieceScaleForTouch`), matching the TypeScript since v3.8.35.
