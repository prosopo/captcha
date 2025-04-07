# Vue Procaptcha Wrapper

## 1. About

A Vue component that provides seamless integration of [Procaptcha](https://prosopo.io/) into any Vue project.

## 2. Installation

```bash
npm install @prosopo/vue-procaptcha-wrapper
```

## 3. Usage

### 3.1) Basic setup

```html
import {ProcaptchaComponent} from "@prosopo/vue-procaptcha-wrapper";

<ProcaptchaComponent :siteKey={"my-site-key"}/>;
```

### 3.2) Advanced usage

```html
import {ProcaptchaComponent} from "@prosopo/vue-procaptcha-wrapper";

<ProcaptchaComponent
    :siteKey={"my-site-key"}
    :captchaType={"image"}
    :callbacks={{
        onVerified: (token: string): void => {
            console.log("verified", token);
        },
    }}
    :htmlAttributes={{
        className: "my-app__procaptcha",
        style: {
            maxWidth: "600px",
        },
    }}
/>;
```

## 4. Configuration options

Check the [Procaptcha Docs](https://docs.prosopo.io/en/basics/client-side-rendering/) to see the full list of the available options.
