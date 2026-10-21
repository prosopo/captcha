# Provider: TypeScript → Rust migration plan

The goal is a standalone Rust provider service. When it is finished, no TypeScript
runs on the server, and the Node process that serves provider traffic has been
switched off.

**Scope rule (owner):** everything in the captcha repo that is not frontend gets
ported. The workspace is `packages/*`, `dev/*`, `demos/*` and `integration/*`, and
§1 inventories all four. A package stays TypeScript only with evidence that it is
frontend: a DOM or browser-API import, or a browser runtime. "Not part of the
provider" is not a reason. Client-side code (procaptcha\*, widget-skeleton,
\*-react, \*-bundle, detector, fingerprint, account) stays TypeScript, with the
evidence in §2. The one exception is WASM: see §5. The private repo
(captcha-private, the parent of this one) is in scope: see §6.

Progress, failures and blocked items go in `/MIGRATION-LOG.md` at the repo root.
This file is the plan; that file is the record.

**Owner decisions of 2026-10-21** override anything older in this file. They are
written into the sections below: WASM and generated types (§5), the private repo
(§6), mongoose (§4.4), zod (§4.5), equivalence (§0), sr25519 (§4.3), napi (§0,
§4.9) and versioning (§0).

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
- **No napi.** The napi boundary is transitional. The Rust crates are plain
  `rlib`s; no new napi module is written. A Rust caller links the crate
  directly. An existing napi wrapper (`native-ja4`, `native-merkle`,
  `native-puzzle`) is deleted as soon as its last Node caller is gone, not kept
  "for a Node caller". All three have exactly one Node caller, the TS
  provider, so they are deleted in the commit that lands the provider port;
  MIGRATION-LOG.md records that. Their algorithms move into rlib crates
  (`prosopo-ja4` from crates.io; merkle and puzzle code into workspace crates).
- **Equivalence.** Proof is by running both implementations on the same inputs
  and comparing, never by reading the code. A package gets
  `rust/equivalence/generate.ts`. It runs the *TypeScript* implementation with
  `tsx` on fixed inputs and writes `rust/equivalence/vectors.json`. A cargo test
  then runs the Rust on the same inputs and compares. The vectors and the
  generator stay in the tree; `pnpm --filter <pkg> run equivalence` regenerates
  them, and `git diff` shows any drift. TS test cases are ported one for one
  into Rust `#[test]`s, with the TS test file named in each module.
  - *Byte-identical, no tolerance:* anything that feeds a signature or a stored
    record. That is signed messages and JWTs, SS58 addresses, hashes used as
    keys (UAP rule md5, RediSearch index hash, merkle roots, solution hashes),
    and every field of every Mongo document and Redis value.
  - *Best-effort:* everything else, for example error-message wording, 400 body
    text, translations of unknown keys, and encoded image bytes. Each known
    deviation is listed in MIGRATION-LOG.md.
- **Versioning.** Both tracks go to major 6.0.0 and run side by side until the
  JS is gone. Rust crates are `6.0.0`, set once in `[workspace.package]` and
  inherited with `version.workspace = true`. An npm artifact backed by Rust
  (a WASM build, §5) is `6.0.0-rust.N`. The plain JS packages are `6.0.0`.
  The native-\* crates keep their own versions; they are deleted, not
  released again. Unresolved points are in MIGRATION-LOG.md under
  "versioning".
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
| 28 | datasets-fs | 17 | 1,900 | 3 | 421 | common, logger, types, util, util-crypto (plus sharp, bcrypt, yargs) |
| 29 | server | 4 | 491 | 6 | 1,513 | api, common, logger, keyring, locale, load-balancer, types, util |
| 30 | demos/client-example-server | 6 | 774 | 5 | 1,852 | common, database, logger, dotenv, keyring, server, types, util (plus express, mongoose, jsonwebtoken) |

Server-side total, not counting ofLen: ≈ 70k src lines and ≈ 96k test lines.

**Changes to the starting list.**

- *Added:* `puzzle-assets`, `audio-assets` and `icon-order-assets`. The
  provider renders puzzle backgrounds, audio challenges and icon grids on the
  server with these packages.
- *Added by the owner's scope correction (2026-10-21):* `server`, `datasets-fs`
  and `demos/client-example-server` (rows 28–30). The first version of this
  plan left them out as "not part of the provider", which is not a reason
  under the scope rule. None of them has a DOM or browser-API import. `server`
  is the verify SDK customers run on their back ends: it signs with `Keyring`
  and calls the provider through `ProviderApi` and `findProvider`, and its
  tests start a `node:http` server. `datasets-fs` is a Node CLI (`node:fs`,
  `node:os`, sharp, bcrypt, yargs). `client-example-server` is an express and
  mongoose back end that verifies tokens with `server`.
- *Already Rust:* `native-ja4`, `native-merkle` and `native-puzzle`. They are
  listed so the cut-over accounts for them.
- *Deleted (owner):* `demos/provider-mock`. Nothing depended on it, no CI
  workflow ran it, and it had not changed since a release bump. Its removal
  drops the published `prosopo/provider-mock` docker image (MIGRATION-LOG.md).

**The rest of the workspace.** Every member outside rows 1–30, with the
decision and the evidence for it.

| Member | Decision | Evidence |
|---|---|---|
| detector | keep-as-TS | `detect(…, container: HTMLElement \| undefined, …)` (src/index.d.ts) does shadow-DOM work in the widget. Shipped prebuilt, loaded by `procaptcha-frictionless/src/detectorLoader.ts`. |
| fingerprint | keep-as-TS | Wraps `@prosopo/fingerprintjs` (dynamic `import("@prosopo/fingerprintjs")`), which reads `window.screen`, `document` and `navigator`. |
| fingerprintjs | keep-as-TS | Browser fingerprinting sources: `window.screen.colorDepth` (sources/color_depth.ts), local storage, fullscreen APIs. |
| account | keep-as-TS | Depends on `@polkadot/extension-dapp` and `@polkadot/extension-inject`; `web3Enable` (extension/ExtensionWeb3.ts) talks to browser wallet extensions. |
| procaptcha\*, widget-skeleton, procaptcha-react | keep-as-TS | The widget. Owner decision 1. |
| procaptcha-wrapper | keep-as-TS | `render(element: HTMLElement)` and `window.procaptcha.render` (src/render/). |
| procaptcha-bundle | keep-as-TS | The widget bundle; its tests run under jsdom. |
| demos/client-bundle-example | keep-as-TS, unchanged | Owner ruling. A static page that loads the widget bundle. |
| demos/cypress-shared | keep-as-TS | Cypress e2e specs that drive the widget in a browser (`cy.document()`, cypress/support/visual.ts). Frontend test tooling. Flagged for the owner: this is my reading of the rule, not a ruling. |
| demos/android-webview, demos/ios-webview | none | Kotlin and Swift apps that host the widget in a webview. No TypeScript to port. |
| integration/* | keep-as-TS | Owner ruling. `procaptcha-integration-build-config` is shared Vite build config for the Vue, Svelte and React wrappers (`integration/frameworks/*`, not workspace members), so frontend build tooling. |
| dev/data | none | JSON fixtures only (`captchas.json`, `database_accounts.json`). |
| dev/config, dev/scripts, dev/lint, dev/workspace, dev/prosoponator-bot | port, **last** | Node tooling, so in scope by the rule. But `dev/config` (rollup, vite, webpack, esbuild config) and `dev/workspace`/`dev/lint` are what build and check the TypeScript that is still live, and every port is verified by `build:tsc` of the packages it touches. Porting them while TS packages still need building would break the gate the other ports depend on. They are ported in phase 7 (§3), after the TS they build is gone. `dev/scripts` also imports `@prosopo/provider`, `cli` and `env`, so it has to move at the TS provider's cut-over at the latest. `dev/prosoponator-bot` is a GitHub Actions bot (`@actions/core`, `@actions/github`), not build tooling, but it is grouped here because it is repo tooling with no provider callers; it can move earlier if the owner prefers. |

## 2. Decision per package

| Package | Decision | Reason |
|---|---|---|
| util | port (server subset) | The provider uses the PoW hashing, IP/domain/URL validation (SSRF guard), cacheFile and fetchWithETag. lodash, `ofLen`, `isMain` and the other JS-only helpers have no server-side Rust use and stay TS for the client. |
| util-crypto | port + replace-with-crate | A vendored subset of @polkadot/util-crypto, in which only sr25519 actually works. Backed by `schnorrkel`, `blake2`, `sha2`, `pbkdf2`, `scrypt`, `crypto_secretbox`, `bs58`. The polkadot spec vectors are ported as known-answer tests. sr25519 is not a blocker (§4.3). The hashing the widget uses (`hexHash`, `hexHashArray`) is a WASM candidate (§5). |
| captcha-severity | port | Pure functions with no dependencies. |
| web-bot-auth | port | RFC 9421 signature base and structured fields hand-written; Ed25519 via `ed25519-dalek`. |
| puzzle-assets | port + replace-with-crate | Port xoshiro128\*\* and the procedural pixel maths exactly. sharp WebP is replaced by `libwebp-sys`/`webp`, so the bytes differ from libvips (see §4). |
| logger | port | Our own console logger. Vector parses its output, so the JSON line format has to match byte for byte. |
| locale | port | Same JSON catalogues, read from the same files. i18next is replaced by a small loader: fallback `en`, `{{var}}` interpolation, plus the request language detector. |
| common | port | The ProsopoError hierarchy and its translation keys, which determine API error bodies. |
| redis-client | replace-with-crate | `redis` (redis-rs, tokio). Port the index-hash bookkeeping so an existing RediSearch index isn't dropped and rebuilt. The index hash is byte-identical (§0). |
| dotenv | port | A port of the `dotenv` 16.4.5 parser plus the `.env.<NODE_ENV>` upward search. Not `dotenvy`: porting the parser lets 1,580 TS vectors pin dotenv's own quoting and escape rules. |
| api-route | port | Turns into a trait: validate the body, process it, return a status. |
| types | port; Rust is the source of truth | Wire types (request and response bodies, enums, constants, route paths) are defined once in Rust and the TypeScript is generated from them (§5). zod per §4.5. Client-only types (DOM, widget state) stay hand-written TS. |
| ipinfo | port + replace-with-crate | `maxminddb` replaces `@maxmind/geoip2-node`; the ipapi HTTP backend uses `reqwest`. |
| keyring | port + replace-with-crate | sr25519 only (the TS rejects every other type), so `schnorrkel`, plus `substrate-bip39` for the mnemonic → mini-secret step. `//hard` / `/soft` derivation and keystore v3 are ported. |
| load-balancer | port (server subset) | The provider calls `getProviders`/`loadBalancer` to find peers. Widget-side selection stays TS. |
| api | port (server subset) | The provider uses `ProviderApi`/`ApiClient` to forward verify calls between providers, and cli uses it for `site_key_register_api`. The widget HTTP client stays TS. |
| audio-assets | port | Pure DSP plus a hand-written WAV header, with no native dependencies. |
| icon-order-assets | port + replace-with-crate | sharp/librsvg SVG rasterising is replaced by `resvg`/`tiny-skia`. |
| datasets | port; WASM core | Merkle trees, dataset parsing and solution hashing. Reuses the `native-merkle` code. procaptcha computes `CaptchaMerkleTree` and `computeCaptchaSolutionHash` in the browser and the server must agree byte for byte, so the browser gets the same Rust as WASM (§5). |
| user-access-policy | port | Rules in Redis hashes, RediSearch queries, eight admin routes. The md5 rule hash must be reproduced exactly. |
| types-database | port | The mongoose schemas become serde structs on the official `mongodb` driver, plus explicit index/TTL definitions and defaults (§4.4). |
| database | port + replace-with-crate | The official `mongodb` driver with serde structs, no ODM. mongoose behaviour is reproduced explicitly (§4.4). |
| types-env | delete-as-dead | Interfaces only. They become traits in the `env` crate. |
| env | port | Wires config, keypair, database and ipinfo together. |
| api-express-router | replace-with-crate | `axum`/`tower`. The body adapter, error handler, sr25519 JWT auth middleware, replay guard and request logger are ported as axum layers. |
| provider | port | The service itself. Ported in the endpoint order in §3. |
| cli | port | `clap` takes over from yargs. The binary `prosopo-provider` *is* the service entry point (start, ensure_indexes, store_captchas, …). |
| native-ja4 / native-merkle / native-puzzle | fold into rlibs | Already Rust. Each napi wrapper is deleted when its only Node caller, the TS provider, is ported (§0). |
| datasets-fs | port | A clap CLI over the datasets crate. sharp's resize and re-encode become the `image` crate; bcrypt becomes the `bcrypt` crate. Dataset JSON it writes is read by the provider, so it is byte-identical (§0); re-encoded image bytes are best-effort (§4.7). |
| server | port | The verify SDK becomes a Rust crate, `prosopo-server`, on the ported api, keyring and load-balancer crates. It is about to back the verify API, so it has to be Rust. The npm package `@prosopo/server` is a published SDK that customers install; it keeps being published on the plain JS 6.0.0 line (§0) until the owner decides how Node integrators are served afterwards (MIGRATION-LOG.md). |
| demos/client-example-server | port | axum in place of express, the `mongodb` driver in place of mongoose (§4.4), `jsonwebtoken` crate for its session JWTs, verifying through `prosopo-server`. The `prosopo/client-example-server` image is built from it, so the Dockerfile change is a deployment change for a human (§3). |
| demos/provider-mock | delete | Owner ruling (§1). |
| detector, fingerprint, fingerprintjs, account, procaptcha-wrapper, procaptcha-bundle | keep-as-TS (client-side) | Browser APIs; evidence in §1. |
| dev/\* | port, last | Builds the live TS; phase 7 (§3). |

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

**Who changes the deployment config.** Not this migration. Caddyfiles, compose
files, ansible playbooks and terraform are left alone. Each change the Rust
service needs is written up in MIGRATION-LOG.md under "deployment", with the
file, the change and the reason, for a human to make.

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

7. **dev/\* tooling.** Only once no TypeScript server package is left to build:
   dev/config, dev/workspace, dev/lint and dev/scripts are ported (or deleted
   where they only built TS that no longer exists). Whatever still builds the
   client TS (procaptcha\*, the WASM bundles) keeps the parts of dev/config it
   needs; that split is decided then, with the owner.

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
3. **sr25519 compatibility. Not a blocker.** Substrate is Rust, and
   `schnorrkel` is the same primitive `@scure/sr25519` implements. Keys,
   signatures and the custom JWT (`alg: "sr25519"`) are ported on
   `schnorrkel` with the `"substrate"` signing context. Signatures are
   randomised, so equivalence is shown by *cross*-verification (TS-signed
   verified in Rust and vice versa) plus deterministic derivation vectors
   (mnemonic → mini-secret → public key → SS58, and `//hard` / `/soft`
   paths), all byte-identical. No production data is used: the vectors are
   *generated* by running the TypeScript, like every other package's.
   - *Deterministic, compared byte for byte:* public keys from seeds,
     mnemonics (with and without a password) and secret URIs with hard and
     soft paths; SS58 addresses for every prefix the codebase uses; the hashes.
   - *Randomised, never byte-compared:* sr25519 signing draws a fresh nonce,
     so the same key and message sign differently each call. Signatures are
     proven by cross-verification with real randomness in both directions:
     Rust verifies signatures the TS made, and the TS verifies signatures Rust
     made. Messages include empty and very long ones, and the fixture also
     carries signatures that must fail (wrong key, wrong message, a flipped
     bit, a wrong signing context, truncated). The util-crypto and keyring
     vectors additionally replay recorded TS randomness to match bytes; that
     checks the transcript construction, but it is not the proof of
     signature compatibility, because production signing does not replay
     anything.
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

   **Decision: the official `mongodb` driver with serde structs, no ODM.** The
   Rust ODMs do not earn their place: `wither` has had no release since
   2021, and `mongodm` (maintained) is a thin query-builder layer over the
   same driver. Either would add a second layer of implicit behaviour, which
   is the problem mongoose already causes. Per behaviour:
   - *Collection names*: a `const` per model holding the exact pluralised name.
     Nothing is derived.
   - *Strict mode*: comes from the types, so no runtime layer. A serde struct
     only serialises its declared fields, and on read it ignores unknown ones.
   - *Cast-on-write*: moves to the input boundary. A field typed
     `bson::DateTime` cannot hold a string. The `normaliseIpHalf` setter
     becomes the only constructor of an `IpHalf` newtype, so an
     un-normalised value cannot be written. That value is a stored record,
     so it is byte-identical (§0).
   - *Defaults, including function defaults*: an explicit constructor or
     `Default` impl per model. Not `#[serde(default)]` on read, because
     mongoose applies defaults on write and old documents must read back
     unchanged.
   - *Schema validators* (`required`, `enum`): dropped where the type already
     guarantees them (a non-`Option` field, a Rust enum). `min`/`max`/`match`
     stay as explicit checks in the newtype constructor.
   - *Indexes, TTL and `ensureIndexes`*: a typed index list per model that
     produces the same key spec, options and name as mongoose. A different
     spec makes `ensureIndexes` drop and rebuild the index in production.
   - *`.lean()` reads*: what serde gives anyway.

   Each model is checked by round-trip tests against a real mongod (via
   `mongodb-memory-server`, which is already a dev dependency): a document
   written by Rust is read back by mongoose and the other way round, and the
   raw BSON is compared byte for byte. Every model gets this treatment, so
   it's the largest single piece of work.
5. **zod: a Rust replacement for JSON input, the type system for everything
   else. Decided per case.** There are about 40 request schemas using `preprocess`
   / `coerce` / `transform` / `superRefine`, plus the `boundedString` /
   `safeText` sanitisers, `ClientSettingsSchema` and `ProsopoConfigSchema` with
   ~140 defaults between them.
   - *Anything parsed from JSON or the environment* (request bodies, stored
     settings defaults, config): `prosopo_api_route::schema`, a small library
     with zod 3.23's semantics. It makes the same accept/reject decision,
     produces the same output (unknown keys stripped, defaults and coercions
     applied, keys in schema order) and the same issues. serde then types the
     validated output. Bare serde derives were tried first and rejected,
     because they accept a different set of inputs: `null` for an optional
     field (serde: `None`, zod: rejected), a JSON array where an object is
     expected (serde: positional fields, zod: rejected), and serde stops at the
     first error where zod reports every issue. For request bodies the
     accepted set is a security property, and `ClientSettingsSchema.parse({})`
     output is stored, so both have to match exactly. The library is proven
     against zod by its own vectors (49+ schemas × 75 inputs), and each ported
     schema gets vectors of its own.
   - *In-memory shapes* (the `SessionSchema` / `CompositeIpAddressSchema` family
     over Mongo documents, `date()`, `bigint()`, `map()`): plain serde structs.
     The value is built by Rust code, so the types already guarantee what the
     schema checked, and no runtime layer is kept.
   - *Sanitisers that change stored text*: the output feeds a stored record,
     so it is byte-identical (§0) and gets equivalence vectors.

   400 bodies keep zod's issue structure and wording, which the library
   reproduces; any wording that differs is still only best-effort (§0).
   Schemas the widget also uses are generated as TypeScript from the Rust
   (§5), not kept twice.
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
9. **The napi boundary** is transitional: no new napi modules, and the
   existing wrappers are deleted when their last Node caller is gone (§0).
   Until the provider lands, the same algorithm (ja4, merkle, puzzle) can be
   built from two places. That is managed by moving the code into rlibs that
   both the napi wrapper and the service depend on.
10. **Distroless health check.** The compose health check runs `node -e fetch`
    inside the container. The Rust image needs its own health-check subcommand.

## 5. Client side: WASM and generated types

Client packages (procaptcha\*, widget-skeleton, \*-react) stay TypeScript.
WASM is the one exception, and it is used only where it removes a second
implementation of the same logic. A shared module qualifies when it is pure
computation (no DOM, no network) *and* the browser and the server must agree on
its output. Being portable is not enough.

| Module | Used in the browser by | WASM? | Why |
|---|---|---|---|
| datasets: `CaptchaMerkleTree`, `computeCaptchaSolutionHash` | procaptcha | yes | The server recomputes the same root and hash; any drift fails every image captcha. |
| util-crypto: `hexHash`, `hexHashArray` (blake2) | procaptcha, -pow, -puzzle, -audio, -icon-order | decide when datasets lands | Feeds hashes the server checks, but it is a one-line call into a hash library on both sides. WASM only if the merkle module already ships a WASM bundle these can join. |
| util: PoW hashing | procaptcha-pow | decide when it lands | Same reasoning as blake2: tiny, and the widget's solve loop is performance-sensitive. Measure first. |
| util-crypto: `randomAsHex`, `entropyToMnemonic` | procaptcha\*, account | no | Randomness and key creation; the server never recomputes them. |

A WASM module is built with `wasm-bindgen` from the same crate the service
links, and published as an npm artifact versioned `6.0.0-rust.N` (§0). The
equivalence tests for the crate cover the WASM build too, by running the
generated vectors through the WASM from Node.

**Shared wire types.** Rust is the source of truth. Request and response bodies,
enums, constants and route paths that the widget uses are defined in Rust, and
their TypeScript (types, plus zod schemas where the widget validates at runtime)
is generated and committed. A test fails if the committed TypeScript is out of
date with the Rust.

How, decided now that `types` has landed:

- *Schemas*: the zod is generated from the Rust schema tree itself
  (`prosopo_api_route::schema`), not from a second description. Every node has
  a direct zod spelling (`object`, `string().max(n)`, `optional().default(x)`,
  ...). Only the closures cannot be printed: regex tests, refinements,
  transforms and preprocessors. Each of those is given its TS source text next
  to the Rust closure (for example `regex_js("/^[^\\u0000-\\u001f]*$/", ...)`),
  and the generator emits that text. `z.infer` then gives the TS types for
  free.
- *Enums and constants*: `wire_enum!` already records each TS member name, so
  the generator emits TS `enum`s with the same names and values, and `as const`
  objects for `ApiParams`, `INPUT_LIMITS`, the timeouts and the route paths.
- *Interfaces without a schema* (the response bodies): `ts-rs` derives on the
  Rust structs, with `JsNumber` mapped to `number`.
- *Proof*: before any hand-written TS is replaced, every `types` generator runs
  against the generated module in place of the hand-written one, and the
  committed vectors must not change. Only then does `packages/types` re-export
  the generated files instead of its own, one module at a time, with
  `build:tsc` of every dependent package as the gate.
- *Order*: after the types-database port, so the generator is written once,
  against a stable set of schemas.

## 6. The private repo (captcha-private)

This repo is a submodule of captcha-private (`/work`), which is also on branch
`rust-migration/provider`. Out of scope there: the `protect`, `packages/docs`
and `wiki` submodules, and deployment config (§3).

**What the private repo uses from the provider.** Three packages depend on
`@prosopo/provider`, and between them they import exactly two functions:

| Package | Imports | Where |
|---|---|---|
| database-private | `getCompositeIpAddress`, `getIpAddressFromComposite` | models and `shared/captchaSearch.ts` |
| job-definitions | `getCompositeIpAddress`, `getIpAddressFromComposite` | ipinfo job, anomaly detectors, UAP rule formatting |
| aws-serverless-api | `getCompositeIpAddress` | one integration test |

The private repo also imports `@prosopo/user-access-policy` directly, and keeps
doing so after the provider moves: job-definitions pushes rules with
`AccessRulesApiClient` and computes `makeAccessRuleHash`,
`transformAccessRuleIntoRecord` and `transformAccessRuleRecordIntoRule`;
database-private builds its rules model on `accessRuleMongooseSchema`; the portal
and types-private use the enums, field lists and header helpers. So the TS
user-access-policy package cannot be deleted with the provider. The rule hash is a
Redis key the Rust also computes, so it exists twice until those jobs either move
to Rust or take the hash from a WASM build (§5 rule).

Both functions convert between an IP address and the composite form stored
in Mongo (`type` plus `lower`/`upper` 64-bit halves of the address), so their
output is a stored record and must be byte-identical (§0).
`getIpAddressFromComposite` returns an `ip-address` class instance, which a
WASM function cannot return, so the TS side keeps a few-line wrapper that
builds it from the string the WASM returns. The plan: they are ported into the Rust crate
that owns the IP types, and the TS package is deleted along with the provider.
The three private packages then import a WASM build of that crate instead of
`@prosopo/provider`, which is the §5 rule applied to server-side Node: these
jobs and lambdas keep running as TypeScript, and the encoding is implemented
once. database-private also defines mongoose models over the same collections
the provider writes (`PoWCaptchaData`, `ImageCaptchaData`, `Session`,
`InteractiveCaptchaData`). Rust-written documents must still read back through
those models, so they join the round-trip tests in §4.4.

**Where the provider is assembled.** The provider image is built in *this* repo
(`.github/workflows/provider_image.yml` builds `packages/cli/Dockerfile`).
captcha-private *deploys* it: `deploy-provider.yml` runs the ansible playbook
`packages/infrastructure/ansible/playbooks/provider.yml`, which sets the image
versions. So the Rust image is built here and its rollout is a deployment
change for a human (§3).
