# Procaptcha Wrapper

## 1. About the package

It's a core package for all the Procaptcha framework integrations.

> Note: You shouldn't use this package directly as long as the target framework integration is available.

## 2. Configuration options

The package supports all the [Procaptcha options](https://docs.prosopo.io/en/basics/client-side-rendering/).
Below are listed the available configuration interfaces (which you can refer in your code):

```typescript
interface ProcaptchaOptions {
    /**
     * The site key of your application / website.
     * */
    siteKey: string;
    /**
     * The theme of the CAPTCHA widget
     * */
    theme?: WidgetTheme;
    /**
     * The type of CAPTCHA to render.
     */
    captchaType?: WidgetCaptchaType;
    callbacks?: WidgetCallbacks;
    /**
     * The language of the CAPTCHA widget.
     */
    language?: string;
}

type WidgetTheme = "light" | "dark";

enum WidgetThemes {
    Light = "light",
    Dark = "dark",
}

type WidgetCaptchaType = "frictionless" | "image" | "pow";

enum WidgetCaptchaTypes {
    Frictionless = "frictionless",
    Image = "image",
    ProofOfWork = "pow",
}

interface WidgetCallbacks {
    /**
     * The name of the window function, or a function, that will be called when the CAPTCHA is verified.
     */
    onVerified?: ((token: string) => void) | string;
    /**
     * The name of the window function, or a function, that will be called when the CAPTCHA challenge fails.
     */
    onFailed?: () => (() => void) | string;
    /**
     * The name of the window function, or a function, that will be called when the CAPTCHA challenge expires.
     */
    onChallengeExpired?: (() => void) | string;
    /**
     * The name of the window function, or a function, that will be called when the CAPTCHA is opened.
     */
    onOpened?: () => (() => void) | string;
    /**
     * The name of the window function, or a function, that will be called when the CAPTCHA is closed.
     */
    onClosed?: () => (() => void) | string;
    /**
     * The name of the window function, or a function, that will be called when the CAPTCHA is reset.
     */
    onReset?: () => (() => void) | string;
    /**
     * The name of the window function, or a function, that will be called when an error occurs.
     */
    onError?: () => ((error: Error) => void) | string;
}
```

## 3. Direct usage

This package is written in vanilla JS, so in case there is no integration for your framework yet, you can use the package
directly:

```typescript
import {type ProcaptchaOptions, procaptchaWrapper} from "@prosopo/procaptcha-wrapper";

async function renderProcaptcha(wrapperElement: HtmlElement, options: ProcaptchaOptions): Promise<void> {
    return procaptchaWrapper.renderProcaptcha(wrapperElement, options);
}

renderProcaptcha(document.querySelector('#my-procaptcha'));
```
