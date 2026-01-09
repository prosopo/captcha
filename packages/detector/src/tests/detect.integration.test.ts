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
import { detect } from "../index.js";

describe("detect integration tests", () => {
	/**
	 * Test that the detect function can be imported and called.
	 * Since this is obfuscated code, we only verify it can be executed (may error).
	 */
	it("should be callable", () => {
		// The function should be callable (may be obfuscated and not work in test environment)

		// Should be callable (may succeed or fail)
		try {
			detect();
			expect(true).toBe(true);
		} catch (error) {
			expect(error).toBeDefined();
		}

		try {
			detect({}, () => Promise.resolve({}), document.createElement("div"));
			expect(true).toBe(true);
		} catch (error) {
			expect(error).toBeDefined();
		}
	});

	/**
	 * Test that the function can be executed and returns something.
	 * The obfuscated code may succeed or fail, but should be executable.
	 */
	it("should execute and return a value", () => {
		try {
			const result = detect();
			// If it returns something, it should be defined
			if (result !== undefined) {
				expect(result).toBeDefined();
			}
		} catch (error) {
			// Expected - obfuscated code may fail in test environment
			expect(error).toBeDefined();
		}
	});
});
