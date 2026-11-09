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
import { parseBypassKeyCookie } from "../bypassKeyCookie.js";

describe("parseBypassKeyCookie", () => {
	it("reads the bypass key from among other cookies", () => {
		expect(
			parseBypassKeyCookie(
				"theme=dark; prosopo_bypass_key=pbk_abc123; lang=en",
			),
		).toBe("pbk_abc123");
	});

	it("decodes a percent-encoded value", () => {
		expect(parseBypassKeyCookie("prosopo_bypass_key=pbk_a%2Bb")).toBe(
			"pbk_a+b",
		);
	});

	it("keeps a value that is not valid percent-encoding as-is", () => {
		expect(parseBypassKeyCookie("prosopo_bypass_key=pbk_%E0%A4%A")).toBe(
			"pbk_%E0%A4%A",
		);
	});

	it.each([
		["no cookies", ""],
		["other cookies only", "theme=dark; lang=en"],
		["an empty value", "prosopo_bypass_key="],
		[
			"a cookie whose name only ends with the key name",
			"x_prosopo_bypass_key=1",
		],
	])("returns undefined for %s", (_label: string, cookieString: string) => {
		expect(parseBypassKeyCookie(cookieString)).toBeUndefined();
	});
});
