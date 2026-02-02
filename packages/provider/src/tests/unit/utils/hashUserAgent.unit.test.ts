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

import { describe, expect, it } from "vitest";
import { hashUserAgent } from "../../../utils/hashUserAgent.js";

describe("hashUserAgent", () => {
	it("should return a 32-character hex string", () => {
		const userAgent =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
		const result = hashUserAgent(userAgent);

		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should produce consistent results for the same input", () => {
		const userAgent = "Test User Agent String";
		const result1 = hashUserAgent(userAgent);
		const result2 = hashUserAgent(userAgent);

		expect(result1).toBe(result2);
	});

	it("should produce different results for different inputs", () => {
		const userAgent1 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
		const userAgent2 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

		const result1 = hashUserAgent(userAgent1);
		const result2 = hashUserAgent(userAgent2);

		expect(result1).not.toBe(result2);
	});

	it("should handle empty string", () => {
		const result = hashUserAgent("");

		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should handle very long user agent strings", () => {
		const longUserAgent = "A".repeat(1000);
		const result = hashUserAgent(longUserAgent);

		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should handle special characters", () => {
		const specialUserAgent =
			"Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0; !@#$%^&*())";
		const result = hashUserAgent(specialUserAgent);

		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should handle unicode characters", () => {
		const unicodeUserAgent =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0 🌟";
		const result = hashUserAgent(unicodeUserAgent);

		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[a-f0-9]{32}$/);
	});

	it("should use SHA-256 and return first 32 characters", () => {
		const userAgent = "test";
		const result = hashUserAgent(userAgent);

		// The full SHA-256 of "test" is: 9f86d081884c7d659a2feaa0c55ad0153bf4f1b2b0b822cd15d6c15b0f00a08
		// First 32 characters should be: 9f86d081884c7d659a2feaa0c55ad015
		expect(result).toBe("9f86d081884c7d659a2feaa0c55ad015");
	});
});
