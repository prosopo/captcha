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

import type { ProcaptchaRenderOptions } from "@prosopo/types";

export type RendererFunction = (
	element: HTMLElement,
	options: ProcaptchaRenderOptions,
) => Promise<void>;

export const loadRenderFunction = async (
	scriptUrl: string,
	scriptId: string,
): Promise<RendererFunction> => {
	await loadScript(scriptUrl, {
		id: scriptId,
		type: "module",
		async: true,
		defer: true,
	});

	if (undefined === window.procaptcha?.render) {
		throw new Error("Render script does not contain the render function");
	}

	return window.procaptcha.render;
};

const loadScript = async (
	url: string,
	attributes?: Partial<HTMLScriptElement>,
): Promise<void> => {
	const scriptTag = document.createElement("script");

	const scriptAttributes: Partial<HTMLScriptElement> = {
		src: url,
		...attributes,
	};

	Object.assign(scriptTag, scriptAttributes);

	await insertScriptTag(document.head, scriptTag);
};

const insertScriptTag = async (
	target: HTMLElement,
	scriptTag: HTMLScriptElement,
): Promise<void> => {
	return new Promise((resolve, reject) => {
		scriptTag.onload = () => {
			resolve();
		};

		scriptTag.onerror = (event: Event | string) => {
			reject(event);
		};

		target.appendChild(scriptTag);
	});
};

declare global {
	interface Window {
		procaptcha:
			| {
					render: RendererFunction;
			  }
			| undefined;
	}
}
