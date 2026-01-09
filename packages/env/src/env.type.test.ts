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

import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { ProsopoEnvironment } from "@prosopo/types-env";
import { describe, expect, it } from "vitest";
import { Environment } from "./env.js";
import { ProviderEnvironment } from "./provider.js";

/**
 * Type tests to ensure Environment classes properly implement interfaces
 * and have correct type relationships
 */
describe("Environment Type Tests", () => {
	it("Environment should implement ProsopoEnvironment interface", () => {
		// Test: Environment class should satisfy ProsopoEnvironment type
		const mockConfig = {
			logLevel: "info",
			defaultEnvironment: "development",
			account: {
				secret: "test-secret",
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

		const env = new Environment(mockConfig);

		// Test: Environment should be assignable to ProsopoEnvironment
		const prosopoEnv: ProsopoEnvironment = env;
		expect(prosopoEnv).toBe(env);

		// Test: Environment should have all required ProsopoEnvironment properties
		expect(prosopoEnv.config).toBeDefined();
		expect(typeof prosopoEnv.isReady).toBe("function");
	});

	it("ProviderEnvironment should extend Environment", () => {
		// Test: ProviderEnvironment should be assignable to Environment
		const mockConfig = {
			logLevel: "info",
			defaultEnvironment: "development",
			account: {
				secret: "test-secret",
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

		const providerEnv = new ProviderEnvironment(mockConfig);

		// Test: ProviderEnvironment should be assignable to Environment
		const baseEnv: Environment = providerEnv;
		expect(baseEnv).toBe(providerEnv);

		// Test: ProviderEnvironment should be assignable to ProsopoEnvironment
		const prosopoEnv: ProsopoEnvironment = providerEnv;
		expect(prosopoEnv).toBe(providerEnv);
	});

	it("Environment constructor parameters should have correct types", () => {
		// Test: Constructor should accept proper parameter types
		const mockConfig = {
			logLevel: "info",
			defaultEnvironment: "development",
			account: {
				secret: "test-secret",
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

		const mockPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
			publicKey: new Uint8Array(32),
			meta: {},
			isLocked: false,
			lock: () => {},
			unlock: () => {},
		} as KeyringPair;

		// Test: Should accept config only
		const env1 = new Environment(mockConfig);
		expect(env1).toBeDefined();

		// Test: Should accept config and pair
		const env2 = new Environment(mockConfig, mockPair);
		expect(env2).toBeDefined();

		// Test: Should accept config, pair, and auth account
		const env3 = new Environment(mockConfig, mockPair, mockPair);
		expect(env3).toBeDefined();
	});

	it("Environment properties should have correct types", () => {
		// Test: Environment instance properties should have expected types
		const mockConfig = {
			logLevel: "info",
			defaultEnvironment: "development",
			account: {
				secret: "test-secret",
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

		const env = new Environment(mockConfig);

		// Test: Properties should have correct types
		expect(typeof env.config).toBe("object");
		expect(typeof env.defaultEnvironment).toBe("string");
		expect(typeof env.logger).toBe("object");
		expect(typeof env.keyring).toBe("object");
		expect(typeof env.envId).toBe("string");
		expect(typeof env.ready).toBe("boolean");

		// Test: Optional properties should be correct type or undefined
		expect(env.db === undefined || typeof env.db === "object").toBe(true);
		expect(env.pair === undefined || typeof env.pair === "object").toBe(true);
		expect(
			env.authAccount === undefined || typeof env.authAccount === "object",
		).toBe(true);
		expect(
			env.assetsResolver === undefined ||
				typeof env.assetsResolver === "object",
		).toBe(true);
	});
});
