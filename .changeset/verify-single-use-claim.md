---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
---

A captcha token now verifies at most once even when a site's server sends several verify requests for it at the same moment. Before, each request read the record, saw it had not been checked yet, and then marked it checked, so every request that arrived before the first write finished was accepted. Marking a PoW, puzzle or image result as checked is now a single conditional write, and only the request that wins it is verified. The same applies to image captcha submissions: a request hash can now only be spent by one submission, so answers can no longer be tried in parallel against one challenge.
