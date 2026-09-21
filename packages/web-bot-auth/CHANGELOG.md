# @prosopo/web-bot-auth

## 0.1.2
### Patch Changes

- a9141c3: Ship one copy of each crypto library in the widget instead of two or three.
  
  The bundle contained three separate copies of `@noble/hashes` and two of `@polkadot/util`, because different packages asked for different major versions and npm installed each one in its own folder. Same code, bundled repeatedly. The widget's eager payload drops by about 6KB gzipped.
  
  Two stale version pins caused it:
  
  - `@prosopo/util-crypto` asked for `@noble/hashes` 1.8.0 while its own dependencies `@noble/curves` and `@scure/sr25519` asked for 2.4.0, so npm installed both majors. Everything is now on 2.4.0. The v2 import paths changed (`@noble/hashes/sha256` is now `@noble/hashes/sha2.js`, `blake2b` is `blake2.js`); the functions themselves are unchanged.
  - `@prosopo/util-crypto` asked for `@polkadot/x-randomvalues` 13.5.7, which in turn demands exactly `@polkadot/util` 13.5.7. Every other package in the repo asks for 14.0.3, so npm put the old one in the shared folder and gave each package its own private copy of the new one. Bumping that single pin to 14.0.3 leaves one shared copy. As a side effect `@prosopo/util-crypto` now gets the `@scure/base` 2.4.0 it always asked for, rather than the 1.2.6 it was silently given.
  
  `@prosopo/keyring` no longer depends on `@polkadot/util-crypto`. It was used for one type, which `@prosopo/util-crypto` already exports.
  
  The repo root now names the versions the workspace standardises on (`@noble/hashes`, `@noble/curves`, `@scure/base`, `@scure/sr25519`), which is what keeps npm putting them in the shared folder. Older majors are still installed for the Polkadot web3 packages that require them; those load only in web3 mode and are unaffected.
  
  Covered by the existing test suites for each package, all passing unchanged.

## 0.1.1
### Patch Changes

- f4e4a83: chore(deps): roll up the open dependabot bumps (react 19.3, mongoose 9.10, @polkadot/util 14, redis 6, cron-parser 5, react-i18next 17 with i18next 26, @scure/base 2, cypress 16, rollup/babel plugin majors, vitest 4.1.11, angular 20.3.28, js-yaml)

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
