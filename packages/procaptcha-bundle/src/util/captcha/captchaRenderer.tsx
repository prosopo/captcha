// Copyright 2021-2026 Prosopo (UK) Ltd.
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
import type { Ti18n } from "@prosopo/locale";
import {
	type Callbacks,
	Placement,
	type PlacementType,
	type ProcaptchaClientConfigOutput,
	type ProcaptchaRenderOptions,
} from "@prosopo/types";
import type { ReactNode } from "react";
import { type Root, createRoot } from "react-dom/client";
import { createConfig } from "../configCreator.js";
import { setLanguage } from "../language.js";
import { setValidChallengeLength } from "../timeout.js";
import { BundleCaptcha } from "./components/bundleCaptcha.js";

/**
 * Reads the requested placement from the render options, falling back to the
 * element's `data-placement` so implicitly-rendered widgets — which never see a
 * render-options object — can set it too.
 *
 * An unrecognised value is dropped rather than thrown on: a typo in a host
 * page's markup should leave the widget on its default placement, not stop it
 * rendering.
 */
const resolveRequestedPlacement = (
	element: Element,
	renderOptions: ProcaptchaRenderOptions,
): PlacementType | undefined => {
	const requested =
		renderOptions.placement ?? element.getAttribute("data-placement");
	if (!requested) return undefined;

	const parsed = Placement.safeParse(requested);
	return parsed.success ? parsed.data : undefined;
};

interface RenderSettings {
	identifierPrefix: string;
	emotionCacheKey: string;
	webComponentTag: string;
}

class CaptchaRenderer {
	public renderCaptcha(
		settings: RenderSettings,
		container: HTMLElement,
		renderOptions: ProcaptchaRenderOptions,
		callbacks: Callbacks,
		isWeb2: boolean,
		i18n: Ti18n,
		invisible: boolean,
		widgetContainer: HTMLElement,
		sourceElement?: Element,
	): Root {
		const config = createConfig({
			siteKey: renderOptions.siteKey,
			theme: renderOptions.theme,
			language: renderOptions.language,
			web2: isWeb2,
			invisible,
			placement: resolveRequestedPlacement(
				sourceElement || container,
				renderOptions,
			),
			userAccountAddress: renderOptions.userAccountAddress,
			ipv4: renderOptions.ipv4,
			ipv6: renderOptions.ipv6,
		});
		this.readAndValidateSettings(
			sourceElement || container,
			config,
			renderOptions,
		);

		const reactRoot = this.createReactRoot(
			container,
			settings.identifierPrefix,
		);

		const emotionCache = this.makeEmotionCache(
			settings.emotionCacheKey,
			container,
		);

		const captchaComponent = (
			<BundleCaptcha
				config={config}
				callbacks={callbacks}
				i18n={i18n}
				container={widgetContainer}
			/>
		);

		this.renderCaptchaComponent(reactRoot, emotionCache, captchaComponent);

		return reactRoot;
	}

	protected readAndValidateSettings(
		element: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions: ProcaptchaRenderOptions,
	): void {
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
		reactRoot.render(
			<CacheProvider value={emotionCache}>{captchaComponent}</CacheProvider>,
		);
	}
}

export { CaptchaRenderer };
