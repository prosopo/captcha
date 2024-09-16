import { FeaturesEnum } from "@prosopo/types";
import { at } from "@prosopo/util";

/**
 * Determines the captcha type based on the element's data attribute
 *
 * @param {Element} elements - The DOM element(s) to check for captcha type
 * @returns {FeaturesEnum} 
 */
export function getCaptchaType(elements: Element[]) {
	const features = Object.values(FeaturesEnum);
	const captchaType =
		features.find(
			(feature) =>
				feature === at(elements, 0).getAttribute("data-captcha-type"),
		) || ("frictionless" as FeaturesEnum);
	return captchaType;
}
