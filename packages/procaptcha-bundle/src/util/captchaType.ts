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
