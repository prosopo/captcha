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
import { OS_NAMES, type OsName, classifyOs } from "#policy/classifyOs.js";

describe("classifyOs", () => {
	const cases: Array<{ name: string; ua: string; expected: OsName }> = [
		{
			name: "Windows 10 Chrome",
			ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			expected: "windows",
		},
		{
			name: "macOS Safari",
			ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
			expected: "macos",
		},
		{
			name: "iPhone Safari",
			ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			expected: "ios",
		},
		{
			name: "iPad Safari",
			ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			expected: "ios",
		},
		{
			name: "Android Chrome",
			ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
			expected: "android",
		},
		{
			name: "Linux desktop Firefox",
			ua: "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
			expected: "linux",
		},
	];

	for (const { name, ua, expected } of cases) {
		it(`classifies ${name} as ${expected}`, () => {
			expect(classifyOs(ua)).toBe(expected);
		});
	}

	it("returns 'unknown' for an empty User-Agent", () => {
		expect(classifyOs("")).toBe("unknown");
	});

	it("returns 'unknown' for an undefined User-Agent", () => {
		expect(classifyOs(undefined)).toBe("unknown");
	});

	it("returns 'unknown' for an unrecognised User-Agent", () => {
		expect(classifyOs("curl/8.4.0")).toBe("unknown");
	});

	it("prefers iOS over macOS when the UA carries both signatures", () => {
		// iOS UAs contain the "like Mac OS X" token, so the iphone/ipad check
		// must win or every iPhone would be mislabelled macOS.
		expect(
			classifyOs(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
			),
		).toBe("ios");
	});

	it("prefers Android over Linux when the UA carries both signatures", () => {
		// Android UAs contain "Linux", so the android check must come first.
		expect(classifyOs("Mozilla/5.0 (Linux; Android 14) Mobile")).toBe(
			"android",
		);
	});

	it("is case-insensitive", () => {
		expect(classifyOs("WINDOWS NT 10.0")).toBe("windows");
	});

	it("only ever returns a value from OS_NAMES", () => {
		const uas = [...cases.map((c) => c.ua), "", "curl/8.4.0", "garbage"];
		for (const ua of uas) {
			expect(OS_NAMES).toContain(classifyOs(ua));
		}
	});
});
