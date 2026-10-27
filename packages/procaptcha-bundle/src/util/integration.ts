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

import {
	type ProcaptchaClientConfigOutput,
	type ProcaptchaRenderOptions,
	normaliseIntegration,
} from "@prosopo/types";

// Integrations that render the widget without naming themselves, recognised
// by the markup they wrap it in.
const KNOWN_HOSTS: ReadonlyArray<{ selector: string; name: string }> = [
	{ selector: "mc4wp-procaptcha", name: "mc4wp" },
	{ selector: "prosopo-procaptcha-wp-widget", name: "procaptcha-wordpress" },
];

const detectedIntegration = (element: Element): string | undefined =>
	KNOWN_HOSTS.find(({ selector }) => element.closest(selector) !== null)?.name;

/**
 * The platform embedding the widget: renderOptions.integration, else the
 * element's `data-integration`, else a known host found around the element.
 */
export const siteIntegration = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
): string | undefined =>
	normaliseIntegration(
		renderOptions?.integration || element.getAttribute("data-integration"),
	) ?? detectedIntegration(element);

export const setIntegration = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigOutput,
): void => {
	const integration: string | undefined = siteIntegration(
		renderOptions,
		element,
	);
	if (integration) {
		config.integration = integration;
	}
};
