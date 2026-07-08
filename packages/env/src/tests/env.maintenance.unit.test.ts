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

const { mockProviderDatabase, mockIpInfoInit } = vi.hoisted(() => ({
	mockProviderDatabase: vi.fn(),
	mockIpInfoInit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@prosopo/database", () => ({
	ProviderDatabase: mockProviderDatabase,
}));

vi.mock("@prosopo/ipinfo", () => ({
	IpInfoService: vi.fn().mockImplementation(() => ({
		initialize: mockIpInfoInit,
	})),
}));

vi.mock("@prosopo/keyring", () => ({
	Keyring: vi.fn().mockImplementation(() => ({
		addPair: vi.fn((p) => p),
	})),
	getPair: vi.fn(() => ({
		address: "addr",
		isLocked: false,
		unlock: vi.fn(),
	})),
}));

import { Environment, isMaintenanceMode } from "../env.js";

const buildConfig = () => ({
	defaultEnvironment: "test",
	logLevel: "info",
	account: { secret: "//Alice", password: undefined },
	database: {
		test: {
			endpoint: "mongodb://127.0.0.1:27017",
			dbname: "test",
			authSource: "admin",
			type: "mongo",
		},
	},
	redisConnection: { url: "redis://localhost", password: "" },
	maxmindDbPath: undefined,
	ipApi: undefined,
});

const buildEnv = () => {
	const config = buildConfig();
	const env = new Environment(
		config as never,
		{
			address: "addr",
			isLocked: false,
			unlock: vi.fn(),
		} as never,
	);
	env.logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	} as never;
	return env;
};

describe("Environment.isReady — maintenance mode startup tolerance", () => {
	beforeEach(() => {
		mockProviderDatabase.mockReset();
		mockIpInfoInit.mockClear();
		process.env.MAINTENANCE_MODE = undefined;
	});

	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});

	it("throws when DB connect fails and maintenance mode is off", async () => {
		mockProviderDatabase.mockImplementation(() => ({
			connect: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
			connected: false,
			connection: { readyState: 0 },
		}));

		const env = buildEnv();
		await expect(env.isReady()).rejects.toMatchObject({
			translationKey: "GENERAL.ENVIRONMENT_NOT_READY",
		});
	});

	it("creates the DB handle and connects in the background when maintenance mode is on", async () => {
		process.env.MAINTENANCE_MODE = "true";
		const connect = vi.fn().mockResolvedValue(undefined);
		mockProviderDatabase.mockImplementation(() => ({
			connect,
			connected: false,
			connection: { readyState: 0 },
		}));

		const env = buildEnv();
		await env.isReady();

		expect(env.ready).toBe(true);
		// The handle IS created (and connecting) so admin endpoints — which need
		// a DB even during maintenance — keep working. The captcha path stays
		// DB-free via per-handler short-circuits, not by leaving env.db unset.
		expect(mockProviderDatabase).toHaveBeenCalledTimes(1);
		expect(connect).toHaveBeenCalledTimes(1);
		expect(env.db).toBeDefined();
		expect(mockIpInfoInit).toHaveBeenCalled();
	});

	it("does not gate boot when the background DB connect fails in maintenance mode", async () => {
		process.env.MAINTENANCE_MODE = "true";
		const connect = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
		mockProviderDatabase.mockImplementation(() => ({
			connect,
			connected: false,
			connection: { readyState: 0 },
		}));

		const env = buildEnv();
		// Unlike the maintenance-off path, a failing connect must NOT reject
		// isReady() — the connection is fire-and-forget in the background.
		await expect(env.isReady()).resolves.toBeUndefined();
		expect(env.ready).toBe(true);
		expect(env.db).toBeDefined();
		expect(connect).toHaveBeenCalledTimes(1);
		// Flush the background rejection so its .catch handler runs within the
		// test rather than surfacing as an unhandled rejection afterwards.
		await Promise.resolve();
		expect(env.logger.warn).toHaveBeenCalled();
	});

	it("still completes the normal connect path when Mongo is up", async () => {
		const connect = vi.fn().mockResolvedValue(undefined);
		mockProviderDatabase.mockImplementation(() => ({
			connect,
			connected: true,
			connection: { readyState: 1 },
		}));

		const env = buildEnv();
		await env.isReady();
		expect(env.ready).toBe(true);
		expect(connect).toHaveBeenCalled();
	});
});

describe("isMaintenanceMode", () => {
	afterEach(() => {
		process.env.MAINTENANCE_MODE = undefined;
	});

	it("returns true when MAINTENANCE_MODE=true", () => {
		process.env.MAINTENANCE_MODE = "true";
		expect(isMaintenanceMode()).toBe(true);
	});

	it("is case-insensitive", () => {
		process.env.MAINTENANCE_MODE = "TRUE";
		expect(isMaintenanceMode()).toBe(true);
	});

	it("returns false when unset", () => {
		expect(isMaintenanceMode()).toBe(false);
	});

	it("returns false for any non-`true` value", () => {
		process.env.MAINTENANCE_MODE = "false";
		expect(isMaintenanceMode()).toBe(false);
		process.env.MAINTENANCE_MODE = "1";
		expect(isMaintenanceMode()).toBe(false);
	});
});
