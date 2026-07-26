---
"@prosopo/cypress-shared": patch
---

test(cypress): access policy verify-time, Restrict, and conflict resolution coverage

Fills the three access-policy gaps left after the initial coverage pass:

- **`accessPolicy.cy.ts`** — third `it` block that drives Block+deferToVerify all the way through: solve the captcha normally, submit signup, assert /signup returns 401 with verified:false. The prior spec only proved the request went through at request time; this one proves the block actually fires downstream at verify.
- **`accessPolicyRestrict.cy.ts`** (new) — three tests covering the Restrict policy shape: matching captchaType passes through (200); pinned mismatched captchaType returns 400 INCORRECT_CAPTCHA_TYPE at request time; the same mismatched pin with `deferToVerify: true` is skipped by the endpoint filter and returns 200 (locks in the current no-op observable so future changes surface deliberately).
- **`accessPolicyConflicts.cy.ts`** (new) — two rule-conflict specs: a narrow (clientId+ip) Restrict beats a broad deferToVerify Block once both reach the endpoint handler; a Block beats a Restrict at equal specificity via the harshness tiebreaker. Documents in the spec header that blockMiddleware's `blockOnly: true` filter means non-defer Block always wins at request time — specificity only decides between rules that actually reach `getPrioritisedAccessPolicies`.

Combined coverage now spans every Block/Restrict × deferToVerify variant plus the two rule-ranking axes (specificity + harshness).
