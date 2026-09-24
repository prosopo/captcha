# Prosopo Procaptcha

Prosopo Procaptcha is a drop-replacement for reCAPTCHA, hCaptcha, and Cloudflare Turnstile that protects user privacy and collects zero data.

**Licensed [Apache-2.0](LICENSE)** — a permissive OSI-approved licence, for commercial use as well as non-commercial,
with no seat or traffic limit on the code itself.

[Sign up for free](https://prosopo.io/register) and get your sitekey today. You need a sitekey to use
this library.

## Get Started

See our [docs](https://docs.prosopo.io) for help setting up Procaptcha on your website or in your app.

## Development Environment

The monorepo for the Prosopo Procaptcha bot protection software includes open source packages associated
with [Procaptcha](https://prosopo.io/products/gdpr-compliant-captcha/).

See [for-devs.md](for-devs.md) for information on setting up your development environment.

## Self-Hosting

You can run this software as a self-hosted bot protection solution. See [SELF_HOSTING.md](SELF_HOSTING.md) for a
step-by-step guide, or the [full version in our docs](https://docs.prosopo.io/en/self-hosting/).

It takes four containers, a generated `.env` and the published `prosopo/provider` image — no fork, no source edits,
and no image dataset:

```bash
git clone https://github.com/prosopo/captcha && cd captcha && npm ci
npx tsx ./dev/scripts/src/scripts/generateSelfHostedEnv.ts --host captcha.example.com
docker compose -f docker-compose.self-hosted.yml up -d
```

Everything required is Apache-2.0 except the client-side detection library, which is used only by the `frictionless`
CAPTCHA type — `pow` and `puzzle` need nothing closed-source and no dataset. [Contact us](https://prosopo.io/contact/)
if you need help.

## Integrations

First-party client and server packages, all in this repo:

| | |
| --- | --- |
| Frameworks | [React](integration/frameworks/react), [Vue](integration/frameworks/vue), [Svelte](integration/frameworks/svelte), [Angular](integration/frameworks/angular), [Next.js](integration/frameworks/next) |
| Server-side | [`@prosopo/server`](packages/server) for token verification in any Node app |
| WordPress | [Plugin](https://wordpress.org/plugins/prosopo-procaptcha/) covering Contact Form 7, Gravity Forms, WPForms, Ninja Forms, Fluent Forms, Formidable, Everest Forms, User Registration, WooCommerce, MemberPress, bbPress, Elementor Pro, Beaver Builder, JetPack and Spectra |
| Edge | Cloudflare Workers and AWS Lambda@Edge — see [the docs](https://docs.prosopo.io/en/protect-edge/) |
