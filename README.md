# Prosopo Procaptcha

Prosopo Procaptcha is a drop-replacement for reCAPTCHA, hCaptcha, and Cloudflare Turnstile that protects user privacy and collects zero data.

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

It takes four containers and the published `prosopo/provider` image — no fork, no source edits, and no image dataset.
All of the required software is open source with the exception of the client-side detection library, which is only used
by the `frictionless` CAPTCHA type. [Contact us](https://prosopo.io/contact/) if you need help.
