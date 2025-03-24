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

import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { loadI18next } from "@prosopo/locale";
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
import type { ReactNode } from "react";
import { type Root, createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { createConfig } from "../configCreator.js";
import { setLanguage } from "../language.js";
import { setValidChallengeLength } from "../timeout.js";
import type { CaptchaComponentProvider } from "./captchaComponentProvider.js";

interface RenderSettings {
	identifierPrefix: string;
	emotionCacheKey: string;
	webComponentTag: string;
	defaultCaptchaType: CaptchaType;
}

class CaptchaRenderer {
	private readonly captchaComponentProvider: CaptchaComponentProvider;

	constructor(captchaComponentProvider: CaptchaComponentProvider) {
		this.captchaComponentProvider = captchaComponentProvider;
	}

	public renderCaptcha(
		settings: RenderSettings,
		container: HTMLElement,
		renderOptions: ProcaptchaRenderOptions,
		isWeb2: boolean,
		invisible = false,
	): Root {
		const callbacks = getDefaultCallbacks(container);
		const captchaType =
			(renderOptions?.captchaType as CaptchaType) ||
			settings.defaultCaptchaType;

		const config = createConfig(
			renderOptions.siteKey,
			renderOptions.theme,
			renderOptions.language,
			isWeb2,
            invisible,
		);

		this.readAndValidateSettings(container, callbacks, config, renderOptions);

		const reactRoot = this.createReactRoot(
			container,
			settings.identifierPrefix,
		);

		const emotionCache = this.makeEmotionCache(
			settings.emotionCacheKey,
			container,
		);

		const captchaComponent = this.captchaComponentProvider.getCaptchaComponent(
			captchaType,
			{
				config: config,
				callbacks: callbacks,
			},
		);

		this.renderCaptchaComponent(reactRoot, emotionCache, captchaComponent);

		return reactRoot;
	}

	protected readAndValidateSettings(
		element: Element,
		callbacks: Callbacks,
		config: ProcaptchaClientConfigOutput,
		renderOptions: ProcaptchaRenderOptions,
	): void {
		setUserCallbacks(renderOptions, callbacks, element);
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

	protected createReactRoot(
		container: HTMLElement,
		identifierPrefix: string,
	): Root {
		return createRoot(container, {
			identifierPrefix: identifierPrefix,
		});
	}

	protected renderCaptchaComponent(
		reactRoot: Root,
		emotionCache: EmotionCache,
		captchaComponent: ReactNode,
	): void {
		loadI18next(false).then((i18n) => {
			reactRoot.render(
				<CacheProvider value={emotionCache}>{captchaComponent}</CacheProvider>,
			);
		});
	}
}

export { CaptchaRenderer };
