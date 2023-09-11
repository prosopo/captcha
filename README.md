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

<script src="https://prosopo.io/js/prosopo.procaptcha.bundle.js" async defer></script>
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
submitted, the `procaptcha-response` token will be included with the email and password POST data after the captcha is
solved.

```html

<html>
<head>
    <title>Procaptcha Demo</title>
    <script src="https://js.prosopo.io/prosopo.procaptcha.bundle.js" async defer></script>
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

## Add the Procaptcha Widget to your Web page using a React Component

You can see Procaptcha being used as a React component in
our [React Demo](https://github.com/prosopo/captcha/blob/8b8663bf0412e5fd349d40c270dd5b1b9f56dc2a/demos/client-example/src/App.tsx#L224-L227).

The Procaptcha component is called as follows:

```tsx


<Procaptcha
    config={config}
    callbacks={{onAccountNotFound, onError, onHuman, onExpired}}
/>
```

A config object is required and must contain your sitekey. The callbacks are optional and can be used to handle the
various procaptcha events. The following config demonstrates the `REACT_APP_DAPP_SITE_KEY` variable being pulled from
environment variables.

```tsx
const config: ProcaptchaConfigOptional = {
    account: {
        address: process.env.REACT_APP_DAPP_SITE_KEY || undefined,
    },
    web2: 'true',
    dappName: 'client-example',
    defaultEnvironment: 'rococo',
    networks: {
        rococo: {
            endpoint: 'wss://rococo-contracts-rpc.polkadot.io:443',
            contract: {
                address: '5HiVWQhJrysNcFNEWf2crArKht16zrhro3FcekVWocyQjx5u',
                name: 'prosopo',
            },
        },
    },
    solutionThreshold: 80,
}
```

### Config Options
| Key                | Type   | Description                                                                             |
|--------------------|--------|-----------------------------------------------------------------------------------------|
| account            | string | The site key you received when you signed up                                            |
| web2               | string | Set to 'true' to enable web2 support                                                    |
| dappName           | string | The name of your application / website                                                  |
| defaultEnvironment | string | The default environment to use - set to `rococo`                                        |
| networks           | object | The networks your application supports - copy paste this from the config above          |
| solutionThreshold  | number | The percentage of captcha that a user must have answered correctly to identify as human |

