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

import { Component, ElementRef, Input, inject } from "@angular/core";
import {
	type ProcaptchaOptions,
	procaptchaWrapper,
} from "@prosopo/procaptcha-wrapper";

@Component({
	selector: "procaptcha-component",
	imports: [],
	template: "<div></div>",
	styles: "",
})
export class ProcaptchaComponent {
	elementRef = inject(ElementRef);

	@Input({ required: true })
	settings!: ProcaptchaOptions;
	@Input()
	htmlAttributes: { [key: string]: string } = {};

	public ngOnInit(): void {
		this.render();
	}

	public ngOnChanges(): void {
		this.render();
	}

	private render(): void {
		for (const attr in this.htmlAttributes) {
			this.elementRef.nativeElement.setAttribute(
				attr,
				this.htmlAttributes[attr],
			);
		}

		procaptchaWrapper.renderProcaptcha(
			this.elementRef.nativeElement,
			this.settings,
		);
	}
}
