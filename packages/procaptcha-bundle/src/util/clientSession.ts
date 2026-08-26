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

import { INPUT_LIMITS } from "@prosopo/types";
import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";

/**
 * Resolves the site's own session identifier for this widget, from either:
 * 1. renderOptions.sessionId
 * 2. the element's data-sessionid attribute
 *
 * The widget forwards the resolved value to the provider as
 * `clientMetaData.clientSessionId` when the solution is submitted; the dapp
 * server passes the same value to its verify call and the provider rejects the
 * token if the two disagree. Left undefined when the site doesn't use sessions,
 * in which case no correlation is performed.
 *
 * @param renderOptions
 * @param element
 * @param config
 */
export const setClientSessionId = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigOutput,
): void => {
	const sessionId =
		renderOptions?.sessionId || element.getAttribute("data-sessionid");

	if (!sessionId) {
		return;
	}

	// The provider bounds this field at INPUT_LIMITS.ID and would reject the
	// whole solution body if it were longer, so drop an oversized value here
	// rather than failing the solve over metadata.
	if (sessionId.length > INPUT_LIMITS.ID) {
		console.error(
			`Ignoring session id longer than ${INPUT_LIMITS.ID} characters`,
		);
		return;
	}

	config.clientSessionId = sessionId;
};
