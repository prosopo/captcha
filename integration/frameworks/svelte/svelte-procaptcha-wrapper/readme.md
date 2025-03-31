# Svelte Procaptcha Wrapper

## 1. About the package

A Svelte component that provides seamless integration of [Procaptcha](https://prosopo.io/) into any Svelte project.

## 2. Installation

```bash
npm install @prosopo/svelte-procaptcha-wrapper
```

## 3. Usage

### 3.1) Basic setup

```typescript jsx
import {ProcaptchaComponent} from "@prosopo/svelte-procaptcha-wrapper";

<ProcaptchaComponent siteKey={"my-site-key"}/>;
```

### 3.2) Advanced usage

```typescript jsx
import {ProcaptchaComponent} from "@prosopo/svelte-procaptcha-wrapper";

<ProcaptchaComponent
    siteKey={"my-site-key"}
    captchaType={"image"}
    callbacks={{
        onVerified: (token: string): void => {
            console.log("verified", token);
        },
    }}
    htmlAttributes={{
        class: "my-app__procaptcha",
        style: {
            maxWidth: "600px",
        },
    }}
/>;
```

## 4. Configuration options

Check the [Procaptcha Docs](https://docs.prosopo.io/en/basics/client-side-rendering/) or `@prosopo/procaptcha-wrapper` package's readme to see the full list of the available options.
