---
"@prosopo/types": minor
"@prosopo/provider": minor
"@prosopo/cli": minor
"@prosopo/procaptcha-frictionless": patch
"@prosopo/scripts": patch
"@prosopo/detector-botd": minor
---

Let a self-hosted provider run a detector you built yourself, and ship a working example built on BotD.

Until now the only detector a provider could load was ours. Its output can only be read by the closed decoder in the
provider, so a self-hosted node with any other detector had nothing to score visitors with.

**Open detector format.** A pool bundle can now be marked `format: "open-v1"`. The provider reads those bundles with a
short, documented decoder: an AES-256-GCM payload whose key is wrapped with the bundle's RSA-OAEP public key, carrying
`{ score, timestamp, userId, userAgent, headHash, d }`. The same checks apply as for our detector — the token must
match this visitor's account, user agent and page, and be under ten minutes old — and `d` reaches decision and routing
machines as `input.d`. Open bundles are only loaded when `PROSOPO_DETECTOR_OPEN_FORMAT=1`; the hosted fleet never sets
it, so nothing changes there.

**`demos/detector-botd`.** A detector built on BotD that scores automated browsers as 1 and everything else as 0, plus a
`pool` script that builds the bundles with a fresh keypair each. Writing your own detector means replacing one function;
the encryption is done for you.

**`detector_pool_set` CLI command.** Writes a pool read from stdin into the provider's pool directory. Stdin rather than a
file because the provider image runs as a non-root user and cannot read a file copied in as root.

**Self-hosted compose and image.** The image now creates its pool directory owned by the runtime user, and the
self-hosted compose file mounts a `detector_pool` volume there and turns the open format on. The compose file no longer
defaults to provider 3.8.19, which it had silently stayed on for nineteen releases: `generateSelfHostedEnv.ts` writes
the version of the checkout it runs from.

`SELF_HOSTING.md` gains a "Bring your own detector" section and now loads the widget with `type="module"`, which the
bundle has needed since it was split into chunks.

Tested end to end on a stack built from this branch: stock headless Chromium was flagged by BotD and served a puzzle,
headed Chromium passed with proof of work, the detector's signals were stored on the session, and a provider without
the flag rejected the pool.
