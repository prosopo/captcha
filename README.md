# Prosopo Procaptcha

Prosopo Procaptcha is a drop-replacement for reCAPTCHA and hCaptcha that protects user privacy and collects zero data.

Sign up at [Prosopo](https://prosopo.io/#signup) to get your sitekey today. You need a sitekey to use this library.

# Implementation

Prosopo captcha can be easily implemented in your application via a script tag or a React component.

## Add the Procaptcha Widget to your Web page via a script tag

Procaptcha requires two small pieces of client side code to render a captcha widget on an HTML page. First, you must
include the Procaptcha JavaScript resource somewhere in your HTML page. The `<script>` must be loaded via HTTPS and can
be
placed anywhere on the page. Inside the <head> tag or immediately after the .procaptcha container are both fine.

```html

<script src="https://prosopo.io/js/procaptcha.bundle.js" async defer></script>
```

Second, you must add an empty DOM container where the Procaptcha widget will be inserted automatically. The container is
typically a <div> (but can be any element) and must have class `procaptcha` and a `data-sitekey` attribute set to your
public
site key.

```html 

<body>
<div class="procaptcha" data-sitekey="your_site_key"></div>
</body>
```

Typically, you'll want to include the empty `.procaptcha` container inside an HTML form. When a captcha is successfully
solved, a hidden JSON payload will automatically be added to your form that you can then POST to your server for
verification.
You can retrieve it server side with POST parameter `procaptcha-response`.

Here's a full example where Procaptcha is being used to protect a signup form from automated abuse. When the form is
submitted, the `procaptcha-response`  JSON data will be included with the email and password POST data after the captcha
is
solved.

```html

<html>
<head>
    <title>Procaptcha Demo</title>
    <script src="https://prosopo.io/js/procaptcha.bundle.js" async defer></script>
</head>
<body>
<form action="" method="POST">
    <input type="text" name="email" placeholder="Email"/>
    <input type="password" name="password" placeholder="Password"/>
    <div class="procaptcha" data-sitekey="your_site_key"></div>
    <br/>
    <input type="submit" value="Submit"/>
</form>
</body>
</html>
```

You can check out the current implementation of the
config [here](https://github.com/prosopo/captcha/blob/main/packages/types/src/config/config.ts).

### Procaptcha-response

The procaptcha-response JSON data contains the following fields:

| Key          | Type   | Description                                                                                                                   |
|--------------|--------|-------------------------------------------------------------------------------------------------------------------------------|
| commitmentId | string | The commitment ID of the captcha challenge. This is used to verify the user's response on-chain.                              |
| providerUrl  | string | The URL of the provider that the user used to solve the captcha challenge.                                                    |
| dapp         | string | The SITE_KEY of your application / website                                                                                    |
| user         | string | The user's account address                                                                                                    |
| blockNumber  | number | The block number of the captcha challenge. This is used to verify that the contacted provider was randomly selected on-chain. |

## Verify the User Response Server Side

To verify a user's response on the server side, simpy import the `verify` function from `@prosopo/server` and pass it
the `procaptcha-response` POST data. Types can be imported from `@prosopo/types`.

```typescript
import {ProsopoServer} from '@prosopo/server'
import {ApiParams} from '@prosopo/types'

...

if (await prosopoServer.isVerified(payload[ApiParams.procaptchaResponse])) {
    // perform CAPTCHA protected action
}
```

There is an example server side implementation
in [demos/client-example-server](https://github.com/prosopo/captcha/tree/main/demos/client-example-server).

