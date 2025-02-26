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

import type { EmotionCache } from "@emotion/cache";
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
import type { Root } from "react-dom/client";
import { setLanguage } from "../language.js";
import { setTheme } from "../theme.js";
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

	// fixme remove async
	public async renderCaptcha(
		settings: RenderSettings,
		container: HTMLElement,
		config: ProcaptchaClientConfigOutput,
		renderOptions?: ProcaptchaRenderOptions,
	): Promise<Root> {
		const callbacks = getDefaultCallbacks(container);
		const captchaType =
			(renderOptions?.captchaType as CaptchaType) ||
			settings.defaultCaptchaType;

		this.readAndValidateSettings(container, callbacks, config, renderOptions);

		const reactRoot = await this.createReactRoot(
			container,
			settings.identifierPrefix,
		);

		const emotionCache = await this.makeEmotionCache(
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

		await this.renderCaptchaComponent(
			reactRoot,
			emotionCache,
			captchaComponent,
		);

		return reactRoot;
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

	protected async makeEmotionCache(
		cacheKey: string,
		container: HTMLElement,
	): Promise<EmotionCache> {
		const createCache = (await import("@emotion/cache")).default;

		return createCache({
			key: cacheKey,
			prepend: true,
			container: container,
		});
	}

	protected async createReactRoot(
		container: HTMLElement,
		identifierPrefix: string,
	): Promise<Root> {
		const createRoot = (await import("react-dom/client")).createRoot;

		return createRoot(container, {
			identifierPrefix: identifierPrefix,
		});
	}

	protected async renderCaptchaComponent(
		reactRoot: Root,
		emotionCache: EmotionCache,
		captchaComponent: ReactNode,
	): Promise<void> {
		const CacheProvider = (await import("@emotion/react")).CacheProvider;

		reactRoot.render(
			<CacheProvider value={emotionCache}>{captchaComponent}</CacheProvider>,
		);
	}
}

export { CaptchaRenderer };
