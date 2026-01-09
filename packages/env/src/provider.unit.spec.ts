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
import type { KeyringPair } from "@prosopo/types";
import type { ProsopoConfigOutput } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockKeyring = {
	addPair: vi.fn((pair) => pair),
	getPairs: vi.fn(() => []),
	encodeAddress: vi.fn(
		(key) => "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	),
};

vi.mock("@prosopo/keyring", async () => {
	const actual = await vi.importActual("@prosopo/keyring");
	const mockKeyring = {
		addPair: vi.fn((pair) => pair),
		getPairs: vi.fn(() => []),
		encodeAddress: vi.fn(
			(key) => "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		),
	};
	return {
		...actual,
		Keyring: vi.fn(() => mockKeyring),
	};
});

import { ProviderEnvironment } from "./provider.js";

describe("ProviderEnvironment", () => {
	let mockConfig: ProsopoConfigOutput;
	let testPair: KeyringPair;

	beforeEach(() => {
		vi.clearAllMocks();

		// @ts-expect-error - Partial mock for testing
		testPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			publicKey: new Uint8Array(32).fill(1),
			meta: {},
			isLocked: false,
			lock: vi.fn(),
			unlock: vi.fn(),
		} as KeyringPair;

		mockConfig = {
			logLevel: "info",
			defaultEnvironment: "development",
			account: {
				secret:
					"bottom drive obey lake curtain smoke basket hold race lonely fit walk",
			},
			host: "http://localhost:9229",
			ipApi: {
				apiKey: "test-key",
				baseUrl: "https://api.test.com",
			},
			redisConnection: {
				url: "redis://localhost:6379",
				password: "root",
			},
		} as ProsopoConfigOutput;
	});

	describe("cleanup", () => {
		it("logs error when cleanupScheduledTaskStatus fails", async () => {
			// Test: Error handling in cleanup - basic validation covered by integration tests
			const env = new ProviderEnvironment(mockConfig, testPair);
			const error = new Error("Cleanup failed");
			const mockDb = {
				cleanupScheduledTaskStatus: vi.fn().mockRejectedValue(error),
			} as any; // Partial mock for testing
			env.db = mockDb;
			const errorSpy = vi.spyOn(env.logger, "error");

			env.cleanup();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(errorSpy).toHaveBeenCalled();
		});

		it("does not throw when cleanupScheduledTaskStatus fails", () => {
			// Test: Error handling in cleanup - basic validation
			const env = new ProviderEnvironment(mockConfig, testPair);
			const mockDb = {
				cleanupScheduledTaskStatus: vi
					.fn()
					.mockRejectedValue(new Error("Cleanup failed")),
			} as any; // Partial mock for testing
			env.db = mockDb;

			expect(() => env.cleanup()).not.toThrow();
		});
	});
});
