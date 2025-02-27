# Prosopo Captcha Angular Wrapper

An Angular wrapper for the Prosopo Captcha component.

## Installation

```bash
npm install @prosopo/angular-procaptcha-wrapper
```

## Usage

### Import the module

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ProcaptchaModule } from '@prosopo/angular-procaptcha-wrapper';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ProcaptchaModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

### Use the component in your template

```html
<form (ngSubmit)="onSubmit()">
  <!-- Form fields -->
  <prosopo-captcha
    [siteKey]="siteKey"
    [theme]="'light'"
    [captchaType]="'image'"
    (verified)="onCaptchaVerified($event)"
    (failed)="onCaptchaFailed()">
  </prosopo-captcha>
  <button type="submit">Submit</button>
</form>
```

### Handle the captcha events in your component

```typescript
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  siteKey = 'YOUR_SITE_KEY';
  captchaToken: string | null = null;
  formData = {
    name: '',
    email: '',
    password: ''
  };

  constructor(private http: HttpClient) {}

  onCaptchaVerified(token: string) {
    this.captchaToken = token;
  }

  onCaptchaFailed() {
    console.log('Captcha verification failed');
    this.captchaToken = null;
  }

  onSubmit() {
    if (!this.captchaToken) {
      alert('Please complete the captcha');
      return;
    }

    const payload = {
      ...this.formData,
      'procaptcha-response': this.captchaToken
    };

    this.http.post('/api/submit', payload).subscribe(
      response => {
        console.log('Form submitted successfully', response);
      },
      error => {
        console.error('Error submitting form', error);
      }
    );
  }
}
```

## API

### Inputs

| Name        | Type                  | Default  | Description                         |
| ----------- | --------------------- | -------- | ----------------------------------- |
| siteKey     | string                | -        | **Required**. Your Prosopo site key |
| theme       | 'light' \| 'dark'     | 'light'  | The theme of the captcha            |
| captchaType | string                | 'image'  | The type of captcha to display      |
| size        | 'normal' \| 'compact' | 'normal' | The size of the captcha             |
| tabIndex    | number                | 0        | The tabindex of the captcha         |

### Outputs

| Name     | Type                 | Description                                                                    |
| -------- | -------------------- | ------------------------------------------------------------------------------ |
| verified | EventEmitter<string> | Emitted when the captcha is verified successfully, with the verification token |
| expired  | EventEmitter<void>   | Emitted when the captcha token expires                                         |
| failed   | EventEmitter<void>   | Emitted when the captcha verification fails                                    |
| loaded   | EventEmitter<void>   | Emitted when the captcha is loaded                                             |

### Methods

| Name          | Return Type    | Description                     |
| ------------- | -------------- | ------------------------------- |
| getResponse() | string \| null | Gets the current response token |
| reset()       | void           | Resets the captcha              |

## License

Apache-2.0 