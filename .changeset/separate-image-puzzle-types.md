---
"@prosopo/types": minor
"@prosopo/types-database": patch
"@prosopo/provider": patch
"@prosopo/server": patch
---

Name the captcha-type sets, and serve or verify each type from one table.

`@prosopo/types` now exports three named sets in place of the unions that were
spelled out by hand across the codebase:

- `ChallengeCaptchaType`: pow, image, puzzle, icon-order and audio. Anything a
  user can be asked to solve.
- `ConcreteCaptchaType`: the same minus audio. What a session can be minted
  as (moved here from the provider).
- `InteractiveCaptchaType`: image, puzzle and icon-order. What a PoW solve can
  escalate into.

Each has a constant array, a schema and an `is…` guard.
`DecisionMachineCaptchaTypeSchema` and `DecisionMachineCaptchaType` stay as
aliases.

The provider serves a chosen type through one `sendChallenge` table, used by
the configured-type short-circuit and the access-policy handler. The server
verifies through one table keyed on `ChallengeCaptchaType`. A new type that is
missing from either table is a compile error.

Behaviour changes:

- An access rule that pins icon-order now serves icon-order. Before, the
  access-policy handler only knew image, pow and puzzle, so the rule was
  ignored and the request fell through to the decision machine.
- A blocked session is recorded against the type the request would have been
  served instead of always `image`. Per-type session counts already exclude
  blocked sessions, so traffic figures do not move.

Sessions also store `challengeParams`, the type-specific knobs grouped under
the type the session was minted as. It is written alongside the existing flat
fields, which stay the source of truth, so no reader or backfill changes are
needed.
