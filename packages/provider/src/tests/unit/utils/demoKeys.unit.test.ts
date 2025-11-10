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

import { DemoKeyBehavior } from "@prosopo/types";
import type { ClientRecord } from "@prosopo/types-database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	areDemoKeysEnabled,
	getDemoKeyBehavior,
	isDemoKey,
	shouldBypassForDemoKey,
	validateDemoKeyEnvironment,
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
		it("should return false when ENABLE_DEMO_KEYS is not set", () => {
			delete process.env.ENABLE_DEMO_KEYS;
			expect(areDemoKeysEnabled()).toBe(false);
		});

		it("should return false when ENABLE_DEMO_KEYS is false", () => {
			process.env.ENABLE_DEMO_KEYS = "false";
			expect(areDemoKeysEnabled()).toBe(false);
		});

		it("should return true when ENABLE_DEMO_KEYS is true and in development", () => {
			process.env.ENABLE_DEMO_KEYS = "true";
			process.env.NODE_ENV = "development";
			expect(areDemoKeysEnabled()).toBe(true);
		});

		it("should return true when ENABLE_DEMO_KEYS is true and in test", () => {
			process.env.ENABLE_DEMO_KEYS = "true";
			process.env.NODE_ENV = "test";
			expect(areDemoKeysEnabled()).toBe(true);
		});

		it("should return false when ENABLE_DEMO_KEYS is true but in production", () => {
			process.env.ENABLE_DEMO_KEYS = "true";
			process.env.NODE_ENV = "production";
			expect(areDemoKeysEnabled()).toBe(false);
		});

		it("should respect custom allowed environments", () => {
			process.env.ENABLE_DEMO_KEYS = "true";
			process.env.NODE_ENV = "staging";
			process.env.DEMO_KEYS_ALLOWED_ENVIRONMENTS = "staging,development";
			expect(areDemoKeysEnabled()).toBe(true);
		});
	});

	describe("isDemoKey", () => {
		it("should return false for client record without demo config", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {},
			} as ClientRecord;
			expect(isDemoKey(clientRecord)).toBe(false);
		});

		it("should return false for client record with disabled demo config", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: false,
						behavior: DemoKeyBehavior.AlwaysPass,
					},
				},
			} as ClientRecord;
			expect(isDemoKey(clientRecord)).toBe(false);
		});

		it("should return true for client record with enabled demo config", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: true,
						behavior: DemoKeyBehavior.AlwaysPass,
					},
				},
			} as ClientRecord;
			expect(isDemoKey(clientRecord)).toBe(true);
		});
	});

	describe("getDemoKeyBehavior", () => {
		it("should return null for non-demo key", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {},
			} as ClientRecord;
			expect(getDemoKeyBehavior(clientRecord)).toBeNull();
		});

		it("should return AlwaysPass for demo key with AlwaysPass behavior", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: true,
						behavior: DemoKeyBehavior.AlwaysPass,
					},
				},
			} as ClientRecord;
			expect(getDemoKeyBehavior(clientRecord)).toBe(DemoKeyBehavior.AlwaysPass);
		});

		it("should return AlwaysFail for demo key with AlwaysFail behavior", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: true,
						behavior: DemoKeyBehavior.AlwaysFail,
					},
				},
			} as ClientRecord;
			expect(getDemoKeyBehavior(clientRecord)).toBe(DemoKeyBehavior.AlwaysFail);
		});
	});

	describe("shouldBypassForDemoKey", () => {
		beforeEach(() => {
			process.env.ENABLE_DEMO_KEYS = "true";
			process.env.NODE_ENV = "development";
		});

		it("should return false when demo keys are not enabled", () => {
			process.env.ENABLE_DEMO_KEYS = "false";
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: true,
						behavior: DemoKeyBehavior.AlwaysPass,
					},
				},
			} as ClientRecord;
			expect(
				shouldBypassForDemoKey(clientRecord, DemoKeyBehavior.AlwaysPass),
			).toBe(false);
		});

		it("should return false for non-demo key", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {},
			} as ClientRecord;
			expect(
				shouldBypassForDemoKey(clientRecord, DemoKeyBehavior.AlwaysPass),
			).toBe(false);
		});

		it("should return false when behavior does not match", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: true,
						behavior: DemoKeyBehavior.AlwaysFail,
					},
				},
			} as ClientRecord;
			expect(
				shouldBypassForDemoKey(clientRecord, DemoKeyBehavior.AlwaysPass),
			).toBe(false);
		});

		it("should return true when behavior matches AlwaysPass", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: true,
						behavior: DemoKeyBehavior.AlwaysPass,
					},
				},
			} as ClientRecord;
			expect(
				shouldBypassForDemoKey(clientRecord, DemoKeyBehavior.AlwaysPass),
			).toBe(true);
		});

		it("should return true when behavior matches AlwaysFail", () => {
			const clientRecord: ClientRecord = {
				account: "test",
				settings: {
					demoKeyConfig: {
						enabled: true,
						behavior: DemoKeyBehavior.AlwaysFail,
					},
				},
			} as ClientRecord;
			expect(
				shouldBypassForDemoKey(clientRecord, DemoKeyBehavior.AlwaysFail),
			).toBe(true);
		});
	});

	describe("validateDemoKeyEnvironment", () => {
		it("should not throw when demo keys are disabled", () => {
			process.env.ENABLE_DEMO_KEYS = "false";
			process.env.NODE_ENV = "production";
			expect(() => validateDemoKeyEnvironment()).not.toThrow();
		});

		it("should not throw when demo keys are enabled in development", () => {
			process.env.ENABLE_DEMO_KEYS = "true";
			process.env.NODE_ENV = "development";
			expect(() => validateDemoKeyEnvironment()).not.toThrow();
		});

		it("should throw when demo keys are enabled in production", () => {
			process.env.ENABLE_DEMO_KEYS = "true";
			process.env.NODE_ENV = "production";
			process.env.DEMO_KEYS_ALLOWED_ENVIRONMENTS = "development,test";
			expect(() => validateDemoKeyEnvironment()).toThrow(
				/CRITICAL.*Demo keys.*production/i,
			);
		});
	});
});

