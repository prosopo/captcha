---
"@prosopo/provider": patch
---

Port the checks the PoW solution route runs to Rust: the proof-of-work and signature checks, the click-coordinate check, the platform flags, the captcha type coercion for an escalation, and the puzzle difficulty draw. Tests replay the TypeScript's own results for each. The TypeScript is unchanged.
