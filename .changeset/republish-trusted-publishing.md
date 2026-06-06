---
"@prosopo/cli": patch
"@prosopo/provider": patch
---

Republish under npm trusted publishing.

No runtime change. The v3.6.30 publish landed only a partial slice of the workspace before npm rejected the rest (provenance verification + repository-field mismatch). Cutting a fresh version so every package gets a clean publish under the new OIDC-based workflow with provenance attestations attached.
