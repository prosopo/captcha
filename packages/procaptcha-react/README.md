# Prosopo Procaptcha React Component Library

React components for integrating [Prosopo Procaptcha](https://prosopo.io) into a React app.

Procaptcha is a drop-in replacement for reCAPTCHA, hCaptcha, and Cloudflare Turnstile that protects user privacy and collects zero data. [Sign up for free](https://prosopo.io/register) to get your site key.

## Installation

```bash
npm install @prosopo/procaptcha-react --save
```

## Basic Usage

```tsx
import { Procaptcha } from "@prosopo/procaptcha-react"

<Procaptcha config={config} callbacks={{ onHuman, onError, onExpired }} />
```

See the [client example](https://github.com/prosopo/captcha/tree/main/demos/client-example) for a working demo.

### Callbacks

All callbacks are optional via `ProcaptchaCallbacks`:

| Callback               | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `onHuman`              | Called when the user passes the challenge. Receives a token.     |
| `onError`              | Called when an error occurs. Receives an `Error` object.         |
| `onExpired`            | Called when the challenge expires (user took too long).           |
| `onFailed`             | Called when the user fails the challenge.                         |
| `onClose`              | Called when the challenge modal is closed.                        |
| `onOpen`               | Called when the challenge modal is opened.                        |
| `onReset`              | Called when the challenge is reset.                               |
| `onExtensionNotFound`  | Called when a required browser extension is not found.            |

### onHuman

The `onHuman` callback receives a `ProcaptchaToken` (a hex-encoded string) that should be sent to your backend for server-side verification.

## Config

The config requires your site key. All other fields are optional.

```tsx
const config: ProcaptchaClientConfigInput = {
    account: {
        address: process.env.PROSOPO_SITE_KEY || undefined,
    },
    web2: true,
    dappName: "my-app",
    solutionThreshold: 80,
}
```

### Config Options

| Key               | Type    | Default              | Description                                                    |
| ----------------- | ------- | -------------------- | -------------------------------------------------------------- |
| account.address   | string  | (required)           | The site key you received when you signed up                    |
| web2              | boolean | `true`               | Set to `true` for standard web usage                            |
| dappName          | string  | `"ProsopoClientDapp"`| The name of your application                                   |
| solutionThreshold | number  | `80`                 | Percentage of correct answers required to pass (0-100)          |
| theme             | string  | `"light"`            | `"light"` or `"dark"`                                           |
| mode              | string  | `"visible"`          | `"visible"` or `"invisible"`                                    |
| language          | string  | (auto)               | Language override                                               |

## Server-side Verification

Use the [@prosopo/server](https://github.com/prosopo/captcha/tree/main/packages/server) package to verify the token on your backend. See the [docs](https://docs.prosopo.io) for full integration instructions.
