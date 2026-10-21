# Provider Rust migration log

One line per step: package | status | commit | what is left. Plan: `packages/provider/MIGRATION.md`.

- plan | DONE | (this commit) | packages/provider/MIGRATION.md written; no code changed.
- captcha-severity | DONE | 2e5e13307 | Whole package ported (54/54 TS cases, 9,151 equivalence vectors match). Also adds the root Cargo workspace. Left: replace its local CaptchaType enum with the one from the types crate once that exists.
- logger | DONE | 95a855d24 | Whole server-side package ported (59/63 TS cases; the 4 left are browser-only). 347 byte-exact equivalence scenarios. Left: BigInt values must be passed as decimal strings by callers (no BigInt in JSON values).
- puzzle-assets | DONE | b166f1c5e | Whole server-side package ported (57/57 TS cases, 1,450 pixel-exact vectors). Left: WebP bytes differ from sharp (accepted, MIGRATION.md 4.7); background code duplicated with native-puzzle until cut-over. Finding: native-puzzle uses glibc exp/powf and (v+0.5).floor() rounding, which can differ from V8 in the last bit, so its pixels could rarely drift from the TS.
- web-bot-auth | DONE | e2598e54f | Whole package ported (38/38 TS cases, 456 equivalence vectors). Ed25519 verify uses ZIP-215 rules on curve25519-dalek to match @noble/curves. Open question: verifyWebBotAuth throws (rather than returning a failure reason) for an unparseable Signature-Agent URL and for a null JWKS entry before the matching key; the Rust port keeps that behaviour. Should those become failure reasons? Note: b166f1c5e and e2598e54f replace two local commits whose pnpm-lock.yaml carried a stray tsx entry for an uncommitted package. Nothing was pushed.
- api-route | DONE | e748d9e16 | Whole package ported (33/34 TS cases; the remaining one checks tree-shaking). ValidationIssue serialises like a ZodError for later 400 bodies. Left: the axum adapter lands with api-express-router.
- util | DONE | 84335fb5c | Server-side subset ported (135/138 in-scope TS cases, 2,833 equivalence vectors). Not ported: ofLen, lodash wrappers, seedrandom, isMain, stringifyBigInts, get, unflatten, hammingDistance, merge (JS-only or no server callers). Known deviation: IDNA maps capital sharp S differently (Unicode version).
- dotenv | DONE | (this commit) | Whole package ported (53 Rust tests for the 51 TS cases; 1,580 parse, 297 discovery and 96 load equivalence vectors match, regenerated from the TS and checked to fail under a one-character parser mutation). The parser is a port of dotenv 16.4.5 (the version the TS pins), not the dotenvy crate the plan named, so the 1,580 parse vectors pin dotenv's own rules.
- owner decisions | DONE | (this commit) | MIGRATION.md updated for the 2026-10-21 decisions (WASM, private repo, mongoose, zod, equivalence, sr25519, napi, versioning). All workspace crates now 6.0.0 via `[workspace.package]`.
- napi | PENDING | – | native-ja4, native-merkle and native-puzzle each have one Node caller, the TS provider (`packages/provider`). Deleting them now would break it, so each is deleted in the commit that lands the provider port.

## versioning

- Rust crates: 6.0.0, done. npm: no Rust-backed artifact exists yet, so nothing to version as `6.0.0-rust.N` today.
- Moving the plain JS line to 6.0.0 is left for the release owner. The packages are on mixed versions today (logger 2.1.4, dotenv 3.0.61, provider 5.19.2, cli 3.8.33), and a changeset can only bump by a level (a "major" turns 3.0.61 into 4.0.0), so landing every package on exactly 6.0.0 means setting the versions by hand at release time. The changesets on this branch stay `patch` because the TS is unchanged.
- To settle before the first `6.0.0-rust.N` publish (not blocking any port yet): (a) under semver, `6.0.0-rust.N` sorts *below* `6.0.0`, and a range like `^6.0.0-rust.3` also matches a later plain-JS `6.0.1`, so anyone depending on the Rust-backed artifact must pin an exact version or they silently get the JS one; (b) changesets' prerelease mode applies to the whole repo, so the `-rust.N` line cannot be versioned by changesets from the same branch as the plain 6.0.0 line, and needs its own version step; (c) it must be published under its own dist-tag so `latest` stays on the JS line.

## deployment

Changes for a human to make; nothing here has been applied.

- None needed yet: no Rust service binary exists. The first entry lands with `cli` (phase 0 in MIGRATION.md §3).
