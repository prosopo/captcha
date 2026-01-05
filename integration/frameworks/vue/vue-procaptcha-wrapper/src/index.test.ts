// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { describe, expect, it } from "vitest";
import type {
	ProcaptchaLanguages,
	ProcaptchaRenderOptions,
	ProcaptchaType,
} from "./index.js";
import { ProcaptchaComponent } from "./index.js";

describe("index", () => {
	it("exports ProcaptchaComponent", () => {
		expect(ProcaptchaComponent).toBeDefined();
	});

	it("exports ProcaptchaRenderOptions type", () => {
		// Type test: verify ProcaptchaRenderOptions can be used as a parameter type
		const testOptions: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
		};
		expect(testOptions.siteKey).toBe("test-site-key");
	});

	it("exports ProcaptchaRenderOptions with all optional properties", () => {
		// Type test: verify all optional properties are accepted
		const fullOptions: ProcaptchaRenderOptions = {
			siteKey: "test-site-key",
			theme: "light",
			captchaType: "pow",
			callback: () => {},
			"challenge-valid-length": "300",
			"chalexpired-callback": () => {},
			"expired-callback": () => {},
			"open-callback": () => {},
			"close-callback": () => {},
			"error-callback": () => {},
			"failed-callback": () => {},
			"reset-callback": () => {},
			language: "en",
			size: "invisible",
			web3: true,
			userAccountAddress: "0x123",
		};
		expect(fullOptions.siteKey).toBe("test-site-key");
		expect(fullOptions.theme).toBe("light");
		expect(fullOptions.captchaType).toBe("pow");
	});

	it("exports ProcaptchaType type", () => {
		// Type test: verify ProcaptchaType can be used
		const testType: ProcaptchaType = "pow";
		expect(testType).toBe("pow");
	});

	it("exports ProcaptchaLanguages type", () => {
		// Type test: verify ProcaptchaLanguages can be used
		const testLanguage: ProcaptchaLanguages = "en";
		expect(testLanguage).toBe("en");
	});

	it("ProcaptchaRenderOptions callback can be a function", () => {
		// Type test: verify callback can be a function
		const options: ProcaptchaRenderOptions = {
			siteKey: "test",
			callback: (token: string) => {
				expect(typeof token).toBe("string");
			},
		};
		if (typeof options.callback === "function") {
			options.callback("test-token");
		}
	});

	it("ProcaptchaRenderOptions callback can be a string", () => {
		// Type test: verify callback can be a string
		const options: ProcaptchaRenderOptions = {
			siteKey: "test",
			callback: "window.myCallback",
		};
		expect(typeof options.callback).toBe("string");
	});
});
