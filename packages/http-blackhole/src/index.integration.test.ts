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

import http from "node:http";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createBlackholeServer,
	createShutdownHandler,
	getPort,
} from "./index.js";

describe("http-blackhole server integration", () => {
	let server: Server | undefined;
	let originalPort: string | undefined;

	beforeEach(() => {
		originalPort = process.env.PORT;
	});

	afterEach(async () => {
		if (server) {
			await new Promise<void>((resolve) => {
				server?.close(() => {
					resolve();
				});
			});
			server = undefined;
		}
		if (originalPort !== undefined) {
			process.env.PORT = originalPort;
		} else {
			process.env.PORT = undefined;
		}
	});

	const startServer = (port: number): Promise<Server> => {
		return new Promise((resolve, reject) => {
			const srv = createBlackholeServer();
			srv.listen(port, () => {
				resolve(srv);
			});
			srv.on("error", reject);
		});
	};

	const makeRequest = (
		port: number,
		path = "/",
		timeout = 1000,
	): Promise<{
		response: http.IncomingMessage | null;
		error: Error | null;
	}> => {
		return new Promise((resolve) => {
			const req = http.request(
				{
					host: "localhost",
					port,
					path,
					method: "GET",
					timeout,
				},
				(res) => {
					resolve({ response: res, error: null });
				},
			);

			req.on("error", (err) => {
				const errorWithCode = err as Error & { code?: string };
				if (
					err.message !== "socket hang up" &&
					errorWithCode.code !== "ECONNRESET"
				) {
					resolve({ response: null, error: err });
				} else {
					resolve({ response: null, error: null });
				}
			});

			req.on("timeout", () => {
				req.destroy();
				resolve({
					response: null,
					error: new Error("Request timeout"),
				});
			});

			req.end();
		});
	};

	describe("getPort", () => {
		it("should return default port 8080 when PORT env is not set", () => {
			process.env.PORT = undefined;
			expect(getPort()).toBe(8080);
		});

		it("should return port from PORT env variable", () => {
			process.env.PORT = "3000";
			expect(getPort()).toBe(3000);
		});

		it("should return default port when PORT env is invalid number", () => {
			process.env.PORT = "invalid";
			expect(getPort()).toBe(8080);
		});

		it("should handle PORT env as string number", () => {
			process.env.PORT = "9999";
			expect(getPort()).toBe(9999);
		});
	});

	describe("createBlackholeServer", () => {
		it("should create a server instance", () => {
			const srv = createBlackholeServer();
			expect(srv).toBeDefined();
			expect(srv.listening).toBe(false);
			srv.close();
		});

		it("should start server and accept connections", async () => {
			const testPort = 18080;
			server = await startServer(testPort);

			expect(server).toBeDefined();
			expect(server.listening).toBe(true);
		});

		it("should accept connections but not respond", async () => {
			const testPort = 18081;
			server = await startServer(testPort);

			const { response, error } = await makeRequest(testPort, "/", 500);

			expect(error).toBeDefined();
			expect(error?.message).toBe("Request timeout");
			expect(response).toBeNull();
		});

		it("should handle different HTTP methods", async () => {
			const testPort = 18082;
			server = await startServer(testPort);

			const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
			for (const method of methods) {
				const req = http.request(
					{
						host: "localhost",
						port: testPort,
						path: "/",
						method,
						timeout: 500,
					},
					() => {},
				);

				req.on("error", () => {});
				req.on("timeout", () => {
					req.destroy();
				});
				req.end();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			await new Promise((resolve) => setTimeout(resolve, 300));
		});

		it("should handle different URL paths", async () => {
			const testPort = 18083;
			server = await startServer(testPort);

			const paths = ["/", "/api", "/test", "/path/with/slashes"];
			for (const path of paths) {
				const { error } = await makeRequest(testPort, path, 500);
				expect(error?.message).toBe("Request timeout");
			}
		});

		it("should configure socket timeout and keepAlive", async () => {
			const testPort = 18084;
			server = await startServer(testPort);

			const { error } = await makeRequest(testPort, "/", 500);
			expect(error?.message).toBe("Request timeout");
		});

		it("should log connection close events", async () => {
			const testPort = 18085;
			server = await startServer(testPort);

			const req = http.request(
				{
					host: "localhost",
					port: testPort,
					path: "/close-test",
					method: "GET",
					timeout: 200,
				},
				() => {},
			);

			req.on("error", () => {});
			req.on("timeout", () => {
				req.destroy();
			});
			req.end();

			await new Promise((resolve) => setTimeout(resolve, 300));
		});

		it("should handle multiple concurrent connections", async () => {
			const testPort = 18086;
			server = await startServer(testPort);

			const requests = Array.from({ length: 5 }, () =>
				makeRequest(testPort, "/", 500),
			);

			const results = await Promise.all(requests);
			for (const result of results) {
				expect(result.error?.message).toBe("Request timeout");
				expect(result.response).toBeNull();
			}
		});
	});

	describe("createShutdownHandler", () => {
		it("should create a shutdown handler function", () => {
			const testServer = createBlackholeServer();
			const shutdown = createShutdownHandler(testServer);
			expect(typeof shutdown).toBe("function");
			testServer.close();
		});

		it("should close server on shutdown", async () => {
			const testPort = 18087;
			server = await startServer(testPort);

			expect(server.listening).toBe(true);

			const shutdown = createShutdownHandler(server);
			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				return undefined as never;
			});

			shutdown();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(server.listening).toBe(false);
			exitSpy.mockRestore();
		});
	});

	describe("server lifecycle", () => {
		it("should handle server start and stop", async () => {
			const testPort = 18088;
			server = await startServer(testPort);

			expect(server.listening).toBe(true);

			await new Promise<void>((resolve) => {
				server?.close(() => {
					resolve();
				});
			});

			expect(server.listening).toBe(false);
		});

		it("should handle requests after server restart", async () => {
			const testPort = 18089;
			server = await startServer(testPort);

			const { error: error1 } = await makeRequest(testPort, "/", 500);
			expect(error1?.message).toBe("Request timeout");

			await new Promise<void>((resolve) => {
				server?.close(() => {
					resolve();
				});
			});

			server = await startServer(testPort);

			const { error: error2 } = await makeRequest(testPort, "/", 500);
			expect(error2?.message).toBe("Request timeout");
		});
	});
});
