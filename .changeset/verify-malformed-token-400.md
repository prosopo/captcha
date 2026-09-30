---
"@prosopo/provider": patch
---

Return 400, not 500, when a verify request carries an undecodable token.

Every verify endpoint (image, PoW, puzzle and authenticated-session) decodes
the hex `ProcaptchaToken` inside a `try` whose `catch` answers
`API.BAD_REQUEST` with HTTP 500. The body schema only checks that the token is
a bounded `0x`-prefixed string, so a value like `0x1234` passes validation and
then fails to decode into a `ProcaptchaToken` SCALE struct — a bad-input case,
not a server fault.

The endpoints are unauthenticated, so any caller could make the provider
answer 500 at will. That mis-signals provider health and inflates the
error-rate metrics that alerting and the http_requests_total status label feed
from, without leaking anything (the response body is unchanged).

Decoding now goes through a helper that maps a decode failure to a 400
`CAPTCHA.PARSE_ERROR`, matching the existing 400 the same endpoints already
return for a non-hex token. Genuine server errors later in each handler still
surface as 500.
