# Self-hosting Procaptcha

Run the whole CAPTCHA stack on your own servers using the published `prosopo/provider` image. You do not need to fork
this repository, edit any TypeScript, or build an image dataset.

The trick is to register your site key with an explicit `captcha_type`. That tells the provider to serve that challenge
directly and skip bot detection, which is the only closed-source part of the stack.

- `pow` — invisible proof of work. No imagery at all.
- `puzzle` — slider puzzle. Imagery is generated procedurally at request time.
- `image` — also works self-hosted, but needs a dataset you build and host. See [below](#image-captchas).

Everything here is [Apache-2.0](LICENSE) — commercial use included, no seat or traffic limit on the code.

Full guide, including server-side verification and the optional extras:
**https://docs.prosopo.io/en/self-hosting/**

## 1. Clone and generate your environment file

Clone with submodules, install, and build the workspace once. The env script and every later step use the built
packages. Then one script generates the provider account, the site key account and strong random passwords for Mongo and
Redis, and fills in everything else from the hostname you give it.

```bash
git clone --recurse-submodules https://github.com/prosopo/captcha
cd captcha
corepack enable
pnpm install --frozen-lockfile
pnpm run build:all

pnpm exec tsx ./dev/scripts/src/scripts/generateSelfHostedEnv.ts --host captcha.example.com
```

```
{"scope":"generateSelfHostedEnv","level":"info","data":{"siteKeyAddress":"5Fpd...","providerAddress":"5Gnj..."},"msg":"Accounts generated"}
{"scope":"generateSelfHostedEnv","level":"info","data":{"outputPath":"/home/you/captcha/.env"},"msg":"Environment file written"}
```

Anything above those two lines (`@polkadot/util has multiple versions`, `[AsyncFunction: makeDirectory]`) is build
tooling noise, not a failure.

`siteKeyAddress` is the public `data-sitekey` value for your pages. Read it back any time with
`grep PROSOPO_SITE_KEY= .env`.

`.env` is written `0600` — it holds two mnemonics and both database passwords. Keep it out of version control and back
it up; regenerating gives your provider a new identity and new credentials for a database that still has the old ones.

Options: `--output <path>`, `--force` to overwrite.

## 2. Start the stack

The compose file, `docker-compose.self-hosted.yml`, ships with the repo. Your `.env` sets `COMPOSE_FILE` to it, so this
and every later `docker compose` command finds it without `-f`. Run them from the repository root.

```bash
docker compose up -d
curl localhost:9229/healthz     # {"ok":true,"host":"captcha.example.com"}
```

Four containers: Mongo, Redis, the provider, and Caddy terminating TLS in front of it. Redis must be `redis-stack` —
the provider stores access rules in a RediSearch index, which stock Redis does not ship.

TLS is handled for you. The provider speaks plain HTTP on 9229; `docker/provider.Caddyfile` — the same config we run in
production — sits in front of it and gets certificates over ACME, driven entirely by the `CADDY_*` vars in your `.env`.
The image is `prosopo/caddy`, not upstream Caddy: that config needs `caddy-l4`, `chaddy`, `caddy-ratelimit` and
`caddy-requestid` compiled in.

Caddy asks for certificates for your domain plus `ipv4.` and `ipv6.` variants. They're separate certificates, so
missing those two DNS records doesn't break the main one — you'll just see ACME retries in the log until you add them.

`bundle pool directory does not exist` and `No datasets found in database` are expected on a self-hosted node. They mean
"no bot detector" and "no image dataset"; neither affects `pow` or `puzzle`.

`PROSOPO_PROVIDER_IMAGE_VERSION` in your `.env` is set to the release your checkout documents. When you pull a newer
checkout, change it to match. `CADDY_IMAGE_VERSION` pins Caddy the same way.

## 3. Register a site key

```bash
docker compose exec provider /nodejs/bin/node /usr/src/app/provider.cli.bundle.js site_key_register \
  "$(grep '^PROSOPO_SITE_KEY=' .env | cut -d= -f2)" enterprise \
  --captcha_type puzzle \
  --domains example.com \
  --pow_difficulty 4 \
  --frictionless_threshold 0.5 \
  --image_threshold 0.8
```

Swap `puzzle` for `pow` if you prefer the invisible challenge. The last three flags are required by the command even
when they don't apply to your type; those values are safe defaults.

A self-hosted node enforces no request quota whichever tier you pick. The only difference is that `free` omits `score`
and `reason` from the verification response — use `enterprise` if you want them.

## 4. Build the widget

The CDN bundle is compiled to talk to Prosopo's fleet, so build your own with `PROSOPO_PROVIDER_LIST` baked in:

```bash
NODE_ENV=production \
PROSOPO_PROVIDER_LIST=https://captcha.example.com \
pnpm --filter @prosopo/procaptcha-bundle run bundle
```

A widget built this way never contacts Prosopo — it skips the hosted provider list and the `/healthz` discovery call
and goes straight to the providers you named. Set the same variable on your verifier, where it is read at runtime.

For several providers, pass comma-separated URLs, or the provider-list JSON if you want per-node weights. See the
[`@prosopo/load-balancer` README](packages/load-balancer).

Host `packages/procaptcha-bundle/dist/bundle/`, then:

```html
<script type="module" src="https://your-cdn.example.com/procaptcha.bundle.js" async defer></script>
<div class="procaptcha" data-sitekey="5Fpd..."></div>
```

The CAPTCHA type comes from the site key record, not the page.

The bundle is an ES module split into chunks, so `type="module"` is required and the whole `dist/bundle/` directory must
be hosted together.

## Bring your own detector

The steps above serve a fixed challenge to everyone. To score visitors yourself, load a detector of your own and register
the site key as `frictionless`. The provider then picks a challenge per visitor from your detector's score.

[`demos/detector-botd`](demos/detector-botd) is a working example built on [BotD](https://github.com/fingerprintjs/BotD).
It reports a score of `1` when BotD flags the browser as automated (headless Chrome, Selenium, Playwright, PhantomJS and
others) and `0` otherwise. It makes no requests to anyone but your provider.

```bash
pnpm --filter @prosopo/detector-botd run build
pnpm --filter @prosopo/detector-botd run pool --out detector-pool.json

docker compose exec -T provider /nodejs/bin/node /usr/src/app/provider.cli.bundle.js detector_pool_set < detector-pool.json
docker compose restart provider

docker compose exec provider /nodejs/bin/node /usr/src/app/provider.cli.bundle.js site_key_register \
  "$(grep '^PROSOPO_SITE_KEY=' .env | cut -d= -f2)" enterprise \
  --captcha_type frictionless \
  --domains example.com \
  --pow_difficulty 4 \
  --frictionless_threshold 0.5 \
  --frictionless_image_threshold 2 \
  --image_threshold 0.8
```

`pool` builds four bundles, each with its own RSA keypair: the public key goes into the bundle's JavaScript and the
private key stays on your provider. You never handle the encryption yourself. The provider gives each visitor one of the
bundles, and the detector encrypts what it reports with that bundle's key.

The pool is read from stdin, not copied in as a file, because the provider container does not run as root and could not
read a copied file. It is stored in the `detector_pool` volume, so it survives restarts and upgrades. Run the same
commands again to replace it.

The provider's score thresholds decide what each visitor gets:

- below `--frictionless_threshold` (0.5): invisible proof of work
- between that and `--frictionless_image_threshold`: a slider puzzle
- at or above `--frictionless_image_threshold`: an image challenge

The example sets the image threshold to `2`, above any score BotD gives, so flagged browsers get a puzzle. Leave it at its
default of `1` only if you have [loaded an image dataset](#image-captchas); without one, visitors routed to an image
challenge get an error.

### Writing your own

Replace `collectSignals` in [`demos/detector-botd/src/detector.ts`](demos/detector-botd/src/detector.ts) and rebuild the
pool. It returns a `score` and a `d` object:

```ts
const collectSignals = async (): Promise<Signals> => ({
  score: navigator.webdriver ? 1 : 0,
  d: { webDriver: navigator.webdriver, languages: navigator.languages.length },
});
```

Everything in `d` is stored on the session and passed to decision and routing machines as `input.d`, so a rule can act on
`input.d.botKind` or any key you add. Nothing on the provider declares the keys.
Values must be plain JSON: keys containing `.` or starting with `$` are dropped, and a `d` larger than 8 KB is dropped
whole.

The rest of the file handles the contract with the widget and the provider: the visitor's account, a hash of the user
agent and of `document.head`, a timestamp, and the encryption. Keep it as it is.

### What a self-built detector can and cannot do

Your detector runs in the visitor's browser, and its public key ships inside the bundle. Anyone who reads the bundle can
send any score they like. The provider checks that a token was made for this visitor, this browser and this page in the
last ten minutes, but it cannot check that the score is honest. That is true of every client-side detector; ours resists
it with obfuscation and per-bundle rotation, which the example does not attempt.

So a detector like this one stops off-the-shelf automation — default headless browsers and frameworks that make no effort
to hide — and it gives your rules signals to work with. It will not stop someone who studies your bundle and targets your
site.

`PROSOPO_DETECTOR_OPEN_FORMAT=1`, set in the self-hosted compose file, is what lets the provider load these bundles. A
provider without it ignores them.

## Image CAPTCHAs

`image` needs a dataset, which is why it isn't in the flow above. Build one with
[`@prosopo/datasets-fs`](packages/datasets-fs) — its README covers every command.

A dataset holds image **URLs**, not images. You host the images yourself and the dataset points at them.

```bash
pnpm --filter @prosopo/datasets-fs run build
cd packages/datasets-fs

node dist/cli.js flatten --in ./data --out ./flat --overwrite
node dist/cli.js labels --in ./flat/data.json --out ./labels.json --overwrite

# Upload ./flat/images somewhere public, then rewrite the paths to match.
node dist/cli.js relocate --in ./flat/data.json --out ./data-hosted.json \
  --from /abs/path/flat/images --to https://img.example.com --overwrite
node dist/cli.js get --in ./data-hosted.json      # confirms every URL resolves

node dist/cli.js generate-v2 --out ./captchas.json \
  --labelled ./data-hosted.json --unlabelled ./data-hosted.json \
  --labels ./labels.json --seed 0 --size 9 --count 100 \
  --minCorrect 1 --minIncorrect 1 --minLabelled 2 --maxLabelled 7 \
  --allowDuplicates --overwrite
```

`--count` defaults to zero — omit it and you get a dataset with no captchas in it, with no error.

```bash
docker compose cp ./captchas.json provider:/usr/src/app/captchas.json
docker compose exec provider /nodejs/bin/node /usr/src/app/provider.cli.bundle.js provider_set_data_set --file /usr/src/app/captchas.json
docker compose restart provider

docker compose exec provider /nodejs/bin/node /usr/src/app/provider.cli.bundle.js site_key_register "$(grep '^PROSOPO_SITE_KEY=' .env | cut -d= -f2)" enterprise \
  --captcha_type image --domains example.com \
  --pow_difficulty 4 --frictionless_threshold 0.5 --image_threshold 0.8
```

The restart is required. The provider resolves its default dataset at startup, so without it image challenges keep
failing with `No dataset available` even though the upload succeeded.

## Image asset signing

The provider can rewrite captcha image URLs into short-lived signed or sealed URLs at serve time, so a harvested URL
dies within its TTL instead of being refetchable forever. **Both are opt-in and off unless you supply a key**, so a
self-hosted dataset of plain `https://` URLs works exactly as written above — the URL in your dataset is what the
browser is handed.

Turn it on only if your CDN supports it:

- `PROSOPO_ASSET_TOKEN_KEY` — Bunny-style token signing. Optional `PROSOPO_ASSET_TOKEN_TTL_SECONDS`, and
  `PROSOPO_ASSET_TOKEN_BIND_IP=true` which additionally binds a URL to the requesting IP (this must match the pull
  zone's `ZoneSecurityIncludeHashRemoteIP` setting exactly, or every image 403s).
- `PROSOPO_ASSET_SEAL_KEYS` — opaque sealed paths opened at the edge, with `PROSOPO_ASSET_SEAL_ACTIVE_KEY_ID`,
  `PROSOPO_ASSET_SEAL_TTL_SECONDS` and `PROSOPO_ASSET_SEAL_URL_PREFIX`.

Signing happens strictly below `item.data`. The item hash, captchaId and datasetId are untouched, so enabling it later
changes nothing about an existing dataset or its verification.

## What this does not give you

A self-hosted node serves challenges and validates solutions. Unless you load a detector, it does not decide who is a
bot.

Our frictionless scoring needs our client-side detector, which is closed source and not in the public image. An explicit
`captcha_type` bypasses that path entirely, so `pow` and `puzzle` behave exactly as they do on the managed service, and
a site key left on `frictionless` against a detector-less provider falls back to proof of work.

More importantly, the managed Professional and Enterprise tiers run a detection layer on top of the challenge: sessions
feed a pipeline that scores traffic, runs machine learning over it, and blocks or challenges suspicious visitors
automatically, with access rules, traffic filters and analytics to tune it. None of that runs on a self-hosted node. A
self-hosted challenge is a fixed obstacle in front of your form — good against opportunistic automation, but it does not
adapt to an attacker who is targeting you specifically.

A [detector of your own](#bring-your-own-detector) adds scoring on signals you choose. [Contact us](https://prosopo.io/contact/)
if you want our obfuscated detector bundle for your own node.
