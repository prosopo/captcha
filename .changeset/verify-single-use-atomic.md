---
"@prosopo/provider": patch
"@prosopo/database": patch
"@prosopo/types-database": patch
---

A captcha token could be verified more than once if a site sent several verify calls for it at the same moment: each call read "not checked yet" before any of them marked it checked. Marking a solution as checked now only succeeds for the first caller, and every other concurrent call gets `API.USER_ALREADY_VERIFIED`. This covers image, PoW, puzzle and authenticated sessions.
