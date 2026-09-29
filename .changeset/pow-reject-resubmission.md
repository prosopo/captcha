---
"@prosopo/provider": patch
---

A PoW captcha challenge can now only be submitted once. Before, submitting the same solved challenge again after the site's server had verified the token reset the record to "not yet checked", so the same token could pass server verification a second time for as long as the verify window lasted. Puzzle captchas already refused a second submission, and PoW now does the same.
