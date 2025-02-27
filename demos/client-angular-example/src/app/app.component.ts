import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  siteKey = '5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw'; // Replace with your actual site key
  captchaToken: string | null = null;
  submitted = false;
  form!: FormGroup;
  
  constructor(private fb: FormBuilder) {}
  
  ngOnInit(): void {
    this.initForm();
  }
  
  initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });
  }
  
  onCaptchaVerified(token: string): void {
    console.log('Captcha verified with token:', token);
    this.captchaToken = token;
  }
  
  onCaptchaExpired(): void {
    console.log('Captcha expired');
    this.captchaToken = null;
  }
  
  onCaptchaFailed(): void {
    console.log('Captcha failed');
    this.captchaToken = null;
  }
  
  onCaptchaLoaded(): void {
    console.log('Captcha loaded');
  }
  
  onSubmit(): void {
    if (this.form.valid && this.captchaToken) {
      console.log('Form submitted with captcha token:', this.captchaToken);
      console.log('Form values:', this.form.value);
      this.submitted = true;
    } else {
      // Mark all fields as touched to trigger validation messages
      this.form.markAllAsTouched();
      if (!this.captchaToken) {
        console.error('Cannot submit form without captcha verification');
      }
    }
  }
  
  get formControls() {
    return this.form.controls;
  }
} 