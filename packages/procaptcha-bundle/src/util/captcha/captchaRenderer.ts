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

import type { Ti18n } from "@prosopo/locale";
import { clearElement } from "@prosopo/procaptcha-common";
import type {
	Callbacks,
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { createConfig } from "../configCreator.js";
import { setLanguage } from "../language.js";
import { setValidChallengeLength } from "../timeout.js";
import {
	type BundleCaptchaHandle,
	mountBundleCaptcha,
} from "./components/bundleCaptcha.js";

class CaptchaRenderer {
	public renderCaptcha(
		container: HTMLElement,
		renderOptions: ProcaptchaRenderOptions,
		callbacks: Callbacks,
		isWeb2: boolean,
		i18n: Ti18n,
		invisible: boolean,
		widgetContainer: HTMLElement,
		sourceElement?: Element,
	): BundleCaptchaHandle {
		const config = createConfig(
			renderOptions.siteKey,
			renderOptions.theme,
			renderOptions.language,
			isWeb2,
			invisible,
			renderOptions.userAccountAddress,
			renderOptions.ipv4,
			renderOptions.ipv6,
		);
		this.readAndValidateSettings(
			sourceElement || container,
			config,
			renderOptions,
		);

		// `createRoot(container).render(...)` used to empty the mount point on its
		// first commit, which is what removed the widget skeleton's placeholder
		// spinner. Mounting appends, so the clear has to be explicit — without it
		// the skeleton's spinner sits alongside the real checkbox.
		clearElement(container);

		return mountBundleCaptcha(container, {
			config,
			callbacks,
			i18n,
			container: widgetContainer,
		});
	}

	protected readAndValidateSettings(
		element: Element,
		config: ProcaptchaClientConfigOutput,
		renderOptions: ProcaptchaRenderOptions,
	): void {
		setValidChallengeLength(renderOptions, element, config);
		setLanguage(renderOptions, element, config);
	}
}

export { CaptchaRenderer };
