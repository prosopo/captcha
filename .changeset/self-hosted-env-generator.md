---
---

Add a script that generates a complete self-hosted environment file.

Setting up a self-hosted provider meant copying a template and hand-filling a dozen values, including two account
mnemonics and two database passwords. Documentation for that can only say `choose-a-strong-password` and
`captcha.example.com`, which is exactly the sort of placeholder that gets pasted verbatim into production.

`generateSelfHostedEnv.ts` takes the hostname and does the rest:

```bash
npx tsx ./dev/scripts/src/scripts/generateSelfHostedEnv.ts --host captcha.example.com
```

It generates the provider/admin account, a separate site key account, and random Mongo and Redis passwords, then
derives `CADDY_DOMAIN` and `PROSOPO_PROVIDER_LIST` from the host and fills in every remaining value — including the
two `PROSOPO_IPAPI_*` variables that must be present or the provider exits on a config error, and the `CADDY_*`
variables that drive the shipped `provider.Caddyfile`. The site key address is logged so it can go straight onto a
page.

Details:

- Passwords are base64url, not base64. `getMongoURI` interpolates the password into the connection string without
  escaping it, so `@`, `:`, `/` and `+` would corrupt the URI. base64url emits only `[A-Za-z0-9_-]`, which is also
  safe unquoted in a .env file.
- The file is written `0600` and refuses to overwrite without `--force`, since regenerating hands an existing
  provider a new identity and new credentials for a database that still holds the old ones.
- `--host` rejects a URL. `CADDY_DOMAIN` wants a bare name as its certificate subject while `PROSOPO_PROVIDER_LIST`
  wants an `https://` origin, and deriving both from one bare hostname keeps them consistent.
- Output defaults to `.env` rather than `.env.production`. Docker Compose only auto-loads a file literally called
  `.env`, and with any other name the `${PROSOPO_DATABASE_USERNAME}` interpolation in a compose file silently
  resolves to empty and Mongo starts with blank credentials. Verified by hitting exactly that.

Verified end to end: generated a file, brought up Mongo, Redis and the provider from it with a plain
`docker compose up -d`, registered the generated site key and received a puzzle challenge.
