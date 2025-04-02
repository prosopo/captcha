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
import { ProcaptchaComponent } from "@prosopo/angular-procaptcha-wrapper";

@Component({
    selector: "app-root",
    imports: [ProcaptchaComponent],
    template: `<procaptcha-component [settings]="{siteKey:procaptchaSiteKey}"
                        [htmlAttributes]="{class:'my-app__procaptcha'}"/>`,
    styles: "",
})
export class AppComponent {
    procaptchaSiteKey = "my-procaptcha-key";
}
```

## 4. Configuration options

Check the [Procaptcha Docs](https://docs.prosopo.io/en/basics/client-side-rendering/) or `@prosopo/procaptcha-wrapper` package's readme to see the full list of the available options.
