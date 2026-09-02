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
	type StartMode,
	StartModeEnum,
	StartModeSchema,
} from "@prosopo/types";

export const START_MODE_ATTRIBUTE = "data-start-mode";

export const resolveStartMode = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
): StartMode => {
	const requested =
		renderOptions?.startMode || element.getAttribute(START_MODE_ATTRIBUTE);

	if (!requested) {
		return StartModeEnum.auto;
	}

	const parsed = StartModeSchema.safeParse(requested);
	if (!parsed.success) {
		console.error(
			`Ignoring unknown start mode "${requested}"; expected one of ${StartModeSchema.options.join(", ")}`,
		);
		return StartModeEnum.auto;
	}

	return parsed.data;
};

export const setStartMode = (
	renderOptions: ProcaptchaRenderOptions | undefined,
	element: Element,
	config: ProcaptchaClientConfigOutput,
): void => {
	config.startMode = resolveStartMode(renderOptions, element);
};
