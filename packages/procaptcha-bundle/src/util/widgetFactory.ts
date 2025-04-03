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

import { loadI18next } from "@prosopo/locale";
import type { Ti18n } from "@prosopo/locale";
import {
	getDefaultCallbacks,
	setUserCallbacks,
} from "@prosopo/procaptcha-common";
import {
	type Callbacks,
	CaptchaType,
	type ProcaptchaCallbacks,
	type ProcaptchaRenderOptions,
} from "@prosopo/types";
import {
	createWidgetSkeleton,
	darkTheme,
	lightTheme,
} from "@prosopo/widget-skeleton";
import type { Root } from "react-dom/client";
import type { CaptchaRenderer } from "./captcha/captchaRenderer.js";
import type { WidgetThemeResolver } from "./widgetThemeResolver.js";

class WidgetFactory {
	private captchaRenderer: CaptchaRenderer | null = null;
	private _i18n: Ti18n | null = null;

	public constructor(
		private readonly widgetThemeResolver: WidgetThemeResolver,
	) {}

	get i18n(): Ti18n {
		if (this._i18n === null) {
			throw new Error("I18n is not initialized");
		}
		return this._i18n;
	}

	public async createWidgets(
		containers: Element[],
		renderOptions: ProcaptchaRenderOptions,
		isWeb2 = true,
		invisible = false,
	): Promise<Root[]> {
		return Promise.all(
			containers.map((container) => {
				const callbacks = getDefaultCallbacks(container);
				setUserCallbacks(renderOptions, callbacks, container);
				return this.createWidget(
					container,
					renderOptions,
					callbacks,
					isWeb2,
					invisible,
				);
			}),
		);
	}

	public async createWidget(
		container: Element,
		renderOptions: ProcaptchaRenderOptions,
		callbacks: Callbacks,
		isWeb2 = true,
		invisible = false,
	): Promise<Root> {
		renderOptions.theme = this.widgetThemeResolver.resolveWidgetTheme(
			container,
			renderOptions,
		);

		const widgetTheme =
			"light" === renderOptions.theme ? lightTheme : darkTheme;

		let widgetInteractiveArea: HTMLElement;

		// Don't create the widget skeleton if the mode is invisible
		if (invisible) {
			//Create new div inside the container
			const newDiv = document.createElement("div");
			container.appendChild(newDiv);
			widgetInteractiveArea = newDiv as HTMLElement;
		} else {
			widgetInteractiveArea = createWidgetSkeleton(
				container,
				widgetTheme,
				"prosopo-procaptcha",
			);
		}

		// all the captcha-rendering logic is lazy-loaded, to avoid react & zod delay the initial widget creation.

		const captchaRenderer = await this.getCaptchaRenderer();

		const captchaRoot = captchaRenderer.renderCaptcha(
			{
				identifierPrefix: "procaptcha-",
				emotionCacheKey: "procaptcha",
				webComponentTag: "prosopo-procaptcha",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			widgetInteractiveArea,
			renderOptions,
			callbacks,
			isWeb2,
			this.i18n,
			invisible,
		);

		return captchaRoot;
	}

	protected async getCaptchaRenderer(): Promise<CaptchaRenderer> {
		if (this._i18n === null) {
			this._i18n = await loadI18next(false);
		}

		if (this.captchaRenderer === null) {
			this.captchaRenderer = await this.createCaptchaRenderer();
		}

		return this.captchaRenderer;
	}

	protected async createCaptchaRenderer(): Promise<CaptchaRenderer> {
		const CaptchaRenderer = (await import("./captcha/captchaRenderer.js"))
			.CaptchaRenderer;

		const CaptchaComponentProvider = (
			await import("./captcha/captchaComponentProvider.js")
		).CaptchaComponentProvider;

		return new CaptchaRenderer(new CaptchaComponentProvider());
	}
}

export { WidgetFactory };
