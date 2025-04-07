# Angular Procaptcha Wrapper

## 1. About

An Angular component that provides seamless integration of [Procaptcha](https://prosopo.io/) into any Angular project.

## 2. Installation

```bash
npm install @prosopo/angular-procaptcha-wrapper
```

## 3. Usage

### 3.1) Basic setup

```typescript
import { Component } from "@angular/core";
import {
    ProcaptchaComponent,
    type ProcaptchaRenderOptions,
} from "@prosopo/angular-procaptcha-wrapper";

@Component({
    selector: "app-root",
    imports: [ProcaptchaComponent],
    template: `
    <procaptcha-component [settings]="procaptchaSettings"
                          [htmlAttributes]="{class:'my-app__procaptcha'}"/>`,
    styles: "",
})
export class AppComponent {
    procaptchaSettings: ProcaptchaRenderOptions = {
        siteKey: "your-site-key",
    };
}
```

### 3.2) Advanced usage

```typescript
import { Component } from "@angular/core";
import {
    ProcaptchaComponent,
    type ProcaptchaRenderOptions,
} from "@prosopo/angular-procaptcha-wrapper";

@Component({
    selector: "app-root",
    imports: [ProcaptchaComponent],
    template: `
    <procaptcha-component [settings]="procaptchaSettings"
                          [htmlAttributes]="{class:'my-app__procaptcha'}"/>`,
    styles: "",
})
export class AppComponent {
    procaptchaSettings: ProcaptchaRenderOptions = {
        siteKey: environment.PROCATCHA_SITE_KEY,
        captchaType: "pow",
        language: "en",
        callback: (token: string) => {
            console.log("verified", token);
        },
    };
}
```

## 4. Configuration options

Check the [Procaptcha Docs](https://docs.prosopo.io/en/basics/client-side-rendering/) to see the full list of the available options.
