---
"@prosopo/logger": patch
"@prosopo/api-express-router": patch
"@prosopo/provider": patch
---

Fix request-scoped logger fields leaking across concurrent captcha requests, and give every endpoint a proper request/response envelope in OpenObserve.

Three interlocking changes:

- **`Tasks.setLogger` no longer mutates `db.logger`.** `env.getDb()` returns a
  process-wide singleton; overwriting `db.logger` on every request meant two
  concurrent captcha submits raced, and whichever request landed second
  stamped its `user`/`siteKey`/`sessionId` bindings onto the *other* request's
  DB-level log lines. In practice you'd see a `PuzzleCaptcha record updated
  successfully` for user A's challenge tagged with user B's account and site
  key, breaking log-based forensics. `setLogger` still updates the per-request
  Tasks instance and its per-request manager instances (those are safe —
  they're constructed inside the Tasks constructor) but stops mutating the
  shared DB. Callers in `getPoWCaptchaChallenge` and `getPuzzleCaptchaChallenge`
  now pass `req.logger` directly into `new Tasks(env, req.logger)` and drop
  the redundant `.setLogger(req.logger)` call that followed.

- **`requestLoggerMiddleware` now emits `Request received` and `Response sent`
  envelope lines on every route** (with `method`, `path`, `status`,
  `durationMs`, and the request id). Previously only `/frictionless` had a
  `res.on('finish', ...)` block, so `getPow/PuzzleCaptchaChallenge`,
  `submitPow/PuzzleCaptchaSolution`, `verify.ts` etc. produced no envelope in
  OO — a challenge issued by one endpoint and verified by another shared
  nothing you could group on. Health-probe paths (`/healthz`, `/health`,
  `/readyz`) are excluded so they don't drown the stream. The middleware
  also now mirrors `x-request-id` back on the outbound response so callers
  downstream of the Node process can correlate without depending on Caddy.

- **`requestId` (set on the request logger via `.with({requestId})`) is
  promoted to a top-level `req_id` field on the emitted JSON log record.**
  OpenObserve indexes top-level fields as their own columns, so
  `WHERE req_id = '…'` is now cheap; previously the id only lived inside
  `data.requestId`, which flattened to `data_requestid` in OO's ingestion
  and had no top-level column. `data.requestId` is preserved for backwards
  compatibility with existing dashboards. Two new unit tests in
  `@prosopo/logger` cover the promotion and the "absent when unset" case.
