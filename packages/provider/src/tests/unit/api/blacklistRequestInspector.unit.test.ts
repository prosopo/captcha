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

import { describe, expect, it, vi } from "vitest";
import { getRequestUserScope } from "../../../api/blacklistRequestInspector.js";

describe("getRequestUserScope", () => {
	it("should return a user scope with ja4Hash and userAgent and ip and userId", () => {
		const ja4 = "t13d1516h2_8daaf6152771_8eba31f8906f";
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const user = "testuser";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, ja4, rawIp, user);

		expect(userScope).toMatchObject({
			ja4Hash: ja4,
			userAgent: userAgent,
			ip: rawIp,
			userId: "testuser",
		});
		// Should also include calculated hashes
		expect(userScope.userAgentHash).toBeDefined();
		expect(typeof userScope.userAgentHash).toBe("string");
	});

	it("should return a user scope with ja4Hash and userAgent and ip", () => {
		const ja4 = "t13d1516h2_8daaf6152771_8eba31f8906f";
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, ja4, rawIp);

		expect(userScope).toMatchObject({
			ja4Hash: ja4,
			userAgent: userAgent,
			ip: rawIp,
		});
		expect(userScope.userAgentHash).toBeDefined();
	});

	it("should return a user scope with userAgent and ip", () => {
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, undefined, rawIp);

		expect(userScope).toMatchObject({
			userAgent: userAgent,
			ip: rawIp,
		});
		expect(userScope.userAgentHash).toBeDefined();
	});

	it("should return a user scope with userAgent", () => {
		const userAgent = "testuseragent1";
		const requestHeaders = {
			"user-agent": userAgent,
		};
		const userScope = getRequestUserScope(requestHeaders);

		expect(userScope).toMatchObject({
			userAgent: userAgent,
		});
		expect(userScope.userAgentHash).toBeDefined();
	});

	it("should include headers hash when headers are present", () => {
		const requestHeaders = {
			"user-agent": "Mozilla/5.0",
			"accept-language": "en-US",
			"sec-ch-ua": '"Chromium";v="119"',
		};
		const userScope = getRequestUserScope(requestHeaders);

		expect(userScope.userAgent).toBe("Mozilla/5.0");
		expect(userScope.userAgentHash).toBeDefined();
		expect(userScope.headersHash).toBeDefined();
		expect(userScope.headerAcceptLanguage).toBe("en-US");
		expect(userScope.headerSecChUa).toBe('"Chromium";v="119"');
	});

	it("should handle numeric duration header", () => {
		const requestHeaders = {
			"x-duration-ms": "250.75",
			"accept-language": "en-US",
		};
		const userScope = getRequestUserScope(requestHeaders);

		expect(userScope.headerXDurationMs).toBe(250.75);
		expect(typeof userScope.headerXDurationMs).toBe("number");
		expect(userScope.headerAcceptLanguage).toBe("en-US");
		expect(userScope.headersHash).toBeDefined();
	});

	it("should handle duration with microsecond units", () => {
		const requestHeaders = {
			"x-duration-ms": "232.689µs", // Proper µs symbol
			"accept-language": "fr-FR",
		};
		const userScope = getRequestUserScope(requestHeaders);

		// 232.689µs = 0.232689ms
		expect(userScope.headerXDurationMs).toBeCloseTo(0.232689, 6);
		expect(typeof userScope.headerXDurationMs).toBe("number");
	});

	it("should handle duration with garbled microsecond encoding", () => {
		const requestHeaders = {
			"x-duration-ms": "232.689Âµs", // Garbled encoding as in example
		};
		const userScope = getRequestUserScope(requestHeaders);

		// Should be converted to proper µs and then to ms
		expect(userScope.headerXDurationMs).toBeCloseTo(0.232689, 6);
		expect(typeof userScope.headerXDurationMs).toBe("number");
	});

	it("should handle various duration units", () => {
		const testCases = [
			{ input: "150ms", expected: 150 },          // milliseconds
			{ input: "1.5s", expected: 1500 },         // seconds
			{ input: "1000µs", expected: 1 },          // microseconds
			{ input: "500us", expected: 0.5 },         // microseconds (alt notation)
			{ input: "2sec", expected: 2000 },         // seconds (alt notation)
			{ input: "1min", expected: 60000 },        // minutes
			{ input: "0.5m", expected: 30000 },        // minutes (alt notation)
			{ input: "100", expected: 100 },           // no unit (assume ms)
		];

		for (const testCase of testCases) {
			const requestHeaders = { "x-duration-ms": testCase.input };
			const userScope = getRequestUserScope(requestHeaders);

			expect(userScope.headerXDurationMs).toBeCloseTo(testCase.expected, 6);
		}
	});

	it("should handle duration with scientific notation", () => {
		const requestHeaders = {
			"x-duration-ms": "1.5e3ms", // Scientific notation: 1.5 * 10^3 = 1500ms
		};
		const userScope = getRequestUserScope(requestHeaders);

		expect(userScope.headerXDurationMs).toBe(1500);
	});

	it("should handle duration with whitespace", () => {
		const requestHeaders = {
			"x-duration-ms": "  250.5 ms  ", // Extra whitespace
		};
		const userScope = getRequestUserScope(requestHeaders);

		expect(userScope.headerXDurationMs).toBe(250.5);
	});

	it("should handle unknown units gracefully", () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const requestHeaders = {
			"x-duration-ms": "100xyz", // Unknown unit
		};
		const userScope = getRequestUserScope(requestHeaders);

		// Should assume milliseconds and warn
		expect(userScope.headerXDurationMs).toBe(100);
		expect(consoleSpy).toHaveBeenCalledWith("Unknown duration unit: xyz, assuming milliseconds");

		consoleSpy.mockRestore();
	});

	it("should handle invalid duration strings", () => {
		const testCases = [
			"invalid-number",
			"abc",
			"",
			"   ",
			"NaN",
			"Infinity"
		];

		for (const invalidInput of testCases) {
			const requestHeaders = { "x-duration-ms": invalidInput };
			const userScope = getRequestUserScope(requestHeaders);

			expect(userScope.headerXDurationMs).toBeUndefined();
		}
	});

	it("should not include operator field in request user scope", () => {
		const requestHeaders = {
			"x-duration-ms": "100.5ms",
			"accept-language": "fr-FR",
		};
		const userScope = getRequestUserScope(requestHeaders);

		// Should include duration as number
		expect(userScope.headerXDurationMs).toBe(100.5);
		expect(userScope.headerAcceptLanguage).toBe("fr-FR");

		// Should not include operator field as it's only used in rules, not requests
		expect(userScope.headerXDurationMsOperator).toBeUndefined();
	});
});
