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

import type { ProcaptchaOptions } from "../procaptchaOptions.js";
import type { ProcaptchaWrapper } from "../procaptchaWrapper.js";

type WidgetRenderCallback = (
	element: HTMLElement,
	settings: object,
) => Promise<void>;

declare global {
	interface Window {
		procaptcha: {
			render: WidgetRenderCallback;
		};
	}
}

class WidgetWrapper implements ProcaptchaWrapper {
	private readonly widgetScriptUrl =
		"https://js.prosopo.io/js/procaptcha.bundle.js";
	private readonly widgetScriptId = "procaptcha-bundle";

	private widgetRenderCallback: WidgetRenderCallback | null = null;

	public async renderProcaptcha(
		element: HTMLElement,
		options: ProcaptchaOptions,
	): Promise<void> {
		const widgetRenderOptions = this.getWidgetRenderOptions(options);

		const widgetRenderCallback = await this.getWidgetRenderCallback();

		await widgetRenderCallback(element, widgetRenderOptions);
	}

	protected getWidgetRenderOptions(
		procaptchaOptions: ProcaptchaOptions,
	): object {
		const allRenderOptions = {
			siteKey: procaptchaOptions.siteKey,
			callback: procaptchaOptions.callbacks?.onVerified,
			theme: procaptchaOptions.theme,
			captchaType: procaptchaOptions.captchaType,
			language: procaptchaOptions.language,
			"chalexpired-callback": procaptchaOptions.callbacks?.onChallengeExpired,
			"error-callback": procaptchaOptions.callbacks?.onError,
			"close-callback": procaptchaOptions.callbacks?.onClosed,
			"open-callback": procaptchaOptions.callbacks?.onOpened,
			"expired-callback": procaptchaOptions.callbacks?.onChallengeExpired,
			"failed-callback": procaptchaOptions.callbacks?.onFailed,
			"reset-callback": procaptchaOptions.callbacks?.onReset,
		};

		const filledRenderOptions = Object.entries(allRenderOptions).filter(
			([_, value]) => undefined !== value,
		);

		return filledRenderOptions;
	}

	protected async getWidgetRenderCallback(): Promise<WidgetRenderCallback> {
		if (null === this.widgetRenderCallback) {
			await this.loadModuleScript(this.widgetScriptUrl, this.widgetScriptId);

			this.widgetRenderCallback = window.procaptcha.render;
		}

		return this.widgetRenderCallback;
	}

	protected async loadModuleScript(url: string, id: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const script = document.createElement("script");

			script.src = url;
			script.id = id;
			script.type = "module";

			script.async = true;
			script.defer = true;

			script.onload = () => {
				resolve();
			};

			script.onerror = (event: Event | string) => {
				reject(event);
			};

			document.head.appendChild(script);
		});
	}
}

export { WidgetWrapper };
