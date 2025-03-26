# React Procaptcha Wrapper

## 1. About

A React component that provides seamless integration of [Procaptcha](https://prosopo.io/) into any React project.

## 2. Installation

```bash
npm install @prosopo/react-procaptcha-wrapper
```

## 3. Usage

### 3.1) Basic setup

```typescript jsx
import {ProcaptchaComponent} from "@prosopo/react-procaptcha-wrapper";

<ProcaptchaComponent siteKey={"my-site-key"}/>;
```

### 3.2) Advanced usage

```typescript jsx
import { ProcaptchaComponent } from "@prosopo/react-procaptcha-wrapper";

<ProcaptchaComponent
    siteKey={"my-site-key"}
    captchaType={"image"}
    callbacks={{
        onVerified: (token: string): void => {
            console.log("verified", token);
        },
    }}
    htmlAttributes={{
        className: "my-app__procaptcha",
        style: {
            maxWidth: "600px",
        },
    }}
/>;
```

## 4. Configuration options

The component support all [Procaptcha options](https://docs.prosopo.io/en/basics/client-side-rendering/).
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
    /**
     * The amount of time, in milliseconds, a successful CAPTCHA challenge is valid for.
     * Defaults to 2 minutes.
     */
    challengeValidLengthMs?: number;
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
