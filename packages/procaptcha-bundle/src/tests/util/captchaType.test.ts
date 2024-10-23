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
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";
import { getCaptchaType } from "../../util/captchaType.js";

describe("getCaptchaType", () => {
	beforeEach(() => {
		const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		global.document = dom.window.document;
	});
	it("should return the correct captcha type when a valid type is set", () => {
		const element = document.createElement("div");
		element.setAttribute("data-captcha-type", FeaturesEnum.Pow);

		const result = getCaptchaType([element]);

		expect(result).toBe(FeaturesEnum.Pow);
	});

	it('should return "frictionless" when no captcha type is set', () => {
		const element = document.createElement("div");

		const result = getCaptchaType([element]);

		expect(result).toBe("frictionless");
	});

	it('should return "frictionless" when an invalid captcha type is set', () => {
		const element = document.createElement("div");
		element.setAttribute("data-captcha-type", "invalid-type");

		const result = getCaptchaType([element]);

		expect(result).toBe("frictionless");
	});

	it("should work with all valid FeaturesEnum values", () => {
		const element = document.createElement("div");

		for (const feature of Object.values(FeaturesEnum)) {
			element.setAttribute("data-captcha-type", feature);
			const result = getCaptchaType([element]);
			expect(result).toBe(feature);
		}
	});
});
