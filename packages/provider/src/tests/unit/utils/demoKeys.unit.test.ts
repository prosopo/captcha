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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEMO_KEY_ALWAYS_FAIL,
	DEMO_KEY_ALWAYS_PASS,
	DemoKeyBehavior,
	areDemoKeysEnabled,
	getDemoKeyBehavior,
	isAlwaysFailDemoKey,
	isAlwaysPassDemoKey,
	shouldBypassForDemoKey,
} from "../../../utils/demoKeys.js";

describe("Demo Keys Utility Functions", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment before each test
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("areDemoKeysEnabled", () => {
		it("should return false when in production", () => {
			process.env.NODE_ENV = "production";
			expect(areDemoKeysEnabled()).toBe(false);
		});

		it("should return true in development", () => {
			process.env.NODE_ENV = "development";
			expect(areDemoKeysEnabled()).toBe(true);
		});

		it("should return true in test", () => {
			process.env.NODE_ENV = "test";
			expect(areDemoKeysEnabled()).toBe(true);
		});

		it("should respect custom allowed environments", () => {
			process.env.NODE_ENV = "staging";
			process.env.DEMO_KEYS_ALLOWED_ENVIRONMENTS = "staging,development";
			expect(areDemoKeysEnabled()).toBe(true);
		});
	});

	describe("isAlwaysPassDemoKey", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "development";
		});

		it("should return true for DEMO_KEY_ALWAYS_PASS", () => {
			expect(isAlwaysPassDemoKey(DEMO_KEY_ALWAYS_PASS)).toBe(true);
		});

		it("should return false for DEMO_KEY_ALWAYS_FAIL", () => {
			expect(isAlwaysPassDemoKey(DEMO_KEY_ALWAYS_FAIL)).toBe(false);
		});

		it("should return false for other keys", () => {
			expect(isAlwaysPassDemoKey("5SomeOtherKey")).toBe(false);
		});

		it("should return false when demo keys are disabled", () => {
			process.env.NODE_ENV = "production";
			expect(isAlwaysPassDemoKey(DEMO_KEY_ALWAYS_PASS)).toBe(false);
		});
	});

	describe("isAlwaysFailDemoKey", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "development";
		});

		it("should return true for DEMO_KEY_ALWAYS_FAIL", () => {
			expect(isAlwaysFailDemoKey(DEMO_KEY_ALWAYS_FAIL)).toBe(true);
		});

		it("should return false for DEMO_KEY_ALWAYS_PASS", () => {
			expect(isAlwaysFailDemoKey(DEMO_KEY_ALWAYS_PASS)).toBe(false);
		});

		it("should return false for other keys", () => {
			expect(isAlwaysFailDemoKey("5SomeOtherKey")).toBe(false);
		});

		it("should return false when demo keys are disabled", () => {
			process.env.NODE_ENV = "production";
			expect(isAlwaysFailDemoKey(DEMO_KEY_ALWAYS_FAIL)).toBe(false);
		});
	});

	describe("getDemoKeyBehavior", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "development";
		});

		it("should return AlwaysPass for DEMO_KEY_ALWAYS_PASS", () => {
			expect(getDemoKeyBehavior(DEMO_KEY_ALWAYS_PASS)).toBe(
				DemoKeyBehavior.AlwaysPass,
			);
		});

		it("should return AlwaysFail for DEMO_KEY_ALWAYS_FAIL", () => {
			expect(getDemoKeyBehavior(DEMO_KEY_ALWAYS_FAIL)).toBe(
				DemoKeyBehavior.AlwaysFail,
			);
		});

		it("should return null for non-demo keys", () => {
			expect(getDemoKeyBehavior("5SomeOtherKey")).toBeNull();
			expect(getDemoKeyBehavior("")).toBeNull();
		});

		it("should return null when demo keys are disabled", () => {
			process.env.NODE_ENV = "production";
			expect(getDemoKeyBehavior(DEMO_KEY_ALWAYS_PASS)).toBeNull();
			expect(getDemoKeyBehavior(DEMO_KEY_ALWAYS_FAIL)).toBeNull();
		});
	});

	describe("shouldBypassForDemoKey", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "development";
		});

		it("should return true when behavior matches AlwaysPass", () => {
			expect(
				shouldBypassForDemoKey(
					DEMO_KEY_ALWAYS_PASS,
					DemoKeyBehavior.AlwaysPass,
				),
			).toBe(true);
		});

		it("should return true when behavior matches AlwaysFail", () => {
			expect(
				shouldBypassForDemoKey(
					DEMO_KEY_ALWAYS_FAIL,
					DemoKeyBehavior.AlwaysFail,
				),
			).toBe(true);
		});

		it("should return false when behavior does not match", () => {
			expect(
				shouldBypassForDemoKey(
					DEMO_KEY_ALWAYS_PASS,
					DemoKeyBehavior.AlwaysFail,
				),
			).toBe(false);
			expect(
				shouldBypassForDemoKey(
					DEMO_KEY_ALWAYS_FAIL,
					DemoKeyBehavior.AlwaysPass,
				),
			).toBe(false);
		});

		it("should return false for non-demo keys", () => {
			expect(
				shouldBypassForDemoKey("5SomeOtherKey", DemoKeyBehavior.AlwaysPass),
			).toBe(false);
		});

		it("should return false when demo keys are disabled", () => {
			process.env.NODE_ENV = "production";
			expect(
				shouldBypassForDemoKey(
					DEMO_KEY_ALWAYS_PASS,
					DemoKeyBehavior.AlwaysPass,
				),
			).toBe(false);
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
