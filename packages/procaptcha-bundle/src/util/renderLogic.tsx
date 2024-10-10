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
import { ProcaptchaFrictionless } from "@prosopo/procaptcha-frictionless";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { type Root, createRoot } from "react-dom/client";
import { getDefaultCallbacks, setUserCallbacks } from "./defaultCallbacks.js";
import { setLanguage } from "./language.js";
import { setTheme } from "./theme.js";
import { setValidChallengeLength } from "./timeout.js";

const identifierPrefix = "procaptcha-";

export const renderLogic = (
	elements: Element[],
	config: ProcaptchaClientConfigOutput,
	renderOptions?: ProcaptchaRenderOptions,
) => {
	const roots: Root[] = [];
	for (const element of elements) {
		const callbacks = getDefaultCallbacks(element);

		setUserCallbacks(renderOptions, callbacks, element);
		setTheme(renderOptions, element, config);
		setValidChallengeLength(renderOptions, element, config);
		setLanguage(renderOptions, element, config);

		let root: Root | null = null;
		switch (renderOptions?.captchaType) {
			case "pow":
				console.log("rendering pow");
				root = createRoot(element, { identifierPrefix });
				root.render(<ProcaptchaPow config={config} callbacks={callbacks} />);
				break;
			case "frictionless":
				console.log("rendering frictionless");
				root = createRoot(element, { identifierPrefix });
				root.render(
					<ProcaptchaFrictionless config={config} callbacks={callbacks} />,
				);
				break;
			default:
				console.log("rendering image");
				root = createRoot(element, { identifierPrefix });
				root.render(<Procaptcha config={config} callbacks={callbacks} />);
				break;
		}
		roots.push(root);
	}
	return roots;
};
