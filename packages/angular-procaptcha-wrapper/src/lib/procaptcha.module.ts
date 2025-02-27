import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcaptchaComponent } from './procaptcha.component';
import { ProcaptchaService } from './procaptcha.service';

@NgModule({
  imports: [
    CommonModule,
    ProcaptchaComponent
  ],
  exports: [
    ProcaptchaComponent
  ],
  providers: [
    ProcaptchaService
  ]
})
export class ProcaptchaModule { } 