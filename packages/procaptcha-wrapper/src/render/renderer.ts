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

import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { type RendererFunction, loadRenderFunction } from "./renderFunction.js";

interface RendererSettings {
	scriptUrl: string;
	scriptId: string;
}

export const createRenderer = (
	settings: RendererSettings,
): RendererFunction => {
	let renderFunction: RendererFunction;

	const getRenderFunction = async (): Promise<RendererFunction> => {
		if (!renderFunction) {
			renderFunction = await loadRenderFunction(
				settings.scriptUrl,
				settings.scriptId,
			);
		}

		return renderFunction;
	};

	return async (
		element: HTMLElement,
		options: ProcaptchaRenderOptions,
	): Promise<void> => {
		// cloning gives us a writable and independent object, which the render function then may change.
		// reason: some frameworks, like React, lock extending, and direct operations lead to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cant_define_property_object_not_extensible
		const renderOptions = Object.assign({}, options);

		const renderFunction = await getRenderFunction();

		await renderFunction(element, renderOptions);
	};
};
