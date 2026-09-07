---
"@prosopo/provider": patch
---

Remove the account-wide commitment fallback from image captcha verification.

`verifyImageCaptchaSolution` fell back to `getDappUserCommitmentByAccount` when
the token carried no `commitmentId`, returning the first *approved* commitment
in the account's history — any age, any session.

That fallback predates the Procaptcha token (#1263, 2024-06-06), which has
carried `commitmentId` on every image solve since; `Manager.ts` sets it
unconditionally for this captcha type, and it is `optional()` on the schema only
because PoW shares the token shape and identifies its work by `challenge`.

It could only ever return the wrong record. For a returning user whose current
solve was not yet approved it produced an approved commitment from an earlier
visit, which carries no `clientSessionId`, so the session correlation compared
the live id against `undefined` and reported `CLIENT_SESSION_MISMATCH` — a token
replay that never happened. Observed in production at scale on the image
path while PoW, which resolves its exact challenge record, was unaffected.

Verification now requires a `commitmentId` and returns
`API.USER_NOT_VERIFIED_NO_SOLUTION` without one. A token that names no
commitment cannot be verified against one.
