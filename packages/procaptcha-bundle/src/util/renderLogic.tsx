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
import { CaptchaRenderer } from "./renderLogic/captcha/captchaRenderer.js";
import { WebComponent } from "./renderLogic/webComponent.js";
import { WidgetRenderer } from "./renderLogic/widgetRenderer.js";

const widgetRenderer = new WidgetRenderer(
	new WebComponent(),
	new CaptchaRenderer(),
);

export const renderLogic = (
	elements: Element[],
	config: ProcaptchaClientConfigOutput,
	renderOptions?: ProcaptchaRenderOptions,
) => {
	return widgetRenderer.renderElements(
		{
			identifierPrefix: "procaptcha-",
			emotionCacheKey: "procaptcha",
			webComponentTag: "prosopo-procaptcha",
			defaultCaptchaType: CaptchaType.frictionless,
		},
		elements,
		config,
		renderOptions,
	);
};
