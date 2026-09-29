---
"@prosopo/provider": patch
---

Client captcha requests are now refused when the site key in the request body differs from the `prosopo-site-key` header. The allowed-domain check reads the header, but the captcha handlers act on the site key in the body, so a page on one site could send its own site key in the header and another site's key in the body and get that other site's challenges without its domain being allowed. The same gap let the reserved test site keys, which skip the domain check, carry any site's key in the body.
