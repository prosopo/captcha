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
import {
	ProcaptchaComponent,
	type ProcaptchaLanguages,
	type ProcaptchaRenderOptions,
	type ProcaptchaType,
} from "./index.js";

describe("index", () => {
	describe("exports", () => {
		it("should export ProcaptchaComponent", () => {
			expect(ProcaptchaComponent).toBeDefined();
		});

		it("should export ProcaptchaRenderOptions type", () => {
			// Test that the type can be used for parameters
			const testOptions: ProcaptchaRenderOptions = {
				siteKey: "test-site-key",
			};
			expect(testOptions.siteKey).toBe("test-site-key");
		});

		it("should export ProcaptchaType type", () => {
			// Test that the type can be used for parameters
			const testType: ProcaptchaType = "image";
			expect(testType).toBe("image");
		});

		it("should export ProcaptchaLanguages type", () => {
			// Test that the type can be used for parameters
			const testLanguage: ProcaptchaLanguages = "en";
			expect(testLanguage).toBe("en");
		});
	});

	describe("type definitions", () => {
		it("should accept ProcaptchaRenderOptions with all optional properties", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test",
				theme: "light",
				captchaType: "image",
				language: "en",
				size: "invisible",
				web3: true,
				userAccountAddress: "0x123",
			};
			expect(options.siteKey).toBe("test");
			expect(options.theme).toBe("light");
		});

		it("should accept ProcaptchaRenderOptions with only required properties", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test",
			};
			expect(options.siteKey).toBe("test");
		});
	});
});
