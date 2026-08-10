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
import { extractReferrersFromLogs } from "./fluxLogDappDetails.js";

const SEPARATOR = "           ";

describe("extractReferrersFromLogs", () => {
	it("returns an empty string for empty input", () => {
		expect(extractReferrersFromLogs("")).toBe("");
	});

	it("returns an empty string when no quoted url is present", () => {
		expect(extractReferrersFromLogs("no urls here\njust text")).toBe("");
	});

	it("ignores urls that are not wrapped in double quotes", () => {
		expect(extractReferrersFromLogs("referrer: https://example.com")).toBe("");
	});

	it("extracts a single quoted url", () => {
		expect(extractReferrersFromLogs('referrer "https://example.com"')).toBe(
			"https://example.com",
		);
	});

	it("extracts http as well as https", () => {
		expect(extractReferrersFromLogs('"http://example.com"')).toBe(
			"http://example.com",
		);
	});

	it("joins multiple distinct urls with the fixed separator", () => {
		const logs = ['"https://a.com"', '"https://b.com"'].join("\n");
		expect(extractReferrersFromLogs(logs)).toBe(
			`https://a.com${SEPARATOR}https://b.com`,
		);
	});

	it("deduplicates urls seen on different lines", () => {
		const logs = ['"https://a.com"', '"https://a.com"'].join("\n");
		expect(extractReferrersFromLogs(logs)).toBe("https://a.com");
	});

	it("extracts several urls from a single line", () => {
		expect(
			extractReferrersFromLogs('"https://a.com" and "https://b.com"'),
		).toBe(`https://a.com${SEPARATOR}https://b.com`);
	});

	it("preserves insertion order", () => {
		const logs = '"https://z.com"\n"https://a.com"';
		expect(extractReferrersFromLogs(logs)).toBe(
			`https://z.com${SEPARATOR}https://a.com`,
		);
	});

	it("keeps query strings and paths intact", () => {
		expect(extractReferrersFromLogs('"https://a.com/p?q=1&r=2"')).toBe(
			"https://a.com/p?q=1&r=2",
		);
	});

	it("stops the match at the closing quote", () => {
		expect(extractReferrersFromLogs('"https://a.com" trailing "text"')).toBe(
			"https://a.com",
		);
	});

	it("does not match a url whose quote is never closed", () => {
		expect(extractReferrersFromLogs('"https://a.com')).toBe("");
	});
});
