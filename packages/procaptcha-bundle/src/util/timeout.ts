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
import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";

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

	if (challengeValidLengthAttribute) {
		config.captchas.image.solutionTimeout = Number.parseInt(
			challengeValidLengthAttribute,
		);
		config.captchas.pow.solutionTimeout = Number.parseInt(
			challengeValidLengthAttribute,
		);
	}
};
