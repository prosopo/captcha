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
import {
	Component,
	type ElementRef,
	EventEmitter,
	Input,
	type NgZone,
	type OnDestroy,
	type OnInit,
	Output,
	ViewChild,
} from "@angular/core";
import type { ProcaptchaService } from "./procaptcha.service";
import type { ProcaptchaConfig } from "./procaptcha.types";

declare global {
	interface Window {
		procaptchaOnLoad: () => void;
	}
}

@Component({
	selector: "prosopo-captcha",
	template: `<div #captchaContainer class="procaptcha-container"></div>`,
	styles: [".procaptcha-container { min-height: 78px; }"],
})
export class ProcaptchaComponent implements OnInit, OnDestroy {
	@ViewChild("captchaContainer", { static: true })
	captchaContainer!: ElementRef;

	@Input() siteKey!: string;
	@Input() theme: "light" | "dark" = "light";
	@Input() captchaType: "frictionless" | "image" | "pow" = "frictionless";
	@Input() size: "normal" | "compact" = "normal";
	@Input() tabIndex = 0;
	@Input() language?: string;
	@Input() challengeValidLength?: number;

	@Output() verified = new EventEmitter<string>();
	@Output() expired = new EventEmitter<void>();
	@Output() failed = new EventEmitter<void>();
	@Output() error = new EventEmitter<void>();
	@Output() closed = new EventEmitter<void>();
	@Output() opened = new EventEmitter<void>();
	@Output() reset = new EventEmitter<void>();
	@Output() loaded = new EventEmitter<void>();

	private widgetId: string | null = null;
	private scriptLoaded = false;

	constructor(
		private procaptchaService: ProcaptchaService,
		private zone: NgZone,
	) {}

	ngOnInit(): void {
		if (!this.siteKey) {
			throw new Error("ProcaptchaComponent: siteKey is required");
		}

		this.loadProcaptchaScript();
	}

	ngOnDestroy(): void {
		this.resetCaptcha();
	}

	/**
	 * Gets the response token from the captcha
	 */
	getResponse(): string | null {
		return this.procaptchaService.getResponse(this.widgetId);
	}

	/**
	 * Resets the captcha
	 */
	resetCaptcha(): void {
		if (this.widgetId) {
			this.procaptchaService.reset(this.widgetId);
		}
	}

	/**
	 * Loads the Procaptcha script and initializes the captcha
	 */
	private loadProcaptchaScript(): void {
		if (this.scriptLoaded) {
			this.renderCaptcha();
			return;
		}

		window.procaptchaOnLoad = () => {
			this.zone.run(() => {
				this.scriptLoaded = true;
				this.loaded.emit();
				this.renderCaptcha();
			});
		};

		this.procaptchaService
			.loadScript()
			.then(() => {
				// Script loaded, will call procaptchaOnLoad
			})
			.catch((error: Error) => {
				console.error("Error loading Procaptcha script:", error);
			});
	}

	/**
	 * Renders the captcha in the container
	 */
	private renderCaptcha(): void {
		if (!this.scriptLoaded) {
			return;
		}

		const params: ProcaptchaConfig = {
			siteKey: this.siteKey,
			theme: this.theme,
			captchaType: this.captchaType,
			size: this.size,
			tabindex: this.tabIndex,
			callback: (token: string) => {
				this.zone.run(() => {
					this.verified.emit(token);
				});
			},
			"expired-callback": () => {
				this.zone.run(() => {
					this.expired.emit();
				});
			},
			"failed-callback": () => {
				this.zone.run(() => {
					this.failed.emit();
				});
			},
			"error-callback": () => {
				this.zone.run(() => {
					this.error.emit();
				});
			},
			"close-callback": () => {
				this.zone.run(() => {
					this.closed.emit();
				});
			},
			"open-callback": () => {
				this.zone.run(() => {
					this.opened.emit();
				});
			},
			"reset-callback": () => {
				this.zone.run(() => {
					this.reset.emit();
				});
			},
		};

		// Add optional parameters if they are set
		if (this.language) {
			params.language = this.language;
		}

		if (this.challengeValidLength) {
			params["challenge-valid-length"] = this.challengeValidLength;
		}

		this.widgetId = this.procaptchaService.render(
			this.captchaContainer.nativeElement,
			params,
		);
	}
}
