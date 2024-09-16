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
