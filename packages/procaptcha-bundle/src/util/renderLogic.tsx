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

import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import {
	getWidgetFactory,
	getWidgetInteractiveAreaProvider,
} from "@prosopo/widget";
import type { Root } from "react-dom/client";
import { CaptchaComponentProvider } from "./captcha/captchaComponentProvider.js";
import { CaptchaRenderer } from "./captcha/captchaRenderer.js";
import { WidgetInitializer } from "./widgetInitializer.js";

const widgetFactory = getWidgetFactory();
const widgetInteractiveAreaProvider = getWidgetInteractiveAreaProvider();

const captchaComponentProvider = new CaptchaComponentProvider();
const captchaRenderer = new CaptchaRenderer(captchaComponentProvider);

const widgetInitializer = new WidgetInitializer(
	widgetFactory,
	widgetInteractiveAreaProvider,
	captchaRenderer,
);

export const renderLogic = (
	elements: Element[],
	config: ProcaptchaClientConfigOutput,
	renderOptions?: ProcaptchaRenderOptions,
): Root[] => {
	return elements.map((element) => {
		return widgetInitializer.initializeWidget(element, config, renderOptions);
	});
};
