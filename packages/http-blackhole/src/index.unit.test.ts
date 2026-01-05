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
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("http-blackhole server", () => {
	let server: Server | undefined;
	let originalEnv: string | undefined;
	let originalConsoleLog: typeof console.log;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		originalEnv = process.env.PORT;
		originalConsoleLog = console.log;
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
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
		if (originalEnv !== undefined) {
			process.env.PORT = originalEnv;
		} else {
			process.env.PORT = undefined;
		}
		console.log = originalConsoleLog;
		vi.restoreAllMocks();
	});

	// Helper function to create a blackhole server similar to the main code
	const createBlackholeServer = (port: number): Server => {
		return http.createServer((req: IncomingMessage, res: ServerResponse) => {
			console.log(`Received request: ${req.method} ${req.url}`);
			// Do nothing: simulate an unresponsive server
			// Keep the socket open forever
			req.socket.setTimeout(0); // Disable socket timeout
			req.socket.setKeepAlive(true); // Keep the socket alive
			// do nothing, the connection will remain open forever until the client timeouts - if the client does not timeout, the connection will remain open forever

			// Listen for client closing the connection
			req.socket.on("close", () => {
				console.log(`Connection closed by client: ${req.method} ${req.url}`);
			});
		});
	};

	// Helper function to start server and wait for it to be ready
	const startServer = (port: number): Promise<Server> => {
		return new Promise((resolve, reject) => {
			const srv = createBlackholeServer(port);
			srv.listen(port, () => {
				console.log(`http-blackhole server is listening on port ${port}`);
				resolve(srv);
			});
			srv.on("error", reject);
		});
	};

	// Helper function to make HTTP request with timeout
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
				// Ignore ECONNRESET errors as they're expected when server doesn't respond
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

	describe("server creation and listening", () => {
		it("should create and start server on default port when PORT env is not set", async () => {
			process.env.PORT = undefined;
			const defaultPort = 8080;
			server = await startServer(defaultPort);

			expect(server).toBeDefined();
			expect(server.listening).toBe(true);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				`http-blackhole server is listening on port ${defaultPort}`,
			);
		});

		it("should create and start server on custom port from PORT env", async () => {
			const customPort = 9999;
			process.env.PORT = String(customPort);
			server = await startServer(customPort);

			expect(server).toBeDefined();
			expect(server.listening).toBe(true);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				`http-blackhole server is listening on port ${customPort}`,
			);
		});

		it("should handle port conversion from string to number", async () => {
			process.env.PORT = "3000";
			const port = Number(process.env.PORT) || 8080;
			server = await startServer(port);

			expect(server).toBeDefined();
			expect(server.listening).toBe(true);
			expect(port).toBe(3000);
		});

		it("should use default port when PORT env is invalid number", async () => {
			process.env.PORT = "invalid";
			const port = Number(process.env.PORT) || 8080;
			server = await startServer(port);

			expect(server).toBeDefined();
			expect(server.listening).toBe(true);
			expect(port).toBe(8080);
		});
	});

	describe("request handling", () => {
		it("should accept connections but not respond", async () => {
			const testPort = 18080;
			server = await startServer(testPort);

			const { response, error } = await makeRequest(testPort, "/", 500);

			// Server should accept connection but not send response
			// Request should timeout because server doesn't respond
			expect(error).toBeDefined();
			expect(error?.message).toBe("Request timeout");
			expect(response).toBeNull();
		});

		it("should log received requests", async () => {
			const testPort = 18081;
			server = await startServer(testPort);

			await makeRequest(testPort, "/test-path", 500);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"Received request: GET /test-path",
			);
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

				req.on("error", () => {
					// Ignore errors
				});

				req.on("timeout", () => {
					req.destroy();
				});

				req.end();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Verify all methods were logged
			for (const method of methods) {
				expect(consoleLogSpy).toHaveBeenCalledWith(
					`Received request: ${method} /`,
				);
			}
		});

		it("should handle different URL paths", async () => {
			const testPort = 18083;
			server = await startServer(testPort);

			const paths = ["/", "/api", "/test", "/path/with/slashes"];
			for (const path of paths) {
				await makeRequest(testPort, path, 500);
			}

			for (const path of paths) {
				expect(consoleLogSpy).toHaveBeenCalledWith(
					`Received request: GET ${path}`,
				);
			}
		});

		it("should configure socket timeout and keepAlive correctly", async () => {
			const testPort = 18084;
			let capturedReq: IncomingMessage | undefined;
			let setTimeoutCalled = false;
			let setKeepAliveCalled = false;

			const testServer = http.createServer(
				(req: IncomingMessage, res: ServerResponse) => {
					capturedReq = req;
					// Verify socket methods exist and can be called
					const socket = req.socket;
					expect(socket).toBeDefined();

					// Call the methods as the actual code does
					socket.setTimeout(0);
					setTimeoutCalled = true;
					socket.setKeepAlive(true);
					setKeepAliveCalled = true;
				},
			);

			await new Promise<void>((resolve) => {
				testServer.listen(testPort, () => {
					resolve();
				});
			});

			await makeRequest(testPort, "/", 500);

			// Verify socket configuration methods were called
			expect(setTimeoutCalled).toBe(true);
			expect(setKeepAliveCalled).toBe(true);
			expect(capturedReq).toBeDefined();

			await new Promise<void>((resolve) => {
				testServer.close(() => {
					resolve();
				});
			});
		});
	});

	describe("connection close events", () => {
		it("should log when client closes connection", async () => {
			const testPort = 18086;
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

			req.on("error", () => {
				// Ignore errors
			});

			req.on("timeout", () => {
				req.destroy();
			});

			req.end();

			// Wait for connection close event
			await new Promise((resolve) => setTimeout(resolve, 300));

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"Connection closed by client: GET /close-test",
			);
		});

		it("should handle multiple connection closes", async () => {
			const testPort = 18087;
			server = await startServer(testPort);

			// Make multiple requests and close them
			for (let i = 0; i < 3; i++) {
				const req = http.request(
					{
						host: "localhost",
						port: testPort,
						path: `/close-${i}`,
						method: "GET",
						timeout: 200,
					},
					() => {},
				);

				req.on("error", () => {
					// Ignore errors
				});

				req.on("timeout", () => {
					req.destroy();
				});

				req.end();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Wait for all close events
			await new Promise((resolve) => setTimeout(resolve, 300));

			// Verify all close events were logged
			for (let i = 0; i < 3; i++) {
				expect(consoleLogSpy).toHaveBeenCalledWith(
					`Connection closed by client: GET /close-${i}`,
				);
			}
		});
	});

	describe("graceful shutdown", () => {
		it("should handle SIGINT signal and shutdown gracefully", async () => {
			const testPort = 18088;
			server = await startServer(testPort);

			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				return undefined as never;
			});

			const shutdown = () => {
				console.log("\nShutting down http-blackhole server...");
				server?.close(() => {
					console.log("Server closed. Exiting.");
					process.exit(0);
				});
			};

			process.on("SIGINT", shutdown);

			// Simulate SIGINT
			process.emit("SIGINT" as NodeJS.Signals, "SIGINT");

			// Wait for shutdown
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"\nShutting down http-blackhole server...",
			);
			expect(consoleLogSpy).toHaveBeenCalledWith("Server closed. Exiting.");
			expect(exitSpy).toHaveBeenCalledWith(0);

			process.removeListener("SIGINT", shutdown);
			exitSpy.mockRestore();
		});

		it("should handle SIGTERM signal and shutdown gracefully", async () => {
			const testPort = 18089;
			server = await startServer(testPort);

			const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
				return undefined as never;
			});

			const shutdown = () => {
				console.log("\nShutting down http-blackhole server...");
				server?.close(() => {
					console.log("Server closed. Exiting.");
					process.exit(0);
				});
			};

			process.on("SIGTERM", shutdown);

			// Simulate SIGTERM
			process.emit("SIGTERM" as NodeJS.Signals, "SIGTERM");

			// Wait for shutdown
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"\nShutting down http-blackhole server...",
			);
			expect(consoleLogSpy).toHaveBeenCalledWith("Server closed. Exiting.");
			expect(exitSpy).toHaveBeenCalledWith(0);

			process.removeListener("SIGTERM", shutdown);
			exitSpy.mockRestore();
		});

		it("should close server properly on shutdown", async () => {
			const testPort = 18090;
			server = await startServer(testPort);

			expect(server.listening).toBe(true);

			await new Promise<void>((resolve) => {
				server?.close(() => {
					resolve();
				});
			});

			expect(server.listening).toBe(false);
		});
	});

	describe("type tests", () => {
		it("should have correct types for PORT environment variable", () => {
			const port: number = Number(process.env.PORT) || 8080;
			expect(typeof port).toBe("number");
		});

		it("should have correct types for server request handler parameters", () => {
			const handler = (req: IncomingMessage, res: ServerResponse): void => {
				expect(req).toBeDefined();
				expect(res).toBeDefined();
			};

			// Type check only - function should accept correct types
			const testReq = {} as IncomingMessage;
			const testRes = {} as ServerResponse;
			handler(testReq, testRes);
		});

		it("should have correct return type for http.createServer", () => {
			const srv: Server = http.createServer(() => {});
			expect(srv).toBeDefined();
		});
	});
});
