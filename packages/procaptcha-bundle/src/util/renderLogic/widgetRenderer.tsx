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
import type { CaptchaRenderer } from "./captcha/captchaRenderer.js";
import type { WebComponent } from "./webComponent.js";

interface RenderSettings {
	identifierPrefix: string;
	emotionCacheKey: string;
	webComponentTag: string;
	defaultCaptchaType: CaptchaType;
}

class WidgetRenderer {
	private readonly webComponent: WebComponent;
	private readonly captchaRenderer: CaptchaRenderer;

	constructor(webComponent: WebComponent, captchaRenderer: CaptchaRenderer) {
		this.webComponent = webComponent;
		this.captchaRenderer = captchaRenderer;
	}

	public renderElements(
		settings: RenderSettings,
		elements: Element[],
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Root[] {
		return elements.map((element) => {
			return this.renderElement(settings, element, config, renderOptions);
		});
	}

	protected renderElement(
		settings: RenderSettings,
		element: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Root {
		const captchaType =
			(renderOptions?.captchaType as CaptchaType) ||
			settings.defaultCaptchaType;
		const callbacks = getDefaultCallbacks(element);

		this.readAndValidateSettings(element, callbacks, config, renderOptions);

		// Clear all the children inside, if there are any.
		// If the renderElement() is called several times on the same element, it should recreate the captcha from scratch.
		element.innerHTML = "";

		const shadowRoot = this.webComponent.addToElement(
			settings.webComponentTag,
			element,
		);
		const emotionCache = this.makeEmotionCache(
			settings.emotionCacheKey,
			shadowRoot,
		);
		const root = createRoot(shadowRoot, {
			identifierPrefix: settings.identifierPrefix,
		});

		const captcha = this.captchaRenderer.render(captchaType, {
			config: config,
			callbacks: callbacks,
		});

		root.render(<CacheProvider value={emotionCache}>{captcha}</CacheProvider>);

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
		shadowRoot: ShadowRoot,
	): EmotionCache {
		return createCache({
			key: cacheKey,
			prepend: true,
			container: shadowRoot,
		});
	}
}

export { WidgetRenderer };
