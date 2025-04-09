# Procaptcha Wrapper

## 1. About the package

It's a core package for all the Procaptcha framework integrations.

> Note: You shouldn't use this package directly as long as the target framework integration is available.

## 2. Configuration options

The package supports all the [Procaptcha options](https://docs.prosopo.io/en/basics/client-side-rendering/).

## 3. Direct usage

This package is written in vanilla JS, so in case there is no integration for your framework yet, you can use the package
directly:

```typescript
import { type ProcaptchaRenderOptions, renderProcaptcha} from "@prosopo/procaptcha-wrapper";

const container = document.querySelector('#your-element');

const procaptchaOptions: ProcaptchaRenderOptions = {
    siteKey: "your-site-key",
};

renderProcaptcha(container, procaptchaOptions);
```
