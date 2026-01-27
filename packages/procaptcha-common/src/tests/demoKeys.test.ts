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
	DEMO_KEY_ALWAYS_FAIL,
	DEMO_KEY_ALWAYS_PASS,
	getDemoKeyBehavior,
	isDemoKey,
} from "../util/demoKeys.js";

describe("Demo Keys Utility", () => {
	describe("getDemoKeyBehavior", () => {
		it("should return 'always_pass' for DEMO_KEY_ALWAYS_PASS", () => {
			expect(getDemoKeyBehavior(DEMO_KEY_ALWAYS_PASS)).toBe("always_pass");
		});

		it("should return 'always_fail' for DEMO_KEY_ALWAYS_FAIL", () => {
			expect(getDemoKeyBehavior(DEMO_KEY_ALWAYS_FAIL)).toBe("always_fail");
		});

		it("should return null for non-demo keys", () => {
			expect(getDemoKeyBehavior("5SomeOtherKey")).toBeNull();
			expect(getDemoKeyBehavior("")).toBeNull();
		});
	});

	describe("isDemoKey", () => {
		it("should return true for DEMO_KEY_ALWAYS_PASS", () => {
			expect(isDemoKey(DEMO_KEY_ALWAYS_PASS)).toBe(true);
		});

		it("should return true for DEMO_KEY_ALWAYS_FAIL", () => {
			expect(isDemoKey(DEMO_KEY_ALWAYS_FAIL)).toBe(true);
		});

		it("should return false for non-demo keys", () => {
			expect(isDemoKey("5SomeOtherKey")).toBe(false);
			expect(isDemoKey("")).toBe(false);
		});
	});

	describe("Demo Key Constants", () => {
		it("should have correct DEMO_KEY_ALWAYS_PASS value", () => {
			expect(DEMO_KEY_ALWAYS_PASS).toBe(
				"5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
			);
		});

		it("should have correct DEMO_KEY_ALWAYS_FAIL value", () => {
			expect(DEMO_KEY_ALWAYS_FAIL).toBe(
				"5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL",
			);
		});

		it("should not have the same value", () => {
			expect(DEMO_KEY_ALWAYS_PASS).not.toBe(DEMO_KEY_ALWAYS_FAIL);
		});
	});
});
