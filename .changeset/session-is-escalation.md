---
"@prosopo/types": patch
"@prosopo/types-database": patch
"@prosopo/database": patch
"@prosopo/provider": patch
---

Persist `isEscalation: true` on Session records minted by the post-PoW routing machine.

The escalation path in `submitPoWCaptchaSolution.buildEscalation` creates a follow-up session (image or puzzle) whenever the router decides the PoW-verified user still needs a stronger challenge. Analytics couldn't previously separate those escalated sessions from cold frictionless sessions since both shared the same shape — every downstream count that wanted to reason about "did we escalate this user?" had to reverse-engineer the origin/escalation link from the redis cache mapping.

The field is optional on the schema and only written when true, so ordinary frictionless sessions stay slim and older records still parse.
