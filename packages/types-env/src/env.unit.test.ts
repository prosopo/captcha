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

import type { Logger } from "@prosopo/common";
import type { Keyring } from "@prosopo/keyring";
import type { KeyringPair } from "@prosopo/types";
import type {
	AssetsResolver,
	EnvironmentTypes,
	ProsopoBasicConfigOutput,
	ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { describe, expect, test } from "vitest";
import type { ProsopoEnvironment } from "./env.js";
import type { ProviderEnvironment } from "./provider.js";

describe("ProsopoEnvironment interface", () => {
	test("interface defines all required properties", () => {
		const mockEnv: ProsopoEnvironment = {
			config: {} as ProsopoBasicConfigOutput,
			db: undefined,
			defaultEnvironment: "development" as EnvironmentTypes,
			logger: {} as Logger,
			assetsResolver: undefined,
			keyring: {} as Keyring,
			pair: undefined,
			authAccount: undefined,
			getDb: () => ({}) as IProviderDatabase,
			isReady: async () => {},
			importDatabase: async () => {},
		};

		expect(mockEnv.config).toBeDefined();
		expect(mockEnv.db).toBeUndefined();
		expect(mockEnv.defaultEnvironment).toBe("development");
		expect(mockEnv.logger).toBeDefined();
		expect(mockEnv.assetsResolver).toBeUndefined();
		expect(mockEnv.keyring).toBeDefined();
		expect(mockEnv.pair).toBeUndefined();
		expect(mockEnv.authAccount).toBeUndefined();
		expect(typeof mockEnv.getDb).toBe("function");
		expect(typeof mockEnv.isReady).toBe("function");
		expect(typeof mockEnv.importDatabase).toBe("function");
	});

	test("interface allows optional database and assetsResolver", () => {
		const mockEnv: ProsopoEnvironment = {
			config: {} as ProsopoBasicConfigOutput,
			db: {} as IProviderDatabase,
			defaultEnvironment: "development" as EnvironmentTypes,
			logger: {} as Logger,
			assetsResolver: {} as AssetsResolver,
			keyring: {} as Keyring,
			pair: {} as KeyringPair,
			authAccount: {} as KeyringPair,
			getDb: () => ({}) as IProviderDatabase,
			isReady: async () => {},
			importDatabase: async () => {},
		};

		expect(mockEnv.db).toBeDefined();
		expect(mockEnv.assetsResolver).toBeDefined();
		expect(mockEnv.pair).toBeDefined();
		expect(mockEnv.authAccount).toBeDefined();
	});

	test("getDb method returns IProviderDatabase", () => {
		const mockDb = {} as IProviderDatabase;
		const mockEnv: ProsopoEnvironment = {
			config: {} as ProsopoBasicConfigOutput,
			db: mockDb,
			defaultEnvironment: "development" as EnvironmentTypes,
			logger: {} as Logger,
			assetsResolver: undefined,
			keyring: {} as Keyring,
			pair: undefined,
			authAccount: undefined,
			getDb: () => mockDb,
			isReady: async () => {},
			importDatabase: async () => {},
		};

		const db = mockEnv.getDb();
		expect(db).toBe(mockDb);
	});

	test("isReady and importDatabase are async methods", () => {
		const mockEnv: ProsopoEnvironment = {
			config: {} as ProsopoBasicConfigOutput,
			db: undefined,
			defaultEnvironment: "development" as EnvironmentTypes,
			logger: {} as Logger,
			assetsResolver: undefined,
			keyring: {} as Keyring,
			pair: undefined,
			authAccount: undefined,
			getDb: () => ({}) as IProviderDatabase,
			isReady: async () => {},
			importDatabase: async () => {},
		};

		const isReadyResult = mockEnv.isReady();
		const importDatabaseResult = mockEnv.importDatabase();

		expect(isReadyResult).toBeInstanceOf(Promise);
		expect(importDatabaseResult).toBeInstanceOf(Promise);
	});
});

describe("ProviderEnvironment interface", () => {
	test("ProviderEnvironment extends ProsopoEnvironment", () => {
		const mockProviderEnv: ProviderEnvironment = {
			config: {} as ProsopoConfigOutput,
			db: undefined,
			defaultEnvironment: "development" as EnvironmentTypes,
			logger: {} as Logger,
			assetsResolver: undefined,
			keyring: {} as Keyring,
			pair: undefined,
			authAccount: undefined,
			getDb: () => ({}) as IProviderDatabase,
			isReady: async () => {},
			importDatabase: async () => {},
		};

		expect(mockProviderEnv.config).toBeDefined();
		expect(mockProviderEnv.defaultEnvironment).toBe("development");
		expect(mockProviderEnv.logger).toBeDefined();
		expect(mockProviderEnv.keyring).toBeDefined();
		expect(typeof mockProviderEnv.getDb).toBe("function");
		expect(typeof mockProviderEnv.isReady).toBe("function");
		expect(typeof mockProviderEnv.importDatabase).toBe("function");
	});

	test("ProviderEnvironment config is ProsopoConfigOutput", () => {
		const mockProviderEnv: ProviderEnvironment = {
			config: {} as ProsopoConfigOutput,
			db: undefined,
			defaultEnvironment: "development" as EnvironmentTypes,
			logger: {} as Logger,
			assetsResolver: undefined,
			keyring: {} as Keyring,
			pair: undefined,
			authAccount: undefined,
			getDb: () => ({}) as IProviderDatabase,
			isReady: async () => {},
			importDatabase: async () => {},
		};

		expect(mockProviderEnv.config).toBeDefined();
	});
});
