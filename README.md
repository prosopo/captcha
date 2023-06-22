# Prosopo Procaptcha

Prosopo Captcha is a drop-replacement for reCAPTCHA and hCaptcha that protects user privacy and collects zero data.

Sign up at [Prosopo](https://prosopo.io/signup) to get your sitekey today. You need a sitekey to use this library.

# Implementation

Prosopo captcha can be implemented in your app in various ways.

## Website Bundle

Load the JavaScript bundle in the head section of your website or application.

```html

<head>
    <script src="procaptcha_bundle.main.bundle.js?render=YOUR_SITE_KEY"></script>
</head>
```

Create an element on your page with the id `procaptcha`. The captcha will be loaded to this element when the document is
ready.

```html

<body>
<div id="procaptcha"></div>
</body>
```

## React Component



