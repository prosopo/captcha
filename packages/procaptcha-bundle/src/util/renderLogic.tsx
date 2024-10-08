import { ProcaptchaFrictionless } from "@prosopo/procaptcha-frictionless";
import { ProcaptchaPow } from "@prosopo/procaptcha-pow";
import { Procaptcha } from "@prosopo/procaptcha-react";
import type {
	ProcaptchaClientConfigOutput,
	ProcaptchaRenderOptions,
} from "@prosopo/types";
import { createRoot } from "react-dom/client";
import { getDefaultCallbacks, setUserCallbacks } from "./defaultCallbacks.js";
import { setLanguage } from "./language.js";
import { setTheme } from "./theme.js";
import { setValidChallengeLength } from "./timeout.js";

export const renderLogic = (
	elements: Element[],
	config: ProcaptchaClientConfigOutput,
	renderOptions?: ProcaptchaRenderOptions,
) => {
	for (const element of elements) {
		const callbacks = getDefaultCallbacks(element);

		setUserCallbacks(renderOptions, callbacks, element);
		setTheme(renderOptions, element, config);
		setValidChallengeLength(renderOptions, element, config);
		setLanguage(renderOptions, element, config);

		switch (renderOptions?.captchaType) {
			case "pow":
				console.log("rendering pow");
				createRoot(element).render(
					<ProcaptchaPow config={config} callbacks={callbacks} />,
				);
				break;
			case "frictionless":
				console.log("rendering frictionless");
				createRoot(element).render(
					<ProcaptchaFrictionless config={config} callbacks={callbacks} />,
				);
				break;
			default:
				console.log("rendering image");
				createRoot(element).render(
					<Procaptcha config={config} callbacks={callbacks} />,
				);
				break;
		}
	}
};
