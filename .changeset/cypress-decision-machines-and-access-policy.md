---
"@prosopo/cypress-shared": patch
---

test(cypress): add coverage for routing / decision-machine / access-policy paths

Adds four new end-to-end specs plus the two shared commands they need:

- `installDecisionMachine` — publishes a `Kind.Decision` DM (verify-phase) scoped to a test sitekey. Sibling of the existing `installRoutingMachine`.
- `addAccessRules` / `deleteAllAccessRules` — wraps the user-access-policy admin HTTP endpoints. Previously there was no cypress hook for these at all.
- `routingFrictionless.cy.ts` — installs a test-only routing DM that reads a synthetic `X-Test-Route-To` header and returns image or puzzle; asserts the widget hits the right challenge endpoint (no PoW).
- `postPowPuzzle.cy.ts` — mirror of `escalation.cy.ts` but for the puzzle branch of the post-PoW escalation. Guards the pow→puzzle onEscalate coord forwarding.
- `decisionMachineDeny.cy.ts` — installs a decide() DM that always denies; asserts the widget mints a token client-side but `/signup` returns 401 with `verified:false`.
- `accessPolicy.cy.ts` — inserts a per-clientId Block rule with `deferToVerify:true`; same `/signup` 401 assertion. Fills the "zero cypress coverage for access policies" gap.

Test-only DMs are inline JS strings in each spec, gated on synthetic headers or unconditional denies — deliberately generic so the source reads as a plumbing check, not a mirror of production rules.
