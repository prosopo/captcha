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

import { afterEach, describe, expect, it, vi } from "vitest";
import { integerFromEnv } from "../prosopo.config.js";

const NAME = "PROSOPO_TEST_INTEGER_FROM_ENV";

describe("integerFromEnv", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it.each([undefined, ""])("returns the fallback when the value is %j", (v) => {
		vi.stubEnv(NAME, v);
		expect(integerFromEnv(NAME, 9229)).toBe(9229);
	});

	it("reads a whole integer", () => {
		vi.stubEnv(NAME, "8080");
		expect(integerFromEnv(NAME, 9229, { min: 0, max: 65535 })).toBe(8080);
	});

	it.each(["80a", "abc", "1.5", "70000", "-1"])(
		"throws for %j instead of starting with a partial or NaN value",
		(v) => {
			vi.stubEnv(NAME, v);
			expect(() => integerFromEnv(NAME, 9229, { min: 0, max: 65535 })).toThrow(
				NAME,
			);
		},
	);
});
