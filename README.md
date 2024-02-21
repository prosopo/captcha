# Prosopo Procaptcha

Prosopo Procaptcha is a drop-replacement for reCAPTCHA and hCaptcha that protects user privacy and collects zero data.

Prosopo is a distributed human verification service that can be used to stop bots from interacting with your apps.

Sign up to be a network [beta tester](https://prosopo.io/#signup) to get your sitekey today. You need a sitekey to use
this library.

# Configuration

Prosopo captcha can be easily implemented in your application via a script tag or a React component.

## Add the Procaptcha Widget to your Web page via a script tag

First, you must include the Procaptcha JavaScript resource somewhere in your HTML page. The `<script>` must be loaded
via HTTPS and can
be placed anywhere on the page. Inside the <head> tag or immediately after the `.procaptcha` container are both fine.

```html
<script type="module" src="https://js.prosopo.io/js/procaptcha.bundle.js" async defer></script>
```

Now, you can either render the Procaptcha widget implicitly or explicitly.

### Implicit Rendering Using `.procaptcha` Container

Add an empty DOM container where the Procaptcha widget will be inserted automatically. The container is
typically a `<div>` (but can be any element) and must have class `procaptcha` and a `data-sitekey` attribute set to your
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
submitted, the `procaptcha-response` JSON data will be included with the email and password POST data after the captcha
is
solved.

#### Example of implicit rendering

```html
<html>
    <head>
        <title>Procaptcha Demo</title>
        <script type="module" src="https://js.prosopo.io/js/procaptcha.bundle.js" async defer></script>
    </head>
    <body>
        <form action="" method="POST">
            <input type="text" name="email" placeholder="Email" />
            <input type="password" name="password" placeholder="Password" />
            <div class="procaptcha" data-sitekey="your_site_key"></div>
            <br />
            <input type="submit" value="Submit" />
        </form>
    </body>
</html>
```

### Explicit Rendering

If you prefer to render the widget yourself, you can use the `Procaptcha.render()` method. The `Procaptcha.render()`
must be called after the procaptcha.bundle.js script has loaded.

#### Example of explicit rendering

The script is loaded in the head of the document and given the id `procaptcha-script`. A container is created with the
id `procaptcha-container` where the widget will be rendered.

```html
<html>
    <head>
        <script
            type="module"
            id="procaptcha-script"
            src="https://js.prosopo.io/js/procaptcha.bundle.js"
            async
            defer
        ></script>
    </head>
    <body>
        <div id="procaptcha-container"></div>
    </body>
</html>
```

An `onload` event is added to the script tag to call the render function when the script has loaded.

```javascript
// A function that will call the render Procaptcha function when the procaptcha script has loaded
document.getElementById('procaptcha-script').addEventListener('load', function () {
    // Define a callback function to be called when the CAPTCHA is verified
    window.onCaptchaVerified = function (output) {
        console.log('Captcha verified, output: ' + JSON.stringify(output))
    }

    // Render the CAPTCHA explicitly on a container with id "procaptcha-container"
    window.procaptcha.render('procaptcha-container', {
        siteKey: 'YOUR_SITE_KEY',
        theme: 'dark',
        callback: 'onCaptchaVerified',
    })
})
```

### Procaptcha-response

The output from the `onCaptchaVerified` function is the `procaptcha-response` JSON data. The `procaptcha-response` JSON
data contains the following fields:

| Key          | Type   | Description                                                                                                                   |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
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
