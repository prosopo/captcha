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
import type { ProviderDatabase } from "@prosopo/database";
import type { GeolocationService } from "@prosopo/env";
import type { Keyring } from "@prosopo/keyring";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { vi } from "vitest";

/**
 * Creates a comprehensive mock for the ProviderEnvironment
 * This allows testing of complex middleware and API functions without requiring
 * full infrastructure setup (databases, Redis, external services)
 */
export function createMockProviderEnvironment(): ProviderEnvironment {
	// Mock logger
	const mockLogger: Logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		with: vi.fn().mockReturnThis(),
	} as unknown as Logger;

	// Mock database storages
	const mockUserAccessRulesStorage = {
		get: vi.fn(),
		getAll: vi.fn(),
		store: vi.fn(),
		remove: vi.fn(),
		count: vi.fn(),
		getByUser: vi.fn(),
		incrementAccessCount: vi.fn(),
		checkRateLimit: vi.fn(),
		storeRateLimitData: vi.fn(),
	};

	// Mock database
	const mockDatabase: ProviderDatabase = {
		connect: vi.fn(),
		getUserAccessRulesStorage: vi
			.fn()
			.mockReturnValue(mockUserAccessRulesStorage),
	} as unknown as ProviderDatabase;

	// Mock configuration
	const mockConfig = {
		logLevel: "info",
		server: {
			port: 9229,
			host: "localhost",
		},
		database: {
			development: {
				type: "mongodb" as const,
				endpoint: "mongodb://localhost:27017",
				dbname: "prosopo_test",
				authSource: "admin",
			},
		},
		redisConnection: {
			url: "redis://localhost:6379",
			password: "test",
			indexName: "test",
		},
		captcha: {
			solved: {
				count: 2,
			},
			unsolved: {
				count: 1,
			},
		},
		assets: {
			path: "/tmp/test-assets",
		},
		prosopo: {
			contract: {
				address: "test-contract-address",
				account: {
					address: "test-account-address",
					secret: "test-secret",
				},
			},
			database: {
				development: {
					type: "mongodb" as const,
					endpoint: "mongodb://localhost:27017",
					dbname: "prosopo_test",
					authSource: "admin",
				},
			},
		},
		tasks: {
			queues: {
				imageCaptcha: "image-captcha-queue",
				powCaptcha: "pow-captcha-queue",
			},
		},
	} as unknown as ProsopoConfigOutput;

	// Mock keyring pair
	const mockPair = {
		address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		publicKey: new Uint8Array(32),
		sign: vi.fn(),
		verify: vi.fn(),
	} as unknown as KeyringPair;

	// Mock keyring
	const mockKeyring = {
		addFromUri: vi.fn().mockReturnValue(mockPair),
		addFromSeed: vi.fn().mockReturnValue(mockPair),
		getPairs: vi.fn().mockReturnValue([mockPair]),
		getPair: vi.fn().mockReturnValue(mockPair),
	} as unknown as Keyring;

	// Mock geolocation service
	const mockGeolocationService = {
		initialize: vi.fn().mockResolvedValue(undefined),
		getCountryCode: vi.fn().mockResolvedValue("US"),
		isAvailable: vi.fn().mockReturnValue(true),
	} as unknown as GeolocationService;

	// Create the mock environment
	const mockEnv: ProviderEnvironment = {
		config: mockConfig,
		logger: mockLogger,
		db: mockDatabase,
		pair: mockPair,
		keyring: mockKeyring,
		defaultEnvironment: "development" as const,
		assetsResolver: undefined,
		authAccount: mockPair,
		geolocationService: mockGeolocationService,
		getDb: vi.fn().mockReturnValue(mockDatabase),
		isReady: vi.fn().mockResolvedValue(undefined),
		importDatabase: vi.fn().mockResolvedValue(undefined),
	};

	return mockEnv;
}

/**
 * Creates mock Express request/response objects for middleware testing
 */
export function createMockExpressObjects() {
	const mockReq = {
		headers: {},
		body: {},
		query: {},
		params: {},
		ip: "127.0.0.1",
		originalUrl: "/",
		method: "GET",
		url: "/",
		path: "/",
	};

	const mockRes = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
		setHeader: vi.fn().mockReturnThis(),
		getHeader: vi.fn(),
		end: vi.fn(),
		locals: {},
	};

	const mockNext = vi.fn();

	return { mockReq, mockRes, mockNext };
}
