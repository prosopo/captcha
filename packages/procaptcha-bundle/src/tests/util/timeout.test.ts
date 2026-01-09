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

import type { ProcaptchaClientConfigOutput } from "@prosopo/types";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setValidChallengeLength } from "../../util/timeout.js";

describe("setValidChallengeLength", () => {
	let dom: JSDOM;
	let element: Element;
	let config: ProcaptchaClientConfigOutput;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
		global.document = dom.window.document;
		element = document.createElement("div");
		config = {
			account: { address: "test" },
			captchas: {
				image: { solutionTimeout: 300 },
				pow: { solutionTimeout: 300 },
			},
		} as ProcaptchaClientConfigOutput;
	});

	afterEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
	});

	it("should set timeout from renderOptions when provided", () => {
		setValidChallengeLength(
			{ "challenge-valid-length": "600" },
			element,
			config,
		);

		expect(config.captchas.image.solutionTimeout).toBe(600);
		expect(config.captchas.pow.solutionTimeout).toBe(600);
	});

	it("should set timeout from element data attribute when renderOptions is not provided", () => {
		element.setAttribute("data-challenge-valid-length", "900");
		setValidChallengeLength(undefined, element, config);

		expect(config.captchas.image.solutionTimeout).toBe(900);
		expect(config.captchas.pow.solutionTimeout).toBe(900);
	});

	it("should prioritize renderOptions over element attribute", () => {
		element.setAttribute("data-challenge-valid-length", "900");
		setValidChallengeLength(
			{ "challenge-valid-length": "600" },
			element,
			config,
		);

		expect(config.captchas.image.solutionTimeout).toBe(600);
		expect(config.captchas.pow.solutionTimeout).toBe(600);
	});

	it("should not modify timeout when neither renderOptions nor element attribute is provided", () => {
		const originalImageTimeout = config.captchas.image.solutionTimeout;
		const originalPowTimeout = config.captchas.pow.solutionTimeout;

		setValidChallengeLength(undefined, element, config);

		expect(config.captchas.image.solutionTimeout).toBe(originalImageTimeout);
		expect(config.captchas.pow.solutionTimeout).toBe(originalPowTimeout);
	});

	it("should handle string numbers correctly", () => {
		setValidChallengeLength(
			{ "challenge-valid-length": "1200" },
			element,
			config,
		);

		expect(config.captchas.image.solutionTimeout).toBe(1200);
		expect(config.captchas.pow.solutionTimeout).toBe(1200);
	});

	it("should handle zero timeout", () => {
		setValidChallengeLength({ "challenge-valid-length": "0" }, element, config);

		expect(config.captchas.image.solutionTimeout).toBe(0);
		expect(config.captchas.pow.solutionTimeout).toBe(0);
	});

	it("should parse numeric strings from element attribute", () => {
		element.setAttribute("data-challenge-valid-length", "1500");
		setValidChallengeLength(undefined, element, config);

		expect(config.captchas.image.solutionTimeout).toBe(1500);
		expect(config.captchas.pow.solutionTimeout).toBe(1500);
	});

	it("should handle invalid numeric strings by parsing to NaN", () => {
		element.setAttribute("data-challenge-valid-length", "invalid");
		setValidChallengeLength(undefined, element, config);

		expect(Number.isNaN(config.captchas.image.solutionTimeout)).toBe(true);
		expect(Number.isNaN(config.captchas.pow.solutionTimeout)).toBe(true);
	});

	it("should set both image and pow timeouts to the same value", () => {
		setValidChallengeLength(
			{ "challenge-valid-length": "750" },
			element,
			config,
		);

		expect(config.captchas.image.solutionTimeout).toBe(
			config.captchas.pow.solutionTimeout,
		);
	});
});
