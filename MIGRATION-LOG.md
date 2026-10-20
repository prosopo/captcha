# Provider Rust migration log

One line per step: package | status | commit | what is left. Plan: `packages/provider/MIGRATION.md`.

- plan | DONE | (this commit) | packages/provider/MIGRATION.md written; no code changed.
- captcha-severity | DONE | 2e5e13307 | Whole package ported (54/54 TS cases, 9,151 equivalence vectors match). Also adds the root Cargo workspace. Left: replace its local CaptchaType enum with the one from the types crate once that exists.
- logger | DONE | 95a855d24 | Whole server-side package ported (59/63 TS cases; the 4 left are browser-only). 347 byte-exact equivalence scenarios. Left: BigInt values must be passed as decimal strings by callers (no BigInt in JSON values).
- puzzle-assets | DONE | b166f1c5e | Whole server-side package ported (57/57 TS cases, 1,450 pixel-exact vectors). Left: WebP bytes differ from sharp (accepted, MIGRATION.md 4.7); background code duplicated with native-puzzle until cut-over. Finding: native-puzzle uses glibc exp/powf and (v+0.5).floor() rounding, which can differ from V8 in the last bit, so its pixels could rarely drift from the TS.
- web-bot-auth | DONE | e2598e54f | Whole package ported (38/38 TS cases, 456 equivalence vectors). Ed25519 verify uses ZIP-215 rules on curve25519-dalek to match @noble/curves. Open question: verifyWebBotAuth throws (rather than returning a failure reason) for an unparseable Signature-Agent URL and for a null JWKS entry before the matching key; the Rust port keeps that behaviour. Should those become failure reasons? Note: b166f1c5e and e2598e54f replace two local commits whose pnpm-lock.yaml carried a stray tsx entry for an uncommitted package. Nothing was pushed.
- api-route | DONE | e748d9e16 | Whole package ported (33/34 TS cases; the remaining one checks tree-shaking). ValidationIssue serialises like a ZodError for later 400 bodies. Left: the axum adapter lands with api-express-router.
