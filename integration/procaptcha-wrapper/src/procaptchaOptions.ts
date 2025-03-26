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

import type { WidgetCallbacks } from "./widget/widgetCallbacks.js";
import type { WidgetCaptchaType } from "./widget/widgetCaptchaTypes.js";
import type { WidgetTheme } from "./widget/widgetThemes.js";

// https://docs.prosopo.io/en/basics/client-side-rendering/

interface ProcaptchaOptions {
	/**
	 * The site key of your application / website.
	 * */
	siteKey: string;
	/**
	 * The theme of the CAPTCHA widget
	 * */
	theme?: WidgetTheme;
	/**
	 * The type of CAPTCHA to render.
	 */
	captchaType?: WidgetCaptchaType;
	callbacks?: WidgetCallbacks;
	/**
	 * The language of the CAPTCHA widget.
	 */
	language?: string;
}

export type { ProcaptchaOptions };
