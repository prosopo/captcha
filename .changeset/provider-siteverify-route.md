---
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/cli": patch
---

Experimental: providers now accept siteverify requests directly at `POST /v1/prosopo/provider/client/site/verify`, taking the same body as the hosted siteverify endpoint (token plus the site's secret key, JSON or form-encoded). The provider checks the secret belongs to the token's site key, signs the request with it and hands it to the normal verify route for the token's captcha type, so forwarding to the issuing provider works as before and the secret never leaves the provider it was sent to. Responses match the hosted endpoint, including leaving out the provider's session id.

The route is rate-limited per site key (from the `Prosopo-Site-Key` header, falling back to IP), as the PoW and image verify routes are, because calls reach it through shared egress IPs. Nothing routes traffic to it yet.
