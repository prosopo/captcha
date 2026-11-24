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

import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";

// Browsers hide a nonce from `getAttribute` once the element is inserted, but
// still expose it through the `nonce` property.
const pageNonce = (): string | undefined =>
	document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ||
	undefined;

/**
 * The page's CSP nonce: renderOptions.nonce, else the element's `data-nonce`,
 * else the nonce of a nonced script on the page — a site whose policy needs one
 * has already put it on the script tag that loads this bundle.
 */
export const resolveNonce = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
): string | undefined =>
	renderOptions?.nonce || element.getAttribute("data-nonce") || pageNonce();

export const setNonce = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigOutput,
): void => {
	const nonce = resolveNonce(renderOptions, element);
	if (nonce) {
		config.nonce = nonce;
	}
};
