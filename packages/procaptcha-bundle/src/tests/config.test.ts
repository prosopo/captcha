import { JSDOM } from "jsdom";
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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractParams, getProcaptchaScript } from "../util/config.js";

describe("Config utility functions", () => {
	let dom: JSDOM;

	beforeEach(() => {
		dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
			url: "https://example.com",
		});
		global.document = dom.window.document;
	});

    afterEach(() => {
        // biome-ignore lint/suspicious/noExplicitAny: TODO fix any
		(global as any).document = undefined;
	});

	describe("getProcaptchaScript", () => {
		it("should return null when no matching script is found", () => {
			const result = getProcaptchaScript("nonexistent");
			expect(result).toBeNull();
		});

		it("should return the script element when a matching script is found", () => {
			const script = document.createElement("script");
			script.src = "https://example.com/procaptcha.js";
			document.body.appendChild(script);

			const result = getProcaptchaScript("procaptcha");
			expect(result).toBe(script);
		});
	});

	describe("extractParams", () => {
		it("should return undefined values when no matching script is found", () => {
			const result = extractParams("nonexistent");
			expect(result).toEqual({
				onloadUrlCallback: undefined,
				renderExplicit: undefined,
			});
		});

		it("should extract parameters from the script URL", () => {
			const script = document.createElement("script");
			script.src =
				"https://example.com/procaptcha.js?onload=onloadCallback&render=explicit";
			document.body.appendChild(script);

			const result = extractParams("procaptcha");
			expect(result).toEqual({
				onloadUrlCallback: "onloadCallback",
				renderExplicit: "explicit",
			});
		});

		it("should return undefined for missing parameters", () => {
			const script = document.createElement("script");
			script.src = "https://example.com/procaptcha.js?onload=onloadCallback";
			document.body.appendChild(script);

			const result = extractParams("procaptcha");
			expect(result).toEqual({
				onloadUrlCallback: "onloadCallback",
				renderExplicit: undefined,
			});
		});

		it("should handle scripts without query parameters", () => {
			const script = document.createElement("script");
			script.src = "https://example.com/procaptcha.js";
			document.body.appendChild(script);

			const result = extractParams("procaptcha");
			expect(result).toEqual({
				onloadUrlCallback: undefined,
				renderExplicit: undefined,
			});
		});
	});
});
