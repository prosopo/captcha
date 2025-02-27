// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Component, type OnInit } from "@angular/core";
import { type FormBuilder, type FormGroup, Validators } from "@angular/forms";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit {
	siteKey = "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw"; // Replace with your actual site key
	captchaToken: string | null = null;
	submitted = false;
	form!: FormGroup;

	constructor(private fb: FormBuilder) {}

	ngOnInit(): void {
		this.initForm();
	}

	initForm(): void {
		this.form = this.fb.group({
			name: ["", Validators.required],
			email: ["", [Validators.required, Validators.email]],
		});
	}

	onCaptchaVerified(token: string): void {
		console.log("Captcha verified with token:", token);
		this.captchaToken = token;
	}

	onCaptchaExpired(): void {
		console.log("Captcha expired");
		this.captchaToken = null;
	}

	onCaptchaFailed(): void {
		console.log("Captcha failed");
		this.captchaToken = null;
	}

	onCaptchaLoaded(): void {
		console.log("Captcha loaded");
	}

	onSubmit(): void {
		if (this.form.valid && this.captchaToken) {
			console.log("Form submitted with captcha token:", this.captchaToken);
			console.log("Form values:", this.form.value);
			this.submitted = true;
		} else {
			// Mark all fields as touched to trigger validation messages
			this.form.markAllAsTouched();
			if (!this.captchaToken) {
				console.error("Cannot submit form without captcha verification");
			}
		}
	}

	get formControls() {
		return this.form.controls;
	}
}
