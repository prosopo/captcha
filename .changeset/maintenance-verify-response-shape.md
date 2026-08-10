---
"@prosopo/provider": patch
---

Make the maintenance-mode verify response match the shape of a real one.

The three `/verify/{image,pow,puzzle}` maintenance short-circuits returned only
`{ status: "ok", verified: true }`, dropping two fields a normal verify sends:

- `status` is now the localised `API.USER_VERIFIED` string ("User verified")
  rather than a bare `"ok"`. A real verify never returns `"ok"` on this field,
  and integrations do match on it.
- `score` is now always sent, as `0`. It is normally tier-gated on the client
  record (`canClientSeeScore`), which lives in Mongo — the thing maintenance
  mode exists to work without — so it cannot be gated here. Paid-tier callers
  that read the documented `score` field were receiving `undefined`, which
  inverts a `score < threshold` test into a rejection of a user the provider had
  just passed. `0` is the most-human end of the scale and matches what the AWS
  verify handler already synthesises when a provider call times out.

`reason` is failure-only and maintenance mode always passes, so it never
applied. `commitmentId` stays absent on image verifies — no commitment exists to
reference.
