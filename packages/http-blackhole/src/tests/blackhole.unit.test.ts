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
// (in particular that close() blocks while a connection is held open). Fakes
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
	type Logger,
	createBlackholeServer,
	createShutdown,
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
		// Number("") is 0, which is falsy, so the default applies.
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

	it("falls back to the default for a non-numeric value", () => {
		// A typo in PORT is silently swallowed rather than failing fast.
		expect(resolvePort("abc")).toBe(DEFAULT_PORT);
		expect(resolvePort("8080abc")).toBe(DEFAULT_PORT);
	});

	it("falls back to the default for PORT=0", () => {
		// 0 normally means "bind any free port", but it is falsy so it is
		// overridden — the server can never be asked for an ephemeral port.
		expect(resolvePort("0")).toBe(DEFAULT_PORT);
	});

	it("passes through values that are not valid ports", () => {
		// No range or integer validation happens here; listen() rejects these
		// later, at runtime.
		expect(resolvePort("-1")).toBe(-1);
		expect(resolvePort("99999")).toBe(99999);
		expect(resolvePort("3000.5")).toBe(3000.5);
	});

	it("accepts the numeric literal forms Number() understands", () => {
		expect(resolvePort("0x1f")).toBe(31);
		expect(resolvePort("1e3")).toBe(1000);
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

	it("logs when the client closes the connection", () => {
		const logger = createRecordingLogger();
		const socket = createSocket();
		handleRequest(createRequest(socket, "POST", "/bar"), logger);

		socket.emit("close");

		expect(logger.messages).toEqual([
			"Received request: POST /bar",
			"Connection closed by client: POST /bar",
		]);
	});

	it("renders undefined method and url literally", () => {
		// IncomingMessage leaves these undefined until parsed; the template
		// stringifies them rather than guarding, so the log reads "undefined".
		const logger = createRecordingLogger();
		handleRequest(createRequest(createSocket(), undefined, undefined), logger);
		expect(logger.messages).toEqual(["Received request: undefined undefined"]);
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

	it("propagates a socket failure without logging the close message", () => {
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

		expect(await waitFor(() => logger.messages.length > 0)).toBe(true);
		expect(logger.messages[0]).toBe("Received request: GET /black/hole");

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
		expect(await waitFor(() => logger.messages.length > 0)).toBe(true);

		socket.destroy();

		expect(await waitFor(() => logger.messages.length > 1)).toBe(true);
		expect(logger.messages[1]).toBe("Connection closed by client: GET /bye");
	});

	it("serves concurrent connections independently", async () => {
		const logger = createRecordingLogger();
		const server = createBlackholeServer(logger);
		const port = await listen(server);

		await sendRequest(port, "GET /one HTTP/1.1\r\nHost: localhost\r\n\r\n");
		await sendRequest(port, "GET /two HTTP/1.1\r\nHost: localhost\r\n\r\n");

		expect(await waitFor(() => logger.messages.length >= 2)).toBe(true);
		expect(logger.messages.slice(0, 2).sort()).toEqual([
			"Received request: GET /one",
			"Received request: GET /two",
		]);
	});

	it("handles a connection that sends no request at all", async () => {
		const logger = createRecordingLogger();
		const server = createBlackholeServer(logger);
		const port = await listen(server);

		const socket: net.Socket = net.connect(port, "127.0.0.1");
		openSockets.push(socket);
		await new Promise<void>((resolve) => {
			socket.once("connect", resolve);
		});

		await new Promise<void>((resolve) => {
			setTimeout(resolve, 200);
		});
		// No request line means no "request" event, so nothing is logged and the
		// connection sits open — including the close, which is only wired up
		// inside the request handler.
		expect(logger.messages).toEqual([]);
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

	it("never completes while a connection is held open", async () => {
		// This is the package's central hazard: the server keeps every
		// connection open by design, and server.close() waits for in-flight
		// connections to end. So under any real load SIGTERM never reaches
		// process.exit(0) and the supervisor has to SIGKILL after its grace
		// period.
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		const port = await listen(server);
		await sendRequest(port, "GET /stuck HTTP/1.1\r\nHost: localhost\r\n\r\n");
		expect(await waitFor(() => logger.messages.length > 0)).toBe(true);

		createShutdown(server, logger, exit)();

		expect(await waitFor(() => exited.length > 0, 500)).toBe(false);
		expect(exited).toEqual([]);
		expect(logger.messages).toContain(
			"\nShutting down http-blackhole server...",
		);
		expect(logger.messages).not.toContain("Server closed. Exiting.");
	});

	it("completes once the stuck client goes away", async () => {
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		const port = await listen(server);
		const socket = await sendRequest(
			port,
			"GET /stuck HTTP/1.1\r\nHost: localhost\r\n\r\n",
		);
		expect(await waitFor(() => logger.messages.length > 0)).toBe(true);

		createShutdown(server, logger, exit)();
		expect(await waitFor(() => exited.length > 0, 300)).toBe(false);

		socket.destroy();

		expect(await waitFor(() => exited.length > 0)).toBe(true);
		expect(exited).toEqual([0]);
	});

	it("does not exit when the server was never listening", async () => {
		// close() on a server that never listened errors; the callback receives
		// the error but the code ignores it and still exits zero, reporting a
		// clean shutdown that did not happen.
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		openServers.push(server);

		createShutdown(server, logger, exit)();

		expect(await waitFor(() => exited.length > 0)).toBe(true);
		expect(exited).toEqual([0]);
		expect(logger.messages).toEqual([
			"\nShutting down http-blackhole server...",
			"Server closed. Exiting.",
		]);
	});

	it("exits once per signal when invoked repeatedly", async () => {
		// SIGINT then SIGTERM (or an impatient double Ctrl+C) calls close()
		// twice. The second call errors, but the error is ignored, so exit is
		// called again.
		const logger = createRecordingLogger();
		const exited: number[] = [];
		const exit: Exit = (code: number): void => {
			exited.push(code);
		};
		const server = createBlackholeServer(logger);
		await listen(server);
		const shutdown = createShutdown(server, logger, exit);

		shutdown();
		expect(await waitFor(() => exited.length > 0)).toBe(true);
		shutdown();

		expect(await waitFor(() => exited.length > 1)).toBe(true);
		expect(exited).toEqual([0, 0]);
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
