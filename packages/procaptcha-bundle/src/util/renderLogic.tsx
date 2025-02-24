// Copyright 2021-2024 Prosopo (UK) Ltd.
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
	getWidgetFactory,
	getWidgetInteractiveAreaProvider,
} from "@prosopo/web-components";
import type { Root } from "react-dom/client";
import { CaptchaComponentProvider } from "./renderLogic/captcha/captchaComponentProvider.js";
import { WidgetCaptchaRenderer } from "./renderLogic/widgetCaptchaRenderer.js";

const widgetFactory = getWidgetFactory();
const widgetInteractiveAreaProvider = getWidgetInteractiveAreaProvider();

const captchaComponentProvider = new CaptchaComponentProvider();
const widgetCaptchaRenderer = new WidgetCaptchaRenderer(
	captchaComponentProvider,
);

export const renderLogic = (
	elements: Element[],
	config: ProcaptchaClientConfigOutput,
	renderOptions?: ProcaptchaRenderOptions,
): Root[] => {
	return elements.map((element) => {
		// Clear all the children inside, if there are any.
		// If the renderElement() is called several times on the same element, it should recreate the captcha from scratch.
		element.innerHTML = "";

		const widget = widgetFactory.createWidget(
			// fixme
			config.theme,
			"prosopo-procaptcha",
		);
		const widgetInteractiveArea =
			widgetInteractiveAreaProvider.getInteractiveArea(widget);

		const captchaRoot = widgetCaptchaRenderer.renderWidgetCaptcha(
			{
				identifierPrefix: "procaptcha-",
				emotionCacheKey: "procaptcha",
				webComponentTag: "prosopo-procaptcha",
				defaultCaptchaType: CaptchaType.frictionless,
			},
			// fixme
			widgetInteractiveArea,
			config,
			renderOptions,
		);

		return captchaRoot;
	});
};
