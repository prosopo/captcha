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
	DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_IMAGE_CAPTCHA_TIMEOUT,
	DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT,
	DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED,
	DEFAULT_MAX_VERIFIED_TIME_CONTRACT,
	DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT,
	DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT,
	DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT,
} from "./timeouts.js";

describe("timeouts", () => {
	describe("default timeout values", () => {
		it("has correct image captcha timeout", () => {
			expect(DEFAULT_IMAGE_CAPTCHA_TIMEOUT).toBe(60 * 1000);
		});

		it("has correct image captcha solution timeout", () => {
			expect(DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT).toBe(60 * 1000 * 2);
		});

		it("has correct image captcha verified timeout", () => {
			expect(DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT).toBe(60 * 1000 * 3);
		});

		it("has correct image max verified time cached", () => {
			expect(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED).toBe(60 * 1000 * 15);
		});

		it("has correct PoW captcha solution timeout", () => {
			expect(DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT).toBe(60 * 1000);
		});

		it("has correct PoW captcha verified timeout", () => {
			expect(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT).toBe(60 * 1000 * 2);
		});

		it("has correct PoW captcha cached timeout", () => {
			expect(DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT).toBe(60 * 1000 * 3);
		});

		it("has correct max verified time contract", () => {
			expect(DEFAULT_MAX_VERIFIED_TIME_CONTRACT).toBe(60 * 1000 * 15);
		});

		it("maintains correct relationships between timeouts", () => {
			expect(DEFAULT_IMAGE_CAPTCHA_SOLUTION_TIMEOUT).toBe(
				DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 2,
			);
			expect(DEFAULT_IMAGE_CAPTCHA_VERIFIED_TIMEOUT).toBe(
				DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 3,
			);
			expect(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED).toBe(
				DEFAULT_IMAGE_CAPTCHA_TIMEOUT * 15,
			);
			expect(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT).toBe(
				DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT * 2,
			);
			expect(DEFAULT_POW_CAPTCHA_CACHED_TIMEOUT).toBe(
				DEFAULT_POW_CAPTCHA_SOLUTION_TIMEOUT * 3,
			);
		});
	});
});
