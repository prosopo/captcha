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

import {
	type RenderProcaptchaFunction,
	loadRenderProcaptchaScript,
} from "./renderProcaptcha.js";
import type { ProcaptchaRenderOptions, CaptchaType } from "@prosopo/types";
import type { Languages } from "@prosopo/locale";

let renderFunction: RenderProcaptchaFunction;

export const renderProcaptcha = async (
	element: HTMLElement,
	options: ProcaptchaRenderOptions,
): Promise<void> => {
	if (undefined === renderFunction) {
		renderFunction = await loadRenderProcaptchaScript(
			// @ts-expect-error
			import.meta.env.VITE_RENDER_SCRIPT_URL,
			{
				// @ts-expect-error
				id: import.meta.env.VITE_RENDER_SCRIPT_ID,
			},
		);
	}

	await renderFunction(element, options);
};

export type {
	ProcaptchaRenderOptions,
	CaptchaType as ProcaptchaType,
	Languages as ProcaptchaLanguages,
};
