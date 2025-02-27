import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import { ProcaptchaModule } from '@prosopo/angular-procaptcha-wrapper';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    ProcaptchaModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 