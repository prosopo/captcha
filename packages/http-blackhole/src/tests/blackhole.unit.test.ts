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

// Testing strategy: exercise the real node:http and node:net implementations
// rather than mocking them, so the tests pin actual socket/server semantics
// (in particular that shutdown must sever held-open connections). Fakes
// are used only for the two injected seams — the logger and the exit fn — so
// tests can assert on output without touching the console or killing the
// runner.

import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_PORT,
	type Exit,
	InvalidPortError,
	type Logger,
	MAX_PORT,
	type RecordRequest,
	createBlackholeServer,
	createRequestLog,
	createShutdown,
	describeRequest,
	handleRequest,
	resolvePort,
} from "../blackhole.js";

/** Logger that records everything written to it. */
const createRecordingLogger = (): Logger & { messages: string[] } => {
	const messages: string[] = [];
	return {
		messages,
		log: (message: string): void => {
			messages.push(message);
		},
	};
};

/** A real, unconnected socket — enough for the handler's socket calls. */
const createSocket = (): net.Socket => new net.Socket();

/**
 * Run a garbage collection. `--expose-gc` is added to NODE_OPTIONS by this
 * package's `test` script in package.json, not by vite.test.config.ts — vitest
 * does not forward execArgv to its pool workers. Running this file directly
 * with a bare `vitest` will therefore fail here; without gc the weakness of the
 * request log cannot be observed, so fail loudly rather than quietly skipping
 * the assertion it underpins.
 */
const forceGc = (): void => {
	const gc: (() => void) | undefined = globalThis.gc;
	if (undefined === gc) {
		throw new Error(
			"gc is not exposed; run this suite via `npm run test` in packages/http-blackhole, which sets NODE_OPTIONS=--expose-gc",
		);
	}
	gc();
};

const createRequest = (
	socket: net.Socket,
	method: string | undefined,
	url: string | undefined,
): http.IncomingMessage => {
	const req = new http.IncomingMessage(socket);
	req.method = method;
	req.url = url;
	return req;
};

/** Servers/sockets opened by a test, torn down afterwards. */
const openServers: http.Server[] = [];
const openSockets: net.Socket[] = [];

const listen = async (server: http.Server): Promise<number> => {
	openServers.push(server);
	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", resolve);
	});
	const address: string | AddressInfo | null = server.address();
	if (address === null || typeof address === "string") {
		throw new Error("expected a TCP address");
	}
	return address.port;
};

/** Connect and send a request, resolving once the bytes are on the wire. */
const sendRequest = async (
	port: number,
	rawRequest: string,
): Promise<net.Socket> => {
	const socket: net.Socket = net.connect(port, "127.0.0.1");
	openSockets.push(socket);
	await new Promise<void>((resolve, reject) => {
		socket.once("connect", resolve);
		socket.once("error", reject);
	});
	await new Promise<void>((resolve, reject) => {
		socket.write(rawRequest, (error?: Error | null) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
	return socket;
};

/** Wait until `predicate` holds, or give up after `timeoutMs`. */
const waitFor = async (
	predicate: () => boolean,
	timeoutMs = 2000,
): Promise<boolean> => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (predicate()) {
			return true;
		}
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 10);
		});
	}
	return predicate();
};

afterEach(async () => {
	// Restore first: a test that stubbed server.close() would otherwise leave
	// the teardown below waiting forever on a callback that never fires.
	vi.restoreAllMocks();
	for (const socket of openSockets.splice(0)) {
		socket.destroy();
	}
	for (const server of openServers.splice(0)) {
		server.closeAllConnections();
		await new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	}
});

describe("resolvePort", () => {
	it("returns the default when PORT is unset", () => {
		expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
	});

	it("returns the default for an empty string", () => {
		expect(resolvePort("")).toBe(DEFAULT_PORT);
	});

	it("returns the default for a whitespace-only value", () => {
		expect(resolvePort("   ")).toBe(DEFAULT_PORT);
	});

	it("parses a plain numeric port", () => {
		expect(resolvePort("3000")).toBe(3000);
	});

	it("tolerates surrounding whitespace", () => {
		expect(resolvePort(" 3000 ")).toBe(3000);
	});

	it("throws on a non-numeric value rather than silently defaulting", () => {
		expect(() => resolvePort("abc")).toThrow(InvalidPortError);
		expect(() => resolvePort("8080abc")).toThrow(InvalidPortError);
	});

	it("names the offending value in the error", () => {
		expect(() => resolvePort("abc")).toThrow(
			'Invalid PORT "abc": expected a whole number between 0 and 65535',
		);
	});

	it("honours PORT=0 as a request for any free port", () => {
		expect(resolvePort("0")).toBe(0);
	});

	it("throws on an out-of-range port", () => {
		expect(() => resolvePort("-1")).toThrow(InvalidPortError);
		expect(() => resolvePort("99999")).toThrow(InvalidPortError);
	});

	it("accepts the range boundary", () => {
		expect(resolvePort(String(MAX_PORT))).toBe(MAX_PORT);
		expect(() => resolvePort(String(MAX_PORT + 1))).toThrow(InvalidPortError);
	});

	it("throws on a fractional port", () => {
		expect(() => resolvePort("3000.5")).toThrow(InvalidPortError);
	});

	it("rejects numeric literal forms that are more likely typos", () => {
		// Number() would happily read these as 31 and 1000.
		expect(() => resolvePort("0x1f")).toThrow(InvalidPortError);
		expect(() => resolvePort("1e3")).toThrow(InvalidPortError);
		expect(() => resolvePort("+3000")).toThrow(InvalidPortError);
	});

	it("accepts a leading-zero port", () => {
		expect(resolvePort("08080")).toBe(8080);
	});
});

describe("createRequestLog", () => {
	it("is weakly keyed, so a served socket can still be collected", async () => {
		// The point of the whole seam. Proven by observation rather than by the
		// type system, which cannot distinguish a WeakMap from a Map here.
		const collected = await new Promise<boolean>((resolve) => {
			const log = createRequestLog();
			const registry = new FinalizationRegistry<string>(() => {
				resolve(true);
			});

			// Scoped so the only strong reference dies at the end of the block;
			// the log's own reference is the one under test.
			((): void => {
				const socket = createSocket();
				registry.register(socket, "socket");
				log.set(socket, "GET /");
				socket.destroy();
			})();

			// A single gc() call is not guaranteed to reach an object that has
			// just become unreachable, and FinalizationRegistry callbacks are
			// explicitly not scheduled on any deadline — so drive gc repeatedly
			// with the microtask and macrotask queues drained in between. The
			// budget below (100 x 20ms = 2s) is generous rather than tight: a
			// slow or loaded CI runner must not be able to turn "not collected
			// yet" into a failed assertion. The test times out long before this
			// gives up if collection genuinely never happens.
			let attempts = 0;
			const collect = (): void => {
				if (attempts >= 100) {
					resolve(false);
					return;
				}
				attempts += 1;
				forceGc();
				setTimeout(collect, 20);
			};
			collect();
		});

		expect(collected).toBe(true);
	});

	it("does not expose enumeration, which would defeat the weakness", () => {
		// forEach/keys/size would each need a strong reference to every key.
		const log: WeakMap<net.Socket, string> = createRequestLog();
		expect(log).toBeInstanceOf(WeakMap);
		expect("size" in log).toBe(false);
		expect("forEach" in log).toBe(false);
	});

	it("returns a fresh log each call, so servers do not share state", () => {
		const socket = createSocket();
		const first = createRequestLog();
		first.set(socket, "GET /");
		expect(createRequestLog().get(socket)).toBeUndefined();
	});
});

describe("handleRequest", () => {
	it("logs the method and url", () => {
		const logger = createRecordingLogger();
		handleRequest(createRequest(createSocket(), "GET", "/foo"), logger);
		expect(logger.messages).toEqual(["Received request: GET /foo"]);
	});

	it("disables the socket timeout and enables keep-alive", () => {
		const socket = createSocket();
		const setTimeoutSpy = vi.spyOn(socket, "setTimeout");
		const setKeepAliveSpy = vi.spyOn(socket, "setKeepAlive");

		handleRequest(createRequest(socket, "GET", "/"), createRecordingLogger());

		expect(setTimeoutSpy).toHaveBeenCalledWith(0);
		expect(setKeepAliveSpy).toHaveBeenCalledWith(true);
	});

	it("never writes a response", () => {
		const socket = createSocket();
		const writeSpy = vi.spyOn(socket, "write");
		handleRequest(createRequest(socket, "GET", "/"), createRecordingLogger());
		expect(writeSpy).not.toHaveBeenCalled();
	});

	it("records the request line against the socket", () => {
		const socket = createSocket();
		const log = createRequestLog();
		handleRequest(
			createRequest(socket, "POST", "/bar"),
			createRecordingLogger(),
			(recorded: net.Socket, description: string) => {
				log.set(recorded, description);
			},
		);
		expect(log.get(socket)).toBe("POST /bar");
	});

	it("passes the request's own socket to the recorder", () => {
		const socket = createSocket();
		const record = vi.fn<RecordRequest>();
		handleRequest(
			createRequest(socket, "POST", "/bar"),
			createRecordingLogger(),
			record,
		);
		expect(record).toHaveBeenCalledWith(socket, "POST /bar");
	});

	it("records the same placeholders it logs for an unparsed request", () => {
		const record = vi.fn<RecordRequest>();
		handleRequest(
			createRequest(createSocket(), undefined, undefined),
			createRecordingLogger(),
			record,
		);
		expect(record).toHaveBeenCalledWith(expect.anything(), "UNKNOWN UNKNOWN");
	});

	it("works without a recorder", () => {
		const logger = createRecordingLogger();
		handleRequest(createRequest(createSocket(), "GET", "/x"), logger);
		expect(logger.messages).toEqual(["Received request: GET /x"]);
	});

	it("labels an unparsed method and url rather than printing undefined", () => {
		const logger = createRecordingLogger();
		handleRequest(createRequest(createSocket(), undefined, undefined), logger);
		expect(logger.messages).toEqual(["Received request: UNKNOWN UNKNOWN"]);
	});

	it("logs an empty url as-is", () => {
		const logger = createRecordingLogger();
		handleRequest(createRequest(createSocket(), "GET", ""), logger);
		expect(logger.messages).toEqual(["Received request: GET "]);
	});

	it("does not swallow a logger failure", () => {
		// There is no try/catch anywhere in the handler, so a throwing logger
		// propagates into node:http's request emit rather than being contained.
		const logger: Logger = {
			log: (): void => {
				throw new Error("sink unavailable");
			},
		};
		expect(() =>
			handleRequest(createRequest(createSocket(), "GET", "/"), logger),
		).toThrow("sink unavailable");
	});

	it("propagates a socket failure", () => {
		// Simulates the socket being torn down underneath us.
		const logger = createRecordingLogger();
		const socket = createSocket();
		vi.spyOn(socket, "setKeepAlive").mockImplementation(() => {
			throw new Error("socket gone");
		});

		expect(() =>
			handleRequest(createRequest(socket, "GET", "/"), logger),
		).toThrow("socket gone");
		expect(logger.messages).toEqual(["Received request: GET /"]);
	});
});

describe("createBlackholeServer", () => {
	it("creates a server that is not yet listening", () => {
		const server = createBlackholeServer(createRecordingLogger());
		openServers.push(server);
		expect(server.listening).toBe(false);
	});

	it("accepts a request and never responds to it", async () => {
		const logger = createRecordingLogger();
		const server = createBlackholeServer(logger);
		const port = await listen(server);

		const socket = await sendRequest(
			port,
			"GET /black/hole HTTP/1.1\r\nHost: localhost\r\n\r\n",
		);

		let received = "";
		socket.on("data", (chunk: Buffer) => {
			received += chunk.toString();
		});

		expect(
			await waitFor(() =>
				logger.messages.includes("Received request: GET /black/hole"),
			),
		).toBe(true);
		expect(logger.messages[0]).toBe("Connection opened");

		// Give the server ample opportunity to reply; it must not.
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 300);
		});
		expect(received).toBe("");
		expect(socket.destroyed).toBe(false);
	});

	it("logs the close when the client hangs up", async () => {
		const logger = createRecordingLogger();
		const server = createBlackholeServer(logger);
		const port = await listen(server);

		const socket = await sendRequest(
			port,
			"GET /bye HTTP/1.1\r\nHost: localhost\r\n\r\n",
		);
		expect(
			await waitFor(() =>
				logger.messages.includes("Received request: GET /bye"),
			),
		).toBe(true);

		socket.destroy();

		expect(
			await waitFor(() =>
				logger.messages.includes("Connection closed by client: GET /bye"),
			),
		).toBe(true);
	});

	it("serves concurrent connections independently", async () => {
		const logger = createRecordingLogger();
		const server = createBlackholeServer(logger);
		const port = await listen(server);

		await sendRequest(port, "GET /one HTTP/1.1\r\nHost: localhost\r\n\r\n");
		await sendRequest(port, "GET /two HTTP/1.1\r\nHost: localhost\r\n\r\n");

		expect(
			await waitFor(
				() =>
					logger.messages.includes("Received request: GET /one") &&
					logger.messages.includes("Received request: GET /two"),
			),
		).toBe(true);
		expect(
			logger.messages.filter((message) => message === "Connection opened"),
		).toHaveLength(2);
	});

	it("logs a connection that sends no request at all", async () => {
		const logger = createRecordingLogger();
		const server = createBlackholeServer(logger);
		const port = await listen(server);

		const socket: net.Socket = net.connect(port, "127.0.0.1");
		openSockets.push(socket);
		await new Promise<void>((resolve) => {
			socket.once("connect", resolve);
		});
		expect(
			await waitFor(() => logger.messages.includes("Connection opened")),
		).toBe(true);

		socket.destroy();

		// Close is tracked per connection, so a client that never sent a request
		// line is still accounted for.
		expect(
			await waitFor(() =>
				logger.messages.includes(
					"Connection closed by client before any request",
				),
			),
		).toBe(true);
	});

	it("names the most recent request when a keep-alive connection closes", async () => {
		const logger = createRecordingLogger();
		const server = createBlackholeServer(logger);
		const port = await listen(server);

		const socket = await sendRequest(
			port,
			"GET /first HTTP/1.1\r\nHost: localhost\r\n\r\n",
		);
		expect(
			await waitFor(() =>
				logger.messages.includes("Received request: GET /first"),
			),
		).toBe(true);

		socket.destroy();

		expect(
			await waitFor(() =>
				logger.messages.includes("Connection closed by client: GET /first"),
			),
		).toBe(true);
	});
});

describe("describeRequest", () => {
	it("joins the method and url", () => {
		expect(describeRequest(createRequest(createSocket(), "PUT", "/a"))).toBe(
			"PUT /a",
		);
	});

	it("substitutes UNKNOWN for absent parts", () => {
		expect(
			describeRequest(createRequest(createSocket(), undefined, "/a")),
		).toBe("UNKNOWN /a");
		expect(
			describeRequest(createRequest(createSocket(), "GET", undefined)),
		).toBe("GET UNKNOWN");
	});
});

describe("createShutdown", () => {
	it("closes an idle server and exits zero", async () => {
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		await listen(server);

		createShutdown(server, logger, exit)();

		expect(await waitFor(() => exited.length > 0)).toBe(true);
		expect(exited).toEqual([0]);
		expect(logger.messages).toEqual([
			"\nShutting down http-blackhole server...",
			"Server closed. Exiting.",
		]);
	});

	it("completes even while a connection is held open", async () => {
		// The package's central hazard: server.close() alone waits for in-flight
		// connections, and this server keeps every connection open by design, so
		// shutdown would hang until the supervisor SIGKILLed it.
		// closeAllConnections() severs them so shutdown actually finishes.
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		const port = await listen(server);
		await sendRequest(port, "GET /stuck HTTP/1.1\r\nHost: localhost\r\n\r\n");
		expect(
			await waitFor(() =>
				logger.messages.includes("Received request: GET /stuck"),
			),
		).toBe(true);

		createShutdown(server, logger, exit)();

		expect(await waitFor(() => exited.length > 0)).toBe(true);
		expect(exited).toEqual([0]);
		expect(logger.messages).toContain("Server closed. Exiting.");
	});

	it("completes with many connections held open", async () => {
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		const port = await listen(server);
		for (let index = 0; index < 5; index += 1) {
			await sendRequest(
				port,
				`GET /stuck/${index} HTTP/1.1\r\nHost: localhost\r\n\r\n`,
			);
		}
		expect(
			await waitFor(
				() =>
					logger.messages.filter((message) => message === "Connection opened")
						.length === 5,
			),
		).toBe(true);

		createShutdown(server, logger, exit)();

		expect(await waitFor(() => exited.length > 0)).toBe(true);
		expect(exited).toEqual([0]);
	});

	it("exits non-zero when the server was never listening", async () => {
		// close() errors on a server that never listened. That error must not be
		// reported as a clean shutdown.
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		openServers.push(server);

		createShutdown(server, logger, exit)();

		expect(await waitFor(() => exited.length > 0)).toBe(true);
		expect(exited).toEqual([1]);
		expect(logger.messages[0]).toBe("\nShutting down http-blackhole server...");
		expect(logger.messages[1]).toMatch(/^Server close failed: /);
		expect(logger.messages).not.toContain("Server closed. Exiting.");
	});

	it("ignores repeat signals and exits exactly once", async () => {
		// SIGINT then SIGTERM, or an impatient double Ctrl+C, must not close
		// twice or exit twice.
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		await listen(server);
		const shutdown = createShutdown(server, logger, exit);

		shutdown();
		shutdown();
		expect(await waitFor(() => exited.length > 0)).toBe(true);
		shutdown();

		await new Promise<void>((resolve) => {
			setTimeout(resolve, 200);
		});
		expect(exited).toEqual([0]);
		expect(
			logger.messages.filter(
				(message) =>
					message === "Shutdown already in progress; ignoring signal.",
			),
		).toHaveLength(2);
	});

	it("propagates a logger failure before close is attempted", () => {
		const closed: boolean[] = [];
		const server = createBlackholeServer(createRecordingLogger());
		openServers.push(server);
		vi.spyOn(server, "close").mockImplementation((): http.Server => {
			closed.push(true);
			return server;
		});
		const logger: Logger = {
			log: (): void => {
				throw new Error("sink unavailable");
			},
		};

		expect(() =>
			createShutdown(server, logger, (): void => undefined)(),
		).toThrow("sink unavailable");
		expect(closed).toEqual([]);
	});
});
