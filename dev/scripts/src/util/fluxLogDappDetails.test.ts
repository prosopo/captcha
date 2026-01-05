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
import { extractReferrersFromLogs } from "./fluxLogDappDetails.js";

describe("extractReferrersFromLogs", () => {
	it("should extract single URL from logs", () => {
		const logs = 'Some log text with "https://example.com" in it';
		const result = extractReferrersFromLogs(logs);
		expect(result).toBe("https://example.com");
	});

	it("should extract multiple unique URLs from logs", () => {
		const logs = `
			Line 1: "https://example.com"
			Line 2: "http://test.com"
			Line 3: "https://example.com"
		`;
		const result = extractReferrersFromLogs(logs);
		expect(result).toContain("https://example.com");
		expect(result).toContain("http://test.com");
	});

	it("should extract URLs with paths and query strings", () => {
		const logs = '"https://example.com/path?query=value"';
		const result = extractReferrersFromLogs(logs);
		expect(result).toBe("https://example.com/path?query=value");
	});

	it("should handle empty logs", () => {
		const result = extractReferrersFromLogs("");
		expect(result).toBe("");
	});

	it("should handle logs with no URLs", () => {
		const logs = "Just some regular text without any URLs";
		const result = extractReferrersFromLogs(logs);
		expect(result).toBe("");
	});

	it("should extract URLs from multiple lines", () => {
		const logs = `
			First line: "https://first.com"
			Second line: "https://second.com"
			Third line: "https://third.com"
		`;
		const result = extractReferrersFromLogs(logs);
		expect(result).toContain("https://first.com");
		expect(result).toContain("https://second.com");
		expect(result).toContain("https://third.com");
	});

	it("should handle URLs with ports", () => {
		const logs = '"https://example.com:8080/path"';
		const result = extractReferrersFromLogs(logs);
		expect(result).toBe("https://example.com:8080/path");
	});

	it("should return URLs separated by spaces", () => {
		const logs = `
			"https://example.com"
			"http://test.com"
		`;
		const result = extractReferrersFromLogs(logs);
		expect(result.split("           ").length).toBeGreaterThan(1);
	});
});
