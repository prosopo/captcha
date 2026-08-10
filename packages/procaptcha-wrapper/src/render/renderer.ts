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

import type { ProcaptchaRenderOptions } from "@prosopo/types";
import { type RendererFunction, loadRenderFunction } from "./renderFunction.js";

export interface RendererSettings {
	scriptUrl: string;
	scriptId: string;
}

/** Loads the render function from a remote script. Injected so tests need no network. */
export type LoadRenderFunction = (
	scriptUrl: string,
	scriptId: string,
) => Promise<RendererFunction>;

export const createRenderer = (
	settings: RendererSettings,
	load: LoadRenderFunction = loadRenderFunction,
): RendererFunction => {
	// The in-flight promise is cached, not just the resolved function: caching
	// only the result lets two concurrent render() calls both see "not loaded"
	// and each inject a script tag for the same id.
	let pending: Promise<RendererFunction> | undefined;

	const getRenderFunction = async (): Promise<RendererFunction> => {
		if (!pending) {
			// A failed load must not be cached, otherwise every later render()
			// replays the same rejection and the widget can never recover.
			pending = load(settings.scriptUrl, settings.scriptId).catch(
				(error: unknown) => {
					pending = undefined;
					throw error;
				},
			);
		}

		return pending;
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
