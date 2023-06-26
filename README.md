# Prosopo Procaptcha

Prosopo Procaptcha is a drop-replacement for reCAPTCHA and hCaptcha that protects user privacy and collects zero data.

Sign up at [Prosopo](https://prosopo.io/signup) to get your sitekey today. You need a sitekey to use this library.

# Implementation

Prosopo captcha can be easily implemented in your application via a script tag or a React component.

## Add the Procaptcha Widget to your Web page via a script tag

Procaptcha requires two small pieces of client side code to render a captcha widget on an HTML page. First, you must
include the Procaptcha JavaScript resource somewhere in your HTML page. The `<script>` must be loaded via HTTPS and can be
placed anywhere on the page. Inside the <head> tag or immediately after the .procaptcha container are both fine.

```html

<script src="https://js.prosopo.io/procaptcha_bundle.main.bundle.js" async defer></script>
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

Typically, you'll want to include the empty .procaptcha container inside an HTML form. When a captcha is successfully
solved, a hidden JSON payload will automatically be added to your form that you can then POST to your server for verification.
You can retrieve it server side with POST parameter `procaptcha-response`.

Here's a full example where Procaptcha is being used to protect a signup form from automated abuse. When the form is
submitted, the `procaptcha-response` token will be included with the email and password POST data after the captcha is
solved.

```html
<html>
  <head>
    <title>Procaptcha Demo</title>
    <script src="https://js.prosopo.io/procaptcha_bundle.main.bundle.js" async defer></script>
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

## Add the Procaptcha Widget to your Web page using a React Component

TODO





