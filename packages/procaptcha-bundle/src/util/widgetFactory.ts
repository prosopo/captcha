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
import { CaptchaType, type ProcaptchaRenderOptions } from "@prosopo/types";
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

	public constructor(
		private readonly widgetThemeResolver: WidgetThemeResolver,
	) {}

	public async createWidgets(
		containers: Element[],
		renderOptions: ProcaptchaRenderOptions,
		isWeb2 = true,
		invisible = false,
	): Promise<Root[]> {
		return Promise.all(
			containers.map((container) =>
				this.createWidget(container, renderOptions, isWeb2, invisible),
			),
		);
	}

	public async createWidget(
		container: Element,
		renderOptions: ProcaptchaRenderOptions,
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
			isWeb2,
			invisible,
		);

		return captchaRoot;
	}

	protected async getCaptchaRenderer(): Promise<CaptchaRenderer> {
		if (null === this.captchaRenderer) {
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
