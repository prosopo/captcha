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
import {
	BROWSER_NAMES,
	type BrowserName,
	classifyBrowser,
} from "#policy/classifyBrowser.js";

describe("classifyBrowser", () => {
	const cases: Array<{ name: string; ua: string; expected: BrowserName }> = [
		{
			name: "Chrome on Windows",
			ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			expected: "chrome",
		},
		{
			name: "Chrome on iOS",
			ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
			expected: "chrome",
		},
		{
			name: "Safari on macOS",
			ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
			expected: "safari",
		},
		{
			name: "Firefox on Linux",
			ua: "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
			expected: "firefox",
		},
		{
			name: "Firefox on iOS",
			ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15",
			expected: "firefox",
		},
		{
			name: "Edge on Windows",
			ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
			expected: "edge",
		},
		{
			name: "Opera",
			ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
			expected: "opera",
		},
		{
			name: "Samsung Internet",
			ua: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
			expected: "samsung_internet",
		},
		{
			name: "WeChat in-app browser",
			ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42",
			expected: "wechat",
		},
		{
			name: "Facebook in-app browser",
			ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/442.0.0]",
			expected: "facebook",
		},
		{
			name: "Instagram in-app browser",
			ua: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.0 Android",
			expected: "instagram",
		},
		{
			name: "Internet Explorer 11",
			ua: "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko",
			expected: "ie",
		},
	];

	for (const { name, ua, expected } of cases) {
		it(`classifies ${name} as ${expected}`, () => {
			expect(classifyBrowser(ua)).toBe(expected);
		});
	}

	it("returns 'unknown' for an empty User-Agent", () => {
		expect(classifyBrowser("")).toBe("unknown");
	});

	it("returns 'unknown' for an undefined User-Agent", () => {
		expect(classifyBrowser(undefined)).toBe("unknown");
	});

	it("returns 'unknown' for an unrecognised User-Agent", () => {
		expect(classifyBrowser("curl/8.4.0")).toBe("unknown");
	});

	it("does not classify a Chrome UA as Safari", () => {
		expect(
			classifyBrowser(
				"Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
			),
		).toBe("chrome");
	});

	it("does not classify an Edge UA as Chrome", () => {
		expect(
			classifyBrowser(
				"Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
			),
		).toBe("edge");
	});

	it("does not classify a Samsung Internet UA as Chrome", () => {
		expect(
			classifyBrowser(
				"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
			),
		).toBe("samsung_internet");
	});

	it("is case-insensitive", () => {
		expect(classifyBrowser("MOZILLA/5.0 FIREFOX/120.0")).toBe("firefox");
	});

	it("only ever returns a value from BROWSER_NAMES", () => {
		const uas = [...cases.map((c) => c.ua), "", "curl/8.4.0", "garbage"];
		for (const ua of uas) {
			expect(BROWSER_NAMES).toContain(classifyBrowser(ua));
		}
	});
});
