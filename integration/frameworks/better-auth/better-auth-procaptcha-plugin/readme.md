# @prosopo/better-auth-procaptcha-plugin

[Prosopo Procaptcha](https://prosopo.io) bot protection for [Better Auth](https://www.better-auth.com).

The server plugin checks a Procaptcha token before Better Auth runs a protected endpoint, such as sign-up, sign-in or
password reset. Requests without a valid token are rejected before they reach your database.

- Works with Better Auth `^1.7.0`. Tested against 1.7.0 and 1.7.15.
- Uses only Better Auth's public plugin API (`onRequest`, `getIP` from `better-auth/api`, client `fetchPlugins`).
- Verifies tokens with Prosopo's [siteverify API](https://docs.prosopo.io/en/basics/server-side-verification/).

## Install

```bash
npm install @prosopo/better-auth-procaptcha-plugin
```

You need a site key and a secret key from the [Prosopo portal](https://portal.prosopo.io).

## Server

```ts
import { betterAuth } from "better-auth";
import { procaptcha } from "@prosopo/better-auth-procaptcha-plugin";

export const auth = betterAuth({
	plugins: [
		procaptcha({
			secretKey: process.env.PROSOPO_SECRET_KEY as string,
		}),
	],
});
```

By default the plugin protects `/sign-up/email`, `/sign-in/email` and `/request-password-reset`, the same endpoints as
Better Auth's built-in captcha plugin.

For each protected request the plugin:

1. reads the token from the `x-captcha-response` header,
2. sends `{ secret, token, ip }` to `https://api.prosopo.io/siteverify`,
3. lets the request through only if the answer is `verified: true`.

### Options

| Option            | Default                                                    | What it does                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secretKey`       | (required)                                                 | Your site's secret key.                                                                                                                                          |
| `endpoints`       | `["/sign-up/email", "/sign-in/email", "/request-password-reset"]` | Paths to protect, without the Better Auth base path. `*` matches one path segment, `**` matches any depth, for example `/sign-in/*`.                           |
| `siteVerifyURL`   | `https://api.prosopo.io/siteverify`                        | Use `https://eu-api.prosopo.io/siteverify` or `https://us-api.prosopo.io/siteverify` to keep verification in one region.                                         |
| `headerName`      | `x-captcha-response`                                       | The request header that carries the token.                                                                                                                       |
| `sendIP`          | `true`                                                     | Send the visitor's IP so Prosopo can compare it with the IP that solved the captcha. The IP comes from Better Auth's `advanced.ipAddress` settings.              |
| `sendEmailDomain` | `false`                                                    | Send the domain of the `email` field in the request body (not the full address) for Prosopo's disposable and spam email filter.                                  |
| `maxScore`        | none                                                       | Reject verified tokens whose risk score is above this number. Scores run from 0 (human) to 1 (bot) and are only returned on plans that include them.            |
| `timeoutMs`       | `10000`                                                    | How long to wait for siteverify before failing the request.                                                                                                      |
| `fetch`           | global `fetch`                                             | A custom fetch, for example one that goes through a proxy.                                                                                                       |

### Errors

The plugin answers with a JSON body `{ "code": "...", "message": "..." }`.

| Status | `code`                           | When                                                                                           |
| ------ | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| 400    | `PROCAPTCHA_MISSING_RESPONSE`    | The request has no token.                                                                      |
| 403    | `PROCAPTCHA_VERIFICATION_FAILED` | Prosopo did not verify the token, or its score is above `maxScore`.                           |
| 503    | `PROCAPTCHA_SERVICE_UNAVAILABLE` | siteverify could not be reached, timed out, rate limited the request or returned a 5xx.       |
| 500    | `PROCAPTCHA_UNKNOWN_ERROR`       | The plugin is misconfigured: no `secretKey`, or siteverify rejected the secret or the request. |

The plugin fails closed: if Prosopo cannot be reached, protected requests are rejected. The reason for a 500 or 503 is
written to the Better Auth logger.

### Verifying a token yourself

`verifyProcaptchaToken` is the same check the plugin runs, for use in your own endpoints:

```ts
import { verifyProcaptchaToken } from "@prosopo/better-auth-procaptcha-plugin";

const result = await verifyProcaptchaToken({ secretKey, token, ip });
if (result.outcome !== "verified") {
	// reject
}
```

## Client

Render the Procaptcha widget as described in the [client-side rendering guide](https://docs.prosopo.io/en/basics/client-side-rendering/),
or with one of the framework wrappers, and keep the token it gives you.

Then pass the token to Better Auth, either per request:

```ts
import { createAuthClient } from "better-auth/client";
import {
	procaptchaClient,
	procaptchaHeaders,
} from "@prosopo/better-auth-procaptcha-plugin/client";

const authClient = createAuthClient({ plugins: [procaptchaClient()] });

await authClient.signIn.email({
	email,
	password,
	fetchOptions: { headers: procaptchaHeaders(token) },
});
```

or automatically, by giving the client plugin a function that returns the current token:

```ts
let token: string | undefined;

window.procaptcha.render(document.getElementById("procaptcha-container"), {
	siteKey: "YOUR_SITE_KEY",
	callback: (value: string) => {
		token = value;
	},
	"expired-callback": () => {
		token = undefined;
	},
});

const authClient = createAuthClient({
	plugins: [procaptchaClient({ getToken: () => token })],
});
```

The client plugin only adds the header to requests for the protected endpoints. If you change `endpoints` or
`headerName` on the server, pass the same values to `procaptchaClient`.

A token can be verified only once and expires a few minutes after it is issued, so the visitor needs to solve the
captcha again after each attempt.

## Testing

Prosopo's [test site keys](https://docs.prosopo.io/en/basics/test-keys/) work with this plugin. With the always-pass
site key, siteverify returns `verified: true` for any secret, so you can run your sign-up and sign-in flows end to end
in CI without solving a captcha.

When Better Auth runs in development or test mode and no IP header is present, it reports the visitor's IP as
`127.0.0.1`. Set `sendIP: false` locally if you use IP validation rules on your site.

## License

Apache-2.0
