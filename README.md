# Prosopo Procaptcha

Prosopo Procaptcha is a drop-replacement for reCAPTCHA and hCaptcha that protects user privacy and collects zero data.

[Sign up for free](https://prosopo.io/register) and get your sitekey today. You need a sitekey to use
this library.

## Configuration

Prosopo captcha can be easily implemented in your application via a script tag or a React component.

### Add the Procaptcha Widget to your Web page via a script tag

First, you must include the Procaptcha JavaScript resource somewhere in your HTML page. The `<script>` must be loaded
via HTTPS and can be placed anywhere on the page. Inside the <head> tag or immediately after the `.procaptcha` container
are both fine.

```html
<script type="module" src="https://js.prosopo.io/js/procaptcha.bundle.js" async defer></script>
```

Now, you can either render the Procaptcha widget implicitly or explicitly.

#### Implicit Rendering Using `.procaptcha` Container

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
verification. You can retrieve it server side with POST parameter `procaptcha-response`.

Here's a full example where Procaptcha is being used to protect a signup form from automated abuse. When the form is
submitted, the `procaptcha-response` JSON data will be included with the email and password POST data after the captcha
is solved.

##### Example of implicit rendering

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

#### Explicit Rendering

If you prefer to render the widget yourself, you can use the `Procaptcha.render()` method. The `Procaptcha.render()`
must be called after the procaptcha.bundle.js script has loaded.

##### Example of explicit rendering

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
    function onCaptchaVerified(output) {
        console.log('Captcha verified, output: ' + JSON.stringify(output))
    }

    // Get the Element using elementId
    const captchaContainer = document.getElementById('procaptcha-container')
    // Render the CAPTCHA explicitly on a container with id "procaptcha-container"
    window.procaptcha.render(captchaContainer, {
        siteKey: 'YOUR_SITE_KEY',
        theme: 'dark',
        callback: onCaptchaVerified,
    })
})
```

#### Procaptcha Options

The `Procaptcha.render()` function takes an options object as its second argument. The options object can contain the
following fields:

| Key                    | Type     | Description                                                                                              | Required |
| ---------------------- | -------- | -------------------------------------------------------------------------------------------------------- | -------- |
| siteKey                | string   | The site key of your application / website. This is required.                                            | ✓        |
| callback               | function | The function that will be called when the CAPTCHA is verified.                                           | ✗        |
| theme                  | string   | The theme of the CAPTCHA widget. The default is `light`. The other option is `dark`.                     | ✗        |
| captchaType            | string   | The type of CAPTCHA to render. The default is `frictionless`. Other options are `image`, `pow`.          | ✗        |
| chalexpired-callback   | string   | The name of the window function that will be called when the CAPTCHA challenge expires.                  | ✗        |
| error-callback         | string   | The name of the window function that will be called when an error occurs.                                | ✗        |
| close-callback         | string   | The name of the window function that will be called when the CAPTCHA is closed.                          | ✗        |
| open-callback          | string   | The name of the window function that will be called when the CAPTCHA is opened.                          | ✗        |
| expired-callback       | string   | The name of the window function that will be called when the CAPTCHA solution expires.                   | ✗        |
| challenge-valid-length | number   | The amount of time, in milliseconds, a successful CAPTCHA challenge is valid for. Defaults to 2 minutes. | ✗        |

The same options can be passed to the implicit rendering method by adding them as data attributes to the `.procaptcha`.
For example, to set the theme to dark, you would add `data-theme="dark"` to the `.procaptcha` container.

```html
<div class="procaptcha" data-sitekey="your_site_key" data-theme="dark"></div>
```

##### `captchaType`

You can choose to implement any of the following types of captcha when rendering the Procaptcha component:

| Type           | Description                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frictionless` | The default CAPTCHA type is `frictionless`. This type of CAPTCHA is invisible to the user, only requiring them to complete an invisible [Proof of Work challenge](https://en.wikipedia.org/wiki/Proof_of_work) (`pow`). Suspected bots are served image captcha challenges (`image`). |
| `pow`          | The `pow` CAPTCHA type requires the user to solve a cryptographic puzzle. This puzzle simply requires a small amount of computational work to solve, and slows down bots significantly, making it difficult for them to scrape in high volumes.                                       |
| `image`        | The `image` CAPTCHA type requires the user to solve a simple image CAPTCHA. This is CAPTCHA type most people are familiar with, created by Google reCAPTCHA.                                                                                                                          |

#### `procaptcha-response` JSON Data

The output from the `onCaptchaVerified` function is the `procaptcha-response` JSON data. The `procaptcha-response` JSON
data contains the following fields:

| Key          | Type   | Description                                                                                                                   |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| commitmentId | string | The commitment ID of the captcha challenge. This is only available in image or Frictionless mode.                             |
| challenge    | string | The Proof-of-Work challenge that the user solved. This is only available in PoW or Frictionless mode.                         |
| providerUrl  | string | The URL of the provider that the user used to solve the captcha challenge.                                                    |
| dapp         | string | The SITE_KEY of your application / website                                                                                    |
| user         | string | The user's account address                                                                                                    |
| blockNumber  | number | The block number of the captcha challenge. This is used to verify that the contacted provider was randomly selected on-chain. |

### Add the Procaptcha Widget to your site with React

You must import Procaptcha, define a config with ProcaptchaConfigSchema, optionally define callbacks, and render via the Procaptcha component. A minimal example would be as follows:

```javascript
import { Procaptcha } from '@prosopo/procaptcha-react'
import { ProcaptchaConfigSchema } from '@prosopo/types'

const MyApp = () => {
    const config = ProcaptchaConfigSchema.parse({
        account: {
            address: 'YOUR_SITEKEY',
        },
        // Other config options, see demos/client-example for more details
    })

    return <Procaptcha config={config} />
}

export default MyApp
```

Further example usage can be seen in [demos/client-example](https://github.com/prosopo/captcha/blob/main/demos/client-example/src/App.tsx#L220C1-L223C43)

### Verify the User `procaptcha-response` data Server Side

By adding the client side code, you were able to render a Procaptcha widget that identified if users were real people or
automated bots. When the captcha succeeded, the Procaptcha script inserted unique data into your form data, which is
then sent to your server for verification. The are currently two options for verifying the user's response server side:

#### Option 1. API Verification

To verify that the token is indeed real and valid, you must now verify it at the API endpoint:

https://api.prosopo.io/siteverify

The endpoint expects a POST request with the `procaptcha-response` sent from your frontend HTML to your backend for
verification.

A simple test will look like this, where the contents in data is the `procaptcha-response` JSON data, after being
parsed:

```javascript
// pseudocode
// get the contents of the procaptcha-response JSON data
data = req.body['procaptcha-response']

// send a POST application/json request to the API endpoint
response = POST('https://api.prosopo.io/siteverify', {
    providerUrl: data.providerUrl,
    user: data.user,
    dapp: YOUR_SITE_KEY, // Make sure to replace YOUR_SITE_KEY with your actual site key
    challenge: data.commitmentId,
    blockNumber: data.blockNumber,
})
```

Or, as a CURL command:

```bash
curl --location 'https://api.prosopo.io/siteverify' \
--header 'Content-Type: application/json' \
--data '{
    "providerUrl": "...",
    "user": "...",
    "dapp": "...",
    "challenge": "...",
    "blockNumber": ...
}'
```

Note that the endpoint expects the application/json Content-Type. You can see exactly what is sent
using

```bash
curl -vv
```

in the example above.

#### Option 2. Verification Package

So far, we only have a TypeScript implementation of the Procaptcha verification package. However, we are working on
delivering additional language support in the future.

##### TypeScript Verification

To verify a user's response using TypeScript, simpy import the `verify` function from `@prosopo/server` and pass it
the `procaptcha-response` POST data. Types can be imported from `@prosopo/types`.

```typescript
import {ProsopoServer} from '@prosopo/server'
import {ApiParams} from '@prosopo/types'

...
// parse the body received from the frontend
const payload = JSON.parse(event.body)

// parse the procaptcha response, which is a JSON string
const procaptchaResponse = JSON.parse(payload[ApiParams.procaptchaResponse])

// initialise the `ProsopoServer` class
const prosopoServer = new ProsopoServer(config, pair)

// check if the captcha response is verified
if (await prosopoServer.isVerified(procaptchaResponse)) {
    // perform CAPTCHA protected action
}
```

There is an example TypeScript server side implementation
in [demos/client-example-server](https://github.com/prosopo/captcha/tree/main/demos/client-example-server).

#### Specifying timeouts

Custom timeouts can be specified for the length of time in which a user has to solve the CAPTCHA challenge. The defaults are as follows:

```typescript
const defaultCaptchaTimeouts = {
    image: {
        // The timeframe in which a user must complete an image captcha (1 minute)
        challengeTimeout: 60000,
        // The timeframe in which an image captcha solution remains valid on the page before timing out (2 minutes)
        solutionTimeout: 60000 * 2,
        // The timeframe in which an image captcha solution must be verified server side (3 minutes)
        verifiedTimeout: 60000 * 3,
        // The time in milliseconds that a cached, verified, image captcha solution is valid for (15 minutes)
        cachedTimeout: 60000 * 15,
    },
    pow: {
        // The timeframe in which a pow captcha solution remains valid on the page before timing out (1 minute)
        challengeTimeout: 60000,
        // The timeframe in which a pow captcha must be completed and verified (2 minutes)
        solutionTimeout: 60000 * 2,
        // The time in milliseconds that a Provider cached, verified, pow captcha solution is valid for (3 minutes)
        cachedTimeout: 60000 * 3,
    },
}
```

To specify timeouts using API verification, pass the above object in a field called `timeouts`, implementing one or more of the timeouts.

```typescript
// send a POST application/json request to the API endpoint
response = POST('https://api.prosopo.io/siteverify', {
    ...
    timeouts: defaultCaptchaTimeouts, // add timeouts object here
})
```

To specify timeouts using the verification package, pass the above object in the `timeouts` field of the `ProsopoServer` config, implementing one or more of the timeouts.

```typescript
config = { timeouts: defaultCaptchaTimeouts, ...config }
const prosopoServer = new ProsopoServer(config, pair)
```

## Rendering different CAPTCHA types with Procaptcha

### Frictionless CAPTCHA

Procaptcha's default `frictionless` feature dynamically detects if the user is a bot or a human. If the user is likely
to be a bot, the user will be presented with a Proof-of-Work CAPTCHA challenge. If the user is likely to be a human, the
user will not be presented with an image CAPTCHA challenge.

Serve a Frictionless CAPTCHA by setting the `captchaType` to `frictionless`, or by omitting it, as it is the default
setting.

#### Example of Frictionless CAPTCHA implicit rendering

```html
<div class="procaptcha" data-sitekey="your_site_key"></div>

<!-- or -->

<div class="procaptcha" data-sitekey="your_site_key" data-captcha-type="frictionless"></div>
```

#### Example of Frictionless CAPTCHA rendering

```javascript
document.getElementById('procaptcha-script').addEventListener('load', function () {
    function onCaptchaVerified(output) {
        console.log('Captcha verified, output: ' + JSON.stringify(output))
    }
    // Get the Element using elementId
    const captchaContainer = document.getElementById('procaptcha-container')
    window.procaptcha.render(captchaContainer, {
        siteKey: 'YOUR_SITE_KEY',
        theme: 'dark',
        callback: onCaptchaVerified,
        captchaType: 'frictionless', // can also be omitted
    })
})
```

### Proof of Work CAPTCHA

Procaptcha's Proof-of-Work feature deters bot attacks by requiring users to solve a cryptographic puzzle. The
puzzle is easy for humans to solve but computationally expensive for bots. Serve a Proof-of-Work CAPTCHA by setting
the `captchaType` to `pow`.

#### Example of Proof-of-Work CAPTCHA implicit rendering

```html
<div class="procaptcha" data-sitekey="your_site_key" data-captcha-type="pow"></div>
```

#### Example of Proof-of-Work CAPTCHA rendering

```javascript
document.getElementById('procaptcha-script').addEventListener('load', function () {
    function onCaptchaVerified(output) {
        console.log('Captcha verified, output: ' + JSON.stringify(output))
    }
    // Get the Element using elementId
    const captchaContainer = document.getElementById('procaptcha-container')
    window.procaptcha.render(captchaContainer, {
        siteKey: 'YOUR_SITE_KEY',
        theme: 'dark',
        callback: onCaptchaVerified,
        captchaType: 'pow',
    })
})
```

### Image CAPTCHA

Procaptcha's' `image` setting displays an image CAPTCHA to users. Serve an image CAPTCHA by setting the `captchaType`
to `image`.

#### Example of Image CAPTCHA implicit rendering

```html
<div class="procaptcha" data-sitekey="your_site_key" data-captcha-type="image"></div>
```

#### Example of Image CAPTCHA explicit rendering

```javascript
document.getElementById('procaptcha-script').addEventListener('load', function () {
    function onCaptchaVerified(output) {
        console.log('Captcha verified, output: ' + JSON.stringify(output))
    }
    // Get the Element using elementId
    const captchaContainer = document.getElementById('procaptcha-container')
    window.procaptcha.render(captchaContainer, {
        siteKey: 'YOUR_SITE_KEY',
        theme: 'dark',
        callback: onCaptchaVerified,
        captchaType: 'image',
    })
})
```

## Demos

### React Demo

You can view an end-to-end example of how to implement Procaptcha in a React application in
our [client-example](/modules/_prosopo_client_example.html)
and [client-example-server](/modules/_prosopo_client_example_server.html) packages. Details
of how to run the examples are in the documentation at the previous links.

### HTML Demo

You can view an example of the bundle being used in a simple HTML page in
the [client-bundle-example](/modules/_prosopo_client_bundle_example.html). This example is
frontend only.
