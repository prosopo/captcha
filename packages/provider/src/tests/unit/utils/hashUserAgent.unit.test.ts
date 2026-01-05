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
import { hashUserAgent } from "../../../utils/hashUserAgent.js";

describe("hashUserAgent", () => {
	it("returns a 32-character hex string", () => {
		const result = hashUserAgent("Mozilla/5.0");
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[0-9a-f]{32}$/);
	});

	it("returns consistent hash for same input", () => {
		const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
		const hash1 = hashUserAgent(userAgent);
		const hash2 = hashUserAgent(userAgent);
		expect(hash1).toBe(hash2);
	});

	it("returns different hash for different inputs", () => {
		const hash1 = hashUserAgent("Mozilla/5.0");
		const hash2 = hashUserAgent("Chrome/120.0");
		expect(hash1).not.toBe(hash2);
	});

	it("handles empty string", () => {
		const result = hashUserAgent("");
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[0-9a-f]{32}$/);
	});

	it("handles long user agent strings", () => {
		const longUserAgent = "Mozilla/5.0 ".repeat(100);
		const result = hashUserAgent(longUserAgent);
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[0-9a-f]{32}$/);
	});

	it("handles special characters", () => {
		const specialChars = "User-Agent: test@example.com (test; test)";
		const result = hashUserAgent(specialChars);
		expect(result).toHaveLength(32);
		expect(result).toMatch(/^[0-9a-f]{32}$/);
	});
});

