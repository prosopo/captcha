# Provider Rust migration log

One line per step: package | status | commit | what is left. Plan: `packages/provider/MIGRATION.md`.

- plan | DONE | (this commit) | packages/provider/MIGRATION.md written; no code changed.
- captcha-severity | DONE | 2e5e13307 | Whole package ported (54/54 TS cases, 9,151 equivalence vectors match). Also adds the root Cargo workspace. Left: replace its local CaptchaType enum with the one from the types crate once that exists.
