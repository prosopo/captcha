---
"@prosopo/types-database": patch
"@prosopo/provider": patch
---

Make the traffic-filter tarpit actually reach a visitor. As shipped, `padBytes` could not survive being saved and never fired on the endpoint nearly every site uses, so no response was ever padded.

`TrafficCategoryPolicySchema` in `types-database` never declared `padBytes`, and Mongoose drops undeclared fields on write. The setting round-tripped through zod at both ends — the portal's site save and the provider's client-list push — and was then thrown away by the database at each, so `checkTrafficFilter` only ever read `undefined`. Declared now, bounded to the same 0–5 MiB range zod enforces.

The frictionless endpoint resolved a traffic-filter verdict but never passed its `padBytes` to the response middleware, so only the direct `/pow`, `/image` and `/puzzle` endpoints padded anything. It is now set as soon as the verdict is known, which covers both the challenge the traffic filter dispatches and the one the decision machine issues.

Also stops the padding writer emitting invalid JSON for a body with no fields (it spliced in a trailing comma), and leaves a non-object body unpadded rather than corrupting it.

Tests: the Mongoose round-trip for a challenge and a blocked category plus the cap, `resolvePadBytes` across block/challenge/multiple matches, the request-time verdict carrying the count, the frictionless handler attaching it, and the padding middleware itself — byte count, pad-first ordering, incompressibility, the 5 MiB clamp, and the untouched-by-default path.
