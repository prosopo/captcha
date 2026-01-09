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

import express from "express";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnv, main } from "../index.js";

// Store original environment and server instance
const originalEnv = process.env;
let server: ReturnType<ReturnType<typeof main>>;

describe("main integration", () => {
	beforeEach(() => {
		// Reset environment
		process.env = { ...originalEnv };
	});

	afterEach(async () => {
		process.env = originalEnv;
		if (server) {
			await new Promise((resolve) => server.close(resolve));
		}
	});

	it("should start server with configured static paths", async () => {
		// Create a temporary directory with a test file
		const tempDir = fs.mkdtempSync("/tmp/file-server-test-");
		const testFile = path.join(tempDir, "test.txt");
		fs.writeFileSync(testFile, "Hello World");

		try {
			process.env.PROSOPO_FILE_SERVER_PORT = "0"; // Use random port
			process.env.PROSOPO_FILE_SERVER_PATHS = JSON.stringify([tempDir]);
			process.env.PROSOPO_FILE_SERVER_REMOTES = "[]";
			process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
			process.env.PROSOPO_LOG_LEVEL = undefined;
			process.env.NODE_ENV = undefined;

			server = await main();

			// Get the actual port the server is listening on
			const address = server.address();
			const port = typeof address === "string" ? address : address?.port;

			expect(port).toBeDefined();

			// Make HTTP request to the server
			const response = await fetch(`http://localhost:${port}/test.txt`);
			expect(response.status).toBe(200);
			const content = await response.text();
			expect(content).toBe("Hello World");
		} finally {
			// Clean up
			fs.unlinkSync(testFile);
			fs.rmdirSync(tempDir);
		}
	});

	it("should proxy requests to remote servers", async () => {
		// Start a mock remote server
		const mockRemoteServer = await new Promise<ReturnType<ReturnType<typeof main>>>((resolve) => {
			const app = express();
			app.get("/remote-file.txt", (req: any, res: any) => {
				res.send("Remote content");
			});
			const server = app.listen(0, () => resolve(server));
		});

		try {
			const remoteAddress = mockRemoteServer.address();
			const remotePort = typeof remoteAddress === "string" ? remoteAddress : remoteAddress?.port;

			process.env.PROSOPO_FILE_SERVER_PORT = "0";
			process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
			process.env.PROSOPO_FILE_SERVER_REMOTES = JSON.stringify([`http://localhost:${remotePort}`]);
			process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
			process.env.PROSOPO_LOG_LEVEL = undefined;
			process.env.NODE_ENV = undefined;

			server = await main();

			const address = server.address();
			const port = typeof address === "string" ? address : address?.port;

			// Make HTTP request to the file server
			const response = await fetch(`http://localhost:${port}/remote-file.txt`);
			expect(response.status).toBe(200);
			const content = await response.text();
			expect(content).toBe("Remote content");
		} finally {
			await new Promise((resolve) => mockRemoteServer.close(resolve));
		}
	});

	it("should return 404 when file not found in paths or remotes", async () => {
		process.env.PROSOPO_FILE_SERVER_PORT = "0";
		process.env.PROSOPO_FILE_SERVER_PATHS = "[]";
		process.env.PROSOPO_FILE_SERVER_REMOTES = "[]";
		process.env.PROSOPO_FILE_SERVER_RESIZE = undefined;
		process.env.PROSOPO_LOG_LEVEL = undefined;
		process.env.NODE_ENV = undefined;

		server = await main();

		const address = server.address();
		const port = typeof address === "string" ? address : address?.port;

		const response = await fetch(`http://localhost:${port}/nonexistent.txt`);
		expect(response.status).toBe(404);
		const content = await response.text();
		expect(content).toBe("Not found");
	});
});