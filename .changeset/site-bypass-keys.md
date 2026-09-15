---
"@prosopo/user-access-policy": minor
"@prosopo/types": minor
"@prosopo/api": minor
"@prosopo/provider": minor
"@prosopo/procaptcha-frictionless": minor
---

Site bypass keys: a browser carrying a site's bypass key skips the CAPTCHA on that site.

The widget reads a `prosopo_bypass_key` cookie from the page and sends it with the frictionless request. The provider
hashes it (SHA-256) and adds the hash to the request's user scope as `bypassKeyHash`, a new access-rule field. A
site-scoped Allow rule carrying that hash then takes the existing authenticated fast path, so the visitor gets an
`authenticated` token without a challenge, and verification still requires the visitor's IP. Rules only ever hold the
hash, never the key.

A reused frictionless session is now also evicted when an Allow rule matches and the cached session is not already
authenticated, so a visitor who loaded the page before adding a key, or before an IP Allow rule was created, is not
left on the old challenge.
