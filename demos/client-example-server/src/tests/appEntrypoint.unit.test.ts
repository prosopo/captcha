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

import type { Server } from "node:http";
import type { ProsopoServerConfigOutput } from "@prosopo/types";
import express from "express";
import type { Connection } from "mongoose";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { serverConfig } from "./authHarness.js";

/**
 * Importing app.js as the process entrypoint: isMain is forced true so the
 * module's boot block runs, with every external dependency stubbed.
 */
const mocks = vi.hoisted(() => ({
	isMain: true,
	servers: [] as Server[],
	connectionThrows: undefined as Error | undefined,
	config: {} as ProsopoServerConfigOutput,
}));

vi.mock("@prosopo/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/util")>();
	return {
		...actual,
		isMain: () => mocks.isMain,
	};
});

vi.mock("../utils/connection.js", () => ({
	default: (): Connection => {
		if (mocks.connectionThrows) throw mocks.connectionThrows;
		return {} as unknown as Connection;
	},
}));

vi.mock("../utils/database.js", () => ({
	default: () => Promise.resolve("mongodb://memory:27017/"),
}));

vi.mock("../routes/routes.js", () => ({
	default: () => express.Router(),
}));

vi.mock("@prosopo/server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/server")>();
	return { ...actual, getServerConfig: () => mocks.config };
});

vi.mock("@prosopo/dotenv", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/dotenv")>();
	return { ...actual, loadEnv: () => undefined };
});

/**
 * Loads app.js afresh and hands back the server it opened, if any. The module
 * boots on import, so each case needs its own module registry.
 */
const importApp = async (
	options: { expectServer?: boolean } = {},
): Promise<Server | undefined> => {
	vi.resetModules();
	const listeners: Server[] = [];
	const httpModule = await import("node:http");
	const httpsModule = await import("node:https");
	const createServer = httpModule.default.createServer;
	vi.spyOn(httpModule.default, "createServer").mockImplementation(
		(...args: Parameters<typeof createServer>) => {
			const server = createServer(...args);
			listeners.push(server);
			mocks.servers.push(server);
			return server;
		},
	);
	// startServer prefers HTTPS whenever dev certificates happen to be on
	// disk, so both factories have to be watched — otherwise the assertion
	// depends on whether ./setup_certs.sh has been run.
	const createSecureServer = httpsModule.default.createServer;
	vi.spyOn(httpsModule.default, "createServer").mockImplementation(
		(...args: Parameters<typeof createSecureServer>) => {
			const server = createSecureServer(...args);
			listeners.push(server);
			mocks.servers.push(server);
			return server;
		},
	);
	await import("../app.js");
	// The boot block is fire-and-forget, so wait for its promise chain. How
	// many turns that takes depends on the machine, so poll rather than
	// assume a fixed number of ticks.
	for (let attempt = 0; attempt < 100; attempt++) {
		await new Promise((resolve) => setImmediate(resolve));
		if (!options.expectServer) break;
		if (listeners[0]?.listening) break;
	}
	return listeners[0];
};

beforeEach(() => {
	mocks.isMain = true;
	mocks.connectionThrows = undefined;
	mocks.config = { ...serverConfig(), serverUrl: "https://localhost:0" };
	process.env.NODE_ENV = "test";
	process.env.MONGO_URI = "mongodb://configured:27017/";
});

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(
		mocks.servers.splice(0).map(
			(server) =>
				new Promise<void>((resolve) => {
					server.close(() => resolve());
				}),
		),
	);
});

describe("running app.js as the entrypoint", () => {
	test("boots the server", async () => {
		const server = await importApp({ expectServer: true });
		expect(server?.listening).toBe(true);
	});

	test("stays quiet when the module is merely imported", async () => {
		// A test, or another entrypoint reusing createApp, must not end up
		// opening a port or spinning up mongo.
		mocks.isMain = false;
		const server = await importApp();
		expect(server).toBeUndefined();
	});

	test("exits when the server cannot start", async () => {
		mocks.connectionThrows = new Error("mongo unreachable");
		const exit = vi
			.spyOn(process, "exit")
			.mockImplementation((): never => undefined as never);
		await importApp();
		expect(exit).toHaveBeenCalledTimes(1);
		// A zero status would tell a supervisor the process shut down cleanly.
		expect(exit).toHaveBeenCalledWith(1);
	});
});
