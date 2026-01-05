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

import { expectTypeOf } from "vitest";
import type {
	ProcaptchaLanguages,
	ProcaptchaRenderOptions,
	ProcaptchaType,
} from "../index.js";
import { renderProcaptcha } from "../index.js";

describe("types", () => {
	describe("ProcaptchaRenderOptions", () => {
		it("should accept siteKey as required parameter", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test-key",
			};
			expectTypeOf(options.siteKey).toBeString();
		});

		it("should accept optional theme parameter", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				theme: "light",
			};
			expectTypeOf(options.theme).toEqualTypeOf<"light" | "dark" | undefined>();
		});

		it("should accept optional captchaType parameter", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				captchaType: "image",
			};
			expectTypeOf(options.captchaType).toEqualTypeOf<
				ProcaptchaType | undefined
			>();
		});

		it("should accept optional callback as string or function", () => {
			const options1: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				callback: "callbackName",
			};
			expectTypeOf(options1.callback).toEqualTypeOf<
				string | ((token: string) => void) | undefined
			>();

			const options2: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				callback: (token: string) => {
					console.log(token);
				},
			};
			expectTypeOf(options2.callback).toEqualTypeOf<
				string | ((token: string) => void) | undefined
			>();
		});

		it("should accept optional language parameter", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				language: "en",
			};
			expectTypeOf(options.language).toEqualTypeOf<
				ProcaptchaLanguages | undefined
			>();
		});

		it("should accept optional size parameter", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				size: "invisible",
			};
			expectTypeOf(options.size).toEqualTypeOf<"invisible" | undefined>();
		});

		it("should accept optional web3 parameter", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				web3: true,
			};
			expectTypeOf(options.web3).toEqualTypeOf<boolean | undefined>();
		});

		it("should accept optional userAccountAddress parameter", () => {
			const options: ProcaptchaRenderOptions = {
				siteKey: "test-key",
				userAccountAddress: "0x123",
			};
			expectTypeOf(options.userAccountAddress).toEqualTypeOf<
				string | undefined
			>();
		});
	});

	describe("renderProcaptcha function signature", () => {
		it("should accept HTMLElement as first parameter", () => {
			const element = document.createElement("div");
			const options: ProcaptchaRenderOptions = { siteKey: "test" };
			expectTypeOf(renderProcaptcha).toBeFunction();
			expectTypeOf(renderProcaptcha).parameter(0).toEqualTypeOf<HTMLElement>();
		});

		it("should accept ProcaptchaRenderOptions as second parameter", () => {
			const element = document.createElement("div");
			const options: ProcaptchaRenderOptions = { siteKey: "test" };
			expectTypeOf(renderProcaptcha)
				.parameter(1)
				.toEqualTypeOf<ProcaptchaRenderOptions>();
		});

		it("should return Promise<void>", () => {
			const element = document.createElement("div");
			const options: ProcaptchaRenderOptions = { siteKey: "test" };
			expectTypeOf(renderProcaptcha(element, options)).resolves.toBeVoid();
		});
	});

	describe("ProcaptchaType", () => {
		it("should be a union of valid captcha types", () => {
			expectTypeOf<ProcaptchaType>().toEqualTypeOf<
				"image" | "pow" | "frictionless" | "invisible"
			>();
		});
	});

	describe("ProcaptchaLanguages", () => {
		it("should be a valid language type", () => {
			const lang: ProcaptchaLanguages = "en";
			expectTypeOf(lang).toBeString();
		});
	});
});
