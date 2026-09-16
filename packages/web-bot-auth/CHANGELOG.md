# @prosopo/web-bot-auth

## 0.1.0
### Minor Changes

- af267c2: Web Bot Auth verifier and an authenticated frictionless flow for pre-verified agents.
  
  **`@prosopo/web-bot-auth`** — a new package: an RFC 9421 HTTP Message Signatures verifier built on `@noble/curves/ed25519`, with no Cloudflare dependency. It parses `Signature-Agent` in both its bare-string and dictionary forms, resolves the signer's JWKS at `/.well-known/http-message-signatures-directory` honouring the response's cache-control TTL, and verifies the Ed25519 signature over the RFC 9421 signature base.
  
  **Provider fast path.** `/captcha/frictionless` returns `captchaType: authenticated` when a non-`deferToVerify` `AccessPolicyType.Allow` rule matches the request's user scope, and writes a session with `serverChecked: false`, `agent: true` and the issuing IP frozen for verify-time binding. Decrypt, bot score and the decision machine are all skipped. A verified `Signature-Agent` is one way to qualify — the userScope gains a `webBotAuthAgent` field, set only when signature verification succeeded so a rule scoped to a signer can never be matched by a spoofed header — but an IP CIDR, JA4, user agent, ASN or country rule qualifies the same way. A `Block` or `Restrict` on the same match set always wins, because severity outranks Allow.
  
  **`/client/authenticated/verify`.** A separate router with mandatory IP binding — the operator must forward the client IP (`API.AUTHENTICATED_IP_REQUIRED`) and it must match the one the session was issued to (`API.AUTHENTICATED_IP_MISMATCH`), so a leaked token cannot be replayed from elsewhere. Single use is enforced through `serverChecked`, and `captchaType` is checked so an ordinary captcha token cannot be redeemed on this route. `clientSessionId` correlation goes through the same `isClientSessionMismatch` helper as pow / image / puzzle, so the authenticated path cannot drift from the others.
  
  **Surface.** `AccessPolicyType.Allow` and `CaptchaType.authenticated`; `webBotAuthAgent` on the user scope (indexed, normalised at parse time to a lowercase scheme+host with no trailing slash); `Session.agent` / `Session.webBotAuthAgent` for the Traffic view's "pre-verified pass" filter; `submitAuthenticatedCaptchaVerify` on `ProviderApi` and the matching branch in `@prosopo/server.verifyProvider`; `AuthenticatedBadge` and a dispatch branch in `procaptcha-frictionless`.
  
  Three fixes the new end-to-end coverage turned up, each of which broke the flow outright:
  
  - `ipMatchesSession` compared the operator's parsed IP against the session's composite halves with `===`. A session read back from Mongo carries BSON (`Decimal128`, or `Long` on pre-migration records), not the `bigint` the type claims, so the comparison was false for every session that had been through the database — every legitimate redemption was rejected as `API.AUTHENTICATED_IP_MISMATCH`. Both halves are now normalised before comparison, and an unparseable half fails closed rather than defaulting to `0n`, so garbage still cannot match garbage.
  - `serverChecked` was never written onto the authenticated session, so "never set" and "consumed" were distinguishable only by an absence. It is now written as `false` at issuance.
  - `serverChecked` was missing from `SESSION_PROJECTION`. Left out, the single-use check reads `undefined` and an authenticated token verifies an unlimited number of times.
