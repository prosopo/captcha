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
	CaptchaType,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaRenderOptions,
} from "@prosopo/types";
import {
	type WidgetFactory,
	type WidgetInteractiveAreaProvider,
	darkTheme,
	lightTheme,
} from "@prosopo/widget";
import type { Root } from "react-dom/client";
import type { CaptchaRenderer } from "./captcha/captchaRenderer.js";

class WidgetInitializer {
	public constructor(
		private readonly widgetFactory: WidgetFactory,
		private readonly widgetInteractiveAreaProvider: WidgetInteractiveAreaProvider,
		private readonly captchaRenderer: CaptchaRenderer,
	) {}

	public async initializeWidget(
		element: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Promise<Root> {
		const theme = "light" === config.theme ? lightTheme : darkTheme;

		const widget = this.widgetFactory.createWidget(theme);

		// Clear all the children inside, if there are any.
		// If the initializeWidget() is called several times on the same element, it should recreate the captcha from scratch.
		element.innerHTML = "";
		element.appendChild(widget);

		// fixme
		console.log("optimization: widget was attached to the DOM", {
			performnce: performance.now(),
		});
		performance.mark("widgetAttached");

		const widgetInteractiveArea = this.getWidgetInteractiveArea(widget);

		const captchaRoot = await this.captchaRenderer.renderCaptcha(
			{
				identifierPrefix: "procaptcha-",
				emotionCacheKey: "procaptcha",
				webComponentTag: "prosopo-procaptcha",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			widgetInteractiveArea,
			config,
			renderOptions,
		);

		return captchaRoot;
	}

	protected getWidgetInteractiveArea(widget: HTMLElement): HTMLElement {
		const widgetInteractiveArea =
			this.widgetInteractiveAreaProvider.getInteractiveArea(widget);

		if (widgetInteractiveArea instanceof HTMLElement) {
			return widgetInteractiveArea;
		}

		const errorMessage =
			"Fail to initialize widget: interactive area is not found";

		console.error(errorMessage, {
			widget: widget,
		});

		throw new Error(errorMessage);
	}
}

export { WidgetInitializer };
