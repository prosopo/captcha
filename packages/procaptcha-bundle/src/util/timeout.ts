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
import { parseInteger } from "@prosopo/util";

/**
 * Set the timeout for a solved captcha
 *
 * @param renderOptions
 * @param element
 * @param config
 */
export const setValidChallengeLength = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigOutput,
): void => {
	const challengeValidLengthAttribute =
		renderOptions?.["challenge-valid-length"] ||
		element.getAttribute("data-challenge-valid-length");

	if (!challengeValidLengthAttribute) {
		return;
	}
	// A site-supplied value that isn't a positive integer keeps the default
	// rather than setting a NaN timeout; parseInt would also read "60s" as 60.
	const solutionTimeout = parseInteger(challengeValidLengthAttribute, {
		min: 1,
	});
	if (!solutionTimeout.ok) {
		console.warn(
			`Ignoring invalid challenge-valid-length "${challengeValidLengthAttribute}"`,
		);
		return;
	}
	config.captchas.image.solutionTimeout = solutionTimeout.value;
	config.captchas.pow.solutionTimeout = solutionTimeout.value;
};
