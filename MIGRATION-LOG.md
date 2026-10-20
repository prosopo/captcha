# Provider Rust migration log

One line per step: package | status | commit | what is left. Plan: `packages/provider/MIGRATION.md`.

- plan | DONE | (this commit) | packages/provider/MIGRATION.md written; no code changed.
- captcha-severity | DONE | 2e5e13307 | Whole package ported (54/54 TS cases, 9,151 equivalence vectors match). Also adds the root Cargo workspace. Left: replace its local CaptchaType enum with the one from the types crate once that exists.
- logger | DONE | 95a855d24 | Whole server-side package ported (59/63 TS cases; the 4 left are browser-only). 347 byte-exact equivalence scenarios. Left: BigInt values must be passed as decimal strings by callers (no BigInt in JSON values).
- puzzle-assets | DONE | 8f454cb23 | Whole server-side package ported (57/57 TS cases, 1,450 pixel-exact vectors). Left: WebP bytes differ from sharp (accepted, MIGRATION.md 4.7); background code duplicated with native-puzzle until cut-over. Finding: native-puzzle uses glibc exp/powf and (v+0.5).floor() rounding, which can differ from V8 in the last bit, so its pixels could rarely drift from the TS.
