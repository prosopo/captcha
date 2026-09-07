---
"@prosopo/web-bot-auth": minor
"@prosopo/provider": minor
"@prosopo/types": minor
"@prosopo/types-database": minor
"@prosopo/user-access-policy": minor
"@prosopo/api": minor
"@prosopo/server": minor
"@prosopo/procaptcha-frictionless": minor
"@prosopo/cli": patch
"@prosopo/config": patch
---

Web Bot Auth verifier and an authenticated frictionless flow for verified agents.

**`@prosopo/web-bot-auth`** — a new package: an RFC 9421 HTTP Message Signatures verifier built on `@noble/curves/ed25519`, with no Cloudflare dependency. It parses `Signature-Agent` in both its bare-string and dictionary forms, resolves the signer's JWKS at `/.well-known/http-message-signatures-directory` honouring the response's cache-control TTL, and verifies the Ed25519 signature over the RFC 9421 signature base.

**Provider fast path.** When a request to `/captcha/frictionless` carries a valid signature and matches an `AccessPolicyType.Allow` rule on its Signature-Agent URL, the provider returns `captchaType: authenticated` and writes a session with `serverChecked: false`, `agent: true`, `webBotAuthAgent`, and the issuing IP frozen for verify-time binding. Decrypt, bot score and the decision machine are all skipped. This is opt-in per site via `allowAgents`: the flow issues a bearer token that skips the solve cost, so the operator makes that trust decision explicitly. With `allowAgents` off, verified agents are still identified on the userScope so per-agent access rules can act on them, but they follow the normal challenge flow.

**`/client/authenticated/verify`.** A separate router with mandatory IP binding — the operator must forward the client IP (`API.AUTHENTICATED_IP_REQUIRED`) and it must match the one the session was issued to (`API.AUTHENTICATED_IP_MISMATCH`), so a leaked token cannot be replayed from elsewhere. Single use is enforced through `serverChecked`, and `captchaType` is checked so an ordinary captcha token cannot be redeemed on this route. `clientSessionId` correlation goes through the same `isClientSessionMismatch` helper as pow / image / puzzle, so the authenticated path cannot drift from the others.

`serverChecked` is added to `SESSION_PROJECTION`: without it the single-use check would read `undefined` and an authenticated token would verify an unlimited number of times.

**Surface.** `AccessPolicyType.Allow` and `CaptchaType.authenticated`; `webBotAuthAgent` on the user scope (indexed, normalised at parse time to a lowercase scheme+host with no trailing slash, matched by exact equality after verification); `Session.agent` / `Session.webBotAuthAgent` for the Traffic view's "pre-verified pass" filter; `submitAuthenticatedCaptchaVerify` on `ProviderApi` and the matching branch in `@prosopo/server.verifyProvider`; `AuthenticatedBadge` and a dispatch branch in `procaptcha-frictionless`.
