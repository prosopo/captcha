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

import type http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The entrypoint only runs its body when the module is the process entrypoint,
// which never holds under vitest. Force the guard so the branch is exercised.
vi.mock("@prosopo/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/util")>();
	return { ...actual, isMain: (): boolean => true };
});

const servers: http.Server[] = [];

/** Capture the server main() starts so the test can shut it down again. */
vi.mock("../fileServer.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../fileServer.js")>();
	return {
		...actual,
		main: async (): Promise<http.Server> => {
			const server = await actual.main();
			servers.push(server);
			return server;
		},
	};
});

let envSnapshot: NodeJS.ProcessEnv;

beforeEach(() => {
	envSnapshot = { ...process.env };
	// Port 0 gets an ephemeral port, so the test never collides with a real one.
	process.env.PROSOPO_FILE_SERVER_PORT = "0";
	process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
	process.env.PROSOPO_FILE_SERVER_REMOTES = "[]";
	vi.resetModules();
});

afterEach(async () => {
	for (const server of servers.splice(0)) {
		await new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	}
	for (const key of Object.keys(process.env)) {
		delete process.env[key];
	}
	Object.assign(process.env, envSnapshot);
	vi.restoreAllMocks();
});

describe("index entrypoint", () => {
	it("starts the server when run as the main module", async () => {
		await import("../index.js");
		// The import kicks off main() without awaiting it, so let it settle.
		await vi.waitFor(() => {
			expect(servers).toHaveLength(1);
		});

		expect(servers[0]?.listening).toBe(true);
	});

	it("re-exports the file server module", async () => {
		const module = await import("../index.js");

		expect(typeof module.createApp).toBe("function");
		expect(typeof module.getEnv).toBe("function");
	});
});
