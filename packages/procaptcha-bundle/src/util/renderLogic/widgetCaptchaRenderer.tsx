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

import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import {
	getDefaultCallbacks,
	setUserCallbacks,
} from "@prosopo/procaptcha-common";
import type {
	Callbacks,
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import type { CaptchaType } from "@prosopo/types";
import { type Root, createRoot } from "react-dom/client";
import { setLanguage } from "../language.js";
import { setTheme } from "../theme.js";
import { setValidChallengeLength } from "../timeout.js";
import type { CaptchaComponentProvider } from "./captcha/captchaComponentProvider.js";

interface RenderSettings {
	identifierPrefix: string;
	emotionCacheKey: string;
	webComponentTag: string;
	defaultCaptchaType: CaptchaType;
}

class WidgetCaptchaRenderer {
	private readonly captchaComponentProvider: CaptchaComponentProvider;

	constructor(captchaComponentProvider: CaptchaComponentProvider) {
		this.captchaComponentProvider = captchaComponentProvider;
	}

	public renderWidgetCaptcha(
		settings: RenderSettings,
		widgetInteractiveArea: HTMLElement,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Root {
		const captchaType =
			(renderOptions?.captchaType as CaptchaType) ||
			settings.defaultCaptchaType;
		const callbacks = getDefaultCallbacks(widgetInteractiveArea);

		this.readAndValidateSettings(
			widgetInteractiveArea,
			callbacks,
			config,
			renderOptions,
		);

		const emotionCache = this.makeEmotionCache(
			settings.emotionCacheKey,
			widgetInteractiveArea,
		);
		const root = createRoot(widgetInteractiveArea, {
			identifierPrefix: settings.identifierPrefix,
		});

		const captchaComponent = this.captchaComponentProvider.getCaptchaComponent(
			captchaType,
			{
				config: config,
				callbacks: callbacks,
			},
		);

		root.render(
			<CacheProvider value={emotionCache}>{captchaComponent}</CacheProvider>,
		);

		return root;
	}

	protected readAndValidateSettings(
		element: Element,
		callbacks: Callbacks,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): void {
		setUserCallbacks(renderOptions, callbacks, element);
		setTheme(renderOptions, element, config);
		setValidChallengeLength(renderOptions, element, config);
		setLanguage(renderOptions, element, config);
	}

	protected makeEmotionCache(
		cacheKey: string,
		container: HTMLElement,
	): EmotionCache {
		return createCache({
			key: cacheKey,
			prepend: true,
			container: container,
		});
	}
}

export { WidgetCaptchaRenderer };
