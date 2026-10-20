# Provider: TypeScript → Rust migration plan

The goal is a standalone Rust provider service. When it is finished, no TypeScript
runs on the server, and the Node process that serves provider traffic has been
switched off. Client-side code (procaptcha\*, widget-skeleton, \*-react, \*-bundle,
detector, fingerprint, account) stays TypeScript and is out of scope.

Progress, failures and blocked items go in `/MIGRATION-LOG.md` at the repo root.
This file is the plan; that file is the record.

## 0. Layout and conventions

- **Where the Rust lives.** Each package is ported in place. The Rust crate sits
  next to the TS one in the same package directory: `packages/<pkg>/Cargo.toml`,
  with its sources in `packages/<pkg>/rust/`, because `src/` is still the
  TypeScript. The crate is called `prosopo-<pkg>`; edition 2021,
  `license = "Apache-2.0"`, `publish = false`. While the Node provider is still
  running, the TS stays alongside the Rust. It is deleted at cut-over (§3,
  phase 6).
- **Cargo workspace.** There is one, at the repo root (`/Cargo.toml`). Members
  are listed explicitly, and `packages/native-*` is excluded, so those three
  crates keep their own lockfiles and build exactly as before. Why a workspace
  when there wasn't one before: the native-\* crates are three separate napi
  modules with a handful of dependencies each. This port is ~27 crates linked
  into **one binary**. Without a workspace, each crate has its own `Cargo.lock`,
  so the dependency versions a crate is tested against aren't the ones the
  binary ships with. Each crate would also have its own `target/`, so tokio,
  mongodb, axum and the crypto stack would be compiled ~27 times.
- **No new napi.** The end state has no Node, so the Rust crates are plain
  `rlib`s used by the Rust service. They are not napi modules called from the
  TS provider. The existing `native-ja4`, `native-merkle` and `native-puzzle`
  keep serving the TS provider until cut-over. The Rust service depends on the
  same algorithms directly (`prosopo-ja4` from crates.io; the merkle and puzzle
  code is moved into rlib crates).
- **Equivalence.** Wherever behaviour can be observed, a package gets
  `rust/equivalence/generate.ts`. It runs the *TypeScript* implementation with
  `tsx` on fixed inputs and writes `rust/equivalence/vectors.json`. A cargo test
  then asserts the Rust gives byte-identical outputs for the same inputs. The
  vectors are committed; `pnpm --filter <pkg> run equivalence` regenerates
  them, and `git diff` shows any drift. TS test cases are ported one for one
  into Rust `#[test]`s, with the TS test file named in each module.
- **Gates per commit.** For every migrated crate, `cargo test` passes in the
  workspace. For every package not yet migrated (in practice all of them, since
  the TS stays until cut-over), `pnpm --filter @prosopo/<pkg> run build:tsc`
  passes.

## 1. Inventory (dependency order, leaf first)

Line counts are for `src/` only. "src" leaves out tests; "test" is
`*.test.ts` / `*.spec.ts` / `tests/`. The util src count includes the generated
`ofLen.ts` (34,804 lines of type tuples); without it util is about 2,579 lines.
Deps lists internal `@prosopo/*` runtime dependencies.

| # | Package | src files | src lines | test files | test lines | Internal deps |
|---|---|---|---|---|---|---|
| 1 | util | 31 | 37,383 (≈2,579) | 18 | 2,258 | – |
| 2 | util-crypto | 94 | 4,055 | 49 | 7,804 | – |
| 3 | captcha-severity | 2 | 490 | 2 | 504 | – |
| 4 | web-bot-auth | 7 | 804 | 4 | 546 | – |
| 5 | puzzle-assets | 11 | 1,902 | 3 | 1,175 | – (native-puzzle at runtime via provider) |
| 6 | logger | 2 | 486 | 3 | 741 | util |
| 7 | locale | 19 | 1,779 (+93×3 JSON catalogues) | 24 | 6,119 | util |
| 8 | common | 7 | 630 | 3 | 660 | locale, logger |
| 9 | redis-client | 3 | 284 | 3 | 354 | logger |
| 10 | dotenv | 2 | 129 | 2 | 737 | logger |
| 11 | api-route | 7 | 159 | 2 | 414 | logger |
| 12 | types | 53 | 7,466 | 9 | 2,381 | locale, util, util-crypto |
| 13 | ipinfo | 5 | 777 | 4 | 1,980 | logger, types |
| 14 | keyring | 17 | 1,553 | 10 | 1,268 | common, types, util, util-crypto |
| 15 | load-balancer | 6 | 775 | 5 | 1,230 | common, types |
| 16 | api | 6 | 1,224 | 5 | 1,735 | types |
| 17 | audio-assets | 7 | 1,030 | 1 | 285 | puzzle-assets |
| 18 | icon-order-assets | 7 | 724 | 1 | 317 | puzzle-assets |
| 19 | datasets | 7 | 857 | 5 | 2,191 | common, logger, types, util, util-crypto |
| 20 | user-access-policy | 39 | 4,570 | 16 | 5,578 | api, api-route, common, logger, redis-client, types, util |
| 21 | types-database | 10 | 2,625 | 1 | 778 | common, locale, logger, types, user-access-policy |
| 22 | database | 11 | 5,341 | 23 | 4,872 | common, logger, redis-client, types, types-database, user-access-policy, util |
| 23 | types-env | 4 | 99 | 2 | 298 | logger, keyring, types, types-database |
| 24 | env | 3 | 355 | 3 | 839 | ipinfo, common, logger, database, keyring, types, types-env, util-crypto |
| 25 | api-express-router | 8 | 574 | 9 | 2,026 | api-route, common, logger, env, locale, types, util, util-crypto |
| 26 | provider | 140 (+3 obfuscated .js) | 27,008 | 140 | 48,580 | everything above, plus native-ja4/merkle/puzzle |
| 27 | cli | 20 | 1,713 | 3 | 382 | api, common, logger, dotenv, env, keyring, locale, provider, types, util |

Server-side total, not counting ofLen: ≈ 70k src lines and ≈ 96k test lines.

**Changes to the starting list.**

- *Added:* `puzzle-assets`, `audio-assets` and `icon-order-assets`. The
  provider renders puzzle backgrounds, audio challenges and icon grids on the
  server with these packages.
- *Already Rust:* `native-ja4`, `native-merkle` and `native-puzzle`. They are
  listed so the cut-over accounts for them.
- *Dropped, client-side:*
  - `detector`: loaded by `procaptcha-frictionless/src/detectorLoader.ts`. No
    server package imports it.
  - `fingerprint`: depended on only by `account` and `procaptcha-pow`.
  - `account`: depended on only by `procaptcha-common`.
- *Dropped, server-side but not the provider:*
  - `server` is `@prosopo/server`, the Node SDK that *customers* run on their
    own back ends to verify tokens. Only `demos/client-example-server` depends
    on it. Rewriting it in Rust would break every Node integrator, and the
    provider never loads it.
  - `datasets-fs` is an offline dataset-building CLI. Nothing depends on it,
    and it never serves traffic.
  - `dev/*`, `demos/*` and `integration/*` are tooling and demos.

## 2. Decision per package

| Package | Decision | Reason |
|---|---|---|
| util | port (server subset) | The provider uses the PoW hashing, IP/domain/URL validation (SSRF guard), cacheFile and fetchWithETag. lodash, `ofLen`, `isMain` and the other JS-only helpers have no server-side Rust use and stay TS for the client. |
| util-crypto | port + replace-with-crate | A vendored subset of @polkadot/util-crypto, in which only sr25519 actually works. Backed by `schnorrkel`, `blake2`, `sha2`, `pbkdf2`, `scrypt`, `crypto_secretbox`, `bs58`. The polkadot spec vectors are ported as known-answer tests. |
| captcha-severity | port | Pure functions with no dependencies. |
| web-bot-auth | port | RFC 9421 signature base and structured fields hand-written; Ed25519 via `ed25519-dalek`. |
| puzzle-assets | port + replace-with-crate | Port xoshiro128\*\* and the procedural pixel maths exactly. sharp WebP is replaced by `libwebp-sys`/`webp`, so the bytes differ from libvips (see §4). |
| logger | port | Our own console logger. Vector parses its output, so the JSON line format has to match byte for byte. |
| locale | port | Same JSON catalogues, read from the same files. i18next is replaced by a small loader: fallback `en`, `{{var}}` interpolation, plus the request language detector. |
| common | port | The ProsopoError hierarchy and its translation keys, which determine API error bodies. |
| redis-client | replace-with-crate | `redis` (redis-rs, tokio). Port the index-hash bookkeeping so an existing RediSearch index isn't dropped and rebuilt. |
| dotenv | replace-with-crate | `dotenvy`, plus a port of the `.env.<NODE_ENV>` upward search. |
| api-route | port | Turns into a trait: validate the body, process it, return a status. |
| types | port (server subset) | The zod request schemas become serde structs plus explicit validation that keeps zod's coercions and error messages. Enums, constants and route paths are ported verbatim. Client-only types stay TS. |
| ipinfo | port + replace-with-crate | `maxminddb` replaces `@maxmind/geoip2-node`; the ipapi HTTP backend uses `reqwest`. |
| keyring | port + replace-with-crate | sr25519 only (the TS rejects every other type), so `schnorrkel`, plus `substrate-bip39` for the mnemonic → mini-secret step. `//hard` / `/soft` derivation and keystore v3 are ported. |
| load-balancer | port (server subset) | The provider calls `getProviders`/`loadBalancer` to find peers. Widget-side selection stays TS. |
| api | port (server subset) | The provider uses `ProviderApi`/`ApiClient` to forward verify calls between providers, and cli uses it for `site_key_register_api`. The widget HTTP client stays TS. |
| audio-assets | port | Pure DSP plus a hand-written WAV header, with no native dependencies. |
| icon-order-assets | port + replace-with-crate | sharp/librsvg SVG rasterising is replaced by `resvg`/`tiny-skia`. |
| datasets | port (server subset) | Merkle trees, dataset parsing and solution hashing. Reuses the `native-merkle` code. |
| user-access-policy | port | Rules in Redis hashes, RediSearch queries, eight admin routes. The md5 rule hash must be reproduced exactly. |
| types-database | port | The mongoose schemas become serde structs plus explicit index/TTL definitions and an explicit defaults pass. |
| database | port + replace-with-crate | The `mongodb` driver, with mongoose behaviour reproduced explicitly (see §4). |
| types-env | delete-as-dead | Interfaces only. They become traits in the `env` crate. |
| env | port | Wires config, keypair, database and ipinfo together. |
| api-express-router | replace-with-crate | `axum`/`tower`. The body adapter, error handler, sr25519 JWT auth middleware, replay guard and request logger are ported as axum layers. |
| provider | port | The service itself. Ported in the endpoint order in §3. |
| cli | port | `clap` takes over from yargs. The binary `prosopo-provider` *is* the service entry point (start, ensure_indexes, store_captchas, …). |
| native-ja4 / native-merkle / native-puzzle | fold into rlibs | Already Rust. The napi wrappers are deleted at cut-over. |
| server, datasets-fs | keep-as-TS | Not part of the provider (see §1). |
| detector, fingerprint, account | keep-as-TS (client-side) | See §1. |

## 3. Strangler-fig order

**How the service is reached today.** Caddy (`docker/provider.Caddyfile:228`)
reverse-proxies every request to `provider1` with `provider2` as fallback
(`lb_policy first`). Both Node processes share MongoDB and Redis. A Rust
container (`provider-rs`) is added on the same internal network, reading the
same env file and the same detector-pool volume.

**How traffic is split.** In the Caddyfile, a named path matcher
`@rust path …` routes the listed endpoints to `provider-rs`. Within that matcher,
`lb_policy weighted_round_robin` sets the Rust/Node ratio (start at 1:99). The
Node containers stay listed as upstreams, so passive health checks fail over to
Node if Rust stops answering. Every other path keeps going to Node unchanged.
Caddy reloads its config through the admin API, so changing the split needs no
restart.

**Shared state is what makes this safe.** A challenge minted by one
implementation can be solved or verified by the other. That only works if
records in Mongo and Redis are bit-compatible in both directions, and if
signatures are byte-identical (sr25519 over the same message encoding). This is
why every Rust database write gets a round-trip test that reads it back through
mongoose, and the other way round, before its endpoint takes traffic.

**Phases** (each phase is gated on the previous one running at 100% for a week):

0. **Shadow.** `provider-rs` serves `GET /healthz` and
   `GET /v1/prosopo/provider/public/details`. It is reachable only on the
   internal network, and an internal probe compares its responses against Node.
1. **Stateless and read-mostly:** public details, healthz, `/metrics` (a
   separate scrape target), `spam/email`.
2. **Server-to-server verify:** `pow/verify`, `image/dapp/verify`,
   `puzzle|audio|icon-order/verify`, `authenticated/verify`. These are called by
   customer back ends, not browsers, so failures show up in our logs rather
   than as broken widgets. They need the database, keyring, ipinfo and UAP
   reads.
3. **Simple challenge flows:** `captcha/pow` and `pow/solution`, then
   `captcha/puzzle|icon-order|audio` with their `…/solution` routes. These need
   the asset crates, and they are minted with the shared provider key.
4. **Image captcha:** `captcha/image` and `solution`. Needs datasets, merkle
   trees and the commitment schedulers.
5. **Frictionless and detector:** `captcha/frictionless` and `detector/assign`.
   **Blocked** on §4.1 and §4.2.
6. **Admin, UAP rules and cron.** Admin endpoints change in-memory state: the
   detector pool hot-swap, the verdict cache, the decision-machine cache and the
   JWT replay guard. While both implementations are live, a change applied to
   one is invisible to the other. So these move last, in one step, together
   with the cron schedulers, which must run in exactly one implementation (the
   DB task-status record already stops two runs at once, but not two
   implementations disagreeing). Then the Node containers are removed, the TS
   server packages are deleted, and the native-\* napi wrappers become rlibs.

**Rollback.** At any phase, remove the path from `@rust` (or set its weight to
0) and reload Caddy. Since both implementations read and write the same
records, in-flight challenges minted by Rust can still be solved on Node, so
rollback loses no sessions. Rollback is only one-way-safe if *no* Rust-only
schema change has been made. **Rule: no Mongo or Redis schema change is made
in Rust until phase 6 is complete.**

## 4. Hard problems

1. **Detector payload decoders execute obfuscated JS.**
   `provider/src/tasks/detection/decoderPool.ts` runs `decodePayload.js`,
   `decodeSimd.js` and `decodeBehavior.js` (about 110 KB, obfuscated) in
   `worker_threads`. They use `node:crypto` RSA-OAEP plus a symmetric cipher
   whose name is itself obfuscated, and a `payloadLayout`/`keyMap` scheme.
   Porting from obfuscated output is not a reliable source of truth. The
   bundlePool comments mention a Rust "bumblebee" `bundle_manager` in the
   protect stack. **Question:** is there a reference implementation or spec of
   the decoder (bumblebee, or the detector build pipeline) that the Rust
   service can depend on? Until that's answered, frictionless and
   detector/assign stay on Node.
2. **Decision machines are operator-supplied JavaScript.**
   `decisionMachineRunner.ts:78` compiles DB-stored JS with `node:vm`.
   Running it from Rust means embedding a JS engine: `rquickjs` (small, with an
   interrupt-based timeout, but not V8 semantics), `boa`, or `deno_core`/V8
   (exact semantics, large binary). Strictly speaking this is still not
   *our* TypeScript running on the server. **Question for the owners:** is an
   embedded engine acceptable, which one, or should decision machines move to a
   declarative/WASM format?
3. **sr25519 compatibility.** Keys, signatures and the custom JWT
   (`alg: "sr25519"`) come from `@scure/sr25519`. `schnorrkel` with the
   `"substrate"` signing context should verify the same signatures, but
   signatures are randomised, so equivalence is shown by *cross*-verification
   (TS-signed verified in Rust and vice versa) plus deterministic derivation
   vectors (mnemonic → mini-secret → public key → SS58, and `//hard` / `/soft`
   paths).
4. **mongoose has no Rust equivalent.** The behaviour we rely on without
   writing it down:
   - Implicit pluralised collection names (`powcaptchas`, `usercommitments`, …).
   - Strict mode silently dropping undeclared fields.
   - Cast-on-write (string → Date, Decimal128 IP halves via the
     `normaliseIpHalf` setter).
   - Schema defaults, including function defaults, in `UserSettingsSchema`.
   - TTL `expires` indexes.
   - `ensureIndexes`, which *drops and recreates* indexes.
   - `.lean()` reads.

   Each of these is made explicit in Rust: serde structs, a defaults pass, a
   typed index list. They are checked by round-trip tests against a real
   `mongo:6.0.28`. Every model gets this treatment, so it's the largest single
   piece of work.
5. **zod has no Rust equivalent either.** There are about 40 request schemas
   using `preprocess` / `coerce` / `transform` / `superRefine`, plus the
   `boundedString` / `safeText` sanitisers. serde parses the shape; the
   coercions and refinements become hand-written validation. 400-response
   bodies carry zod's issue messages, which reach clients through
   `ProsopoApiError`. Those messages are reproduced, and equivalence vectors
   compare whole error bodies.
6. **Hashes that must not change.**
   - The UAP rule key is md5 of `JSON.stringify` over sorted entries, following
     JS number and key-ordering rules. Existing Redis keys and the rule hashes
     stored on sessions depend on it.
   - The RediSearch index-definition hash is `JSON.stringify` of a node-redis
     schema object. If it comes out different, the index is dropped and rebuilt
     at Rust start-up.

   Both are reproduced and checked against TS vectors.
7. **Native image encoding.** sharp/libvips WebP output will not be
   byte-identical from a Rust encoder. The pixels are identical (same PRNG,
   same maths), but the encoded files aren't. Verification compares geometry
   and seeds, not image bytes, so this is not observable to clients. It is
   still a deliberate deviation, recorded here.
8. **In-process state** stops working as soon as two implementations run side
   by side: express-rate-limit counters, the JWT replay map, the verdict cache,
   the decision-machine cache and the detector-pool hot-swap. This is handled
   by the phase-6 ordering, not by code.
9. **The napi boundary** is avoided rather than crossed: no new napi modules
   (§0). The cost is that during the transition the same algorithm (ja4,
   merkle, puzzle) can be built from two places. That is managed by moving the
   code into rlibs that both the napi wrapper and the service depend on.
10. **Distroless health check.** The compose health check runs `node -e fetch`
    inside the container. The Rust image needs its own health-check subcommand.
