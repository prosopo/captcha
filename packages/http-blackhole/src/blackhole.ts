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

import http from "node:http";
import type net from "node:net";

/** Port used when PORT is unset or blank. */
export const DEFAULT_PORT = 8080;

/** Highest port number the OS will accept. */
export const MAX_PORT = 65535;

/**
 * Console-shaped output sink. Injected so tests can capture output without
 * stubbing the global console, and so the entrypoint stays the only place that
 * reaches for a real one.
 */
export interface Logger {
	log: (message: string) => void;
}

/** Exit function, injected so tests do not terminate the test runner. */
export type Exit = (code: number) => void;

/** Raised when PORT is set to something that is not a usable port. */
export class InvalidPortError extends Error {
	constructor(value: string) {
		super(
			`Invalid PORT "${value}": expected a whole number between 0 and ${MAX_PORT}`,
		);
		this.name = "InvalidPortError";
	}
}

/**
 * Resolve the listen port from a raw environment value.
 *
 * Unset or blank falls back to DEFAULT_PORT; anything else must be a plain
 * decimal integer in range, or startup fails immediately rather than silently
 * binding the wrong port. 0 is honoured, meaning "bind any free port".
 */
export const resolvePort = (value: string | undefined): number => {
	if (value === undefined) {
		return DEFAULT_PORT;
	}
	const trimmed = value.trim();
	if (trimmed === "") {
		return DEFAULT_PORT;
	}
	// Deliberately stricter than Number(): hex, exponent and fractional forms
	// in a PORT value are far more likely to be typos than intent.
	if (!/^\d+$/.test(trimmed)) {
		throw new InvalidPortError(value);
	}
	const port = Number(trimmed);
	if (port > MAX_PORT) {
		throw new InvalidPortError(value);
	}
	return port;
};

/** Human-readable request line, tolerating an unparsed method or url. */
export const describeRequest = (req: http.IncomingMessage): string =>
	`${req.method ?? "UNKNOWN"} ${req.url ?? "UNKNOWN"}`;

/**
 * Records the last request line seen on a socket, so the connection-level close
 * listener can name it.
 *
 * A callback rather than the map itself: `Map` is structurally assignable to
 * `WeakMap` (both satisfy get/set/has/delete, and neither narrows
 * `Symbol.toStringTag` to a literal), so a parameter typed `WeakMap` would
 * happily accept a strongly-keyed `Map` and silently retain every socket the
 * process has ever served. Narrowing the seam to a function removes the
 * substitution entirely and leaves exactly one place that decides how requests
 * are stored — see `createRequestLog`.
 */
export type RecordRequest = (socket: net.Socket, description: string) => void;

/**
 * The per-socket request log.
 *
 * Weak on purpose: this server holds every connection open indefinitely and is
 * pointed at by clients under test, so a strongly-keyed map would grow for the
 * lifetime of the process and pin each socket's buffers with it. Weakness is a
 * property of the class, not of the type — hence a single construction site
 * that tests can assert on directly.
 */
export const createRequestLog = (): WeakMap<net.Socket, string> =>
	new WeakMap<net.Socket, string>();

/**
 * Handle one request by deliberately never responding: the socket is held open
 * so the client is forced to hit its own timeout. This is the entire purpose of
 * the package — it exists to test client-side timeout handling.
 */
export const handleRequest = (
	req: http.IncomingMessage,
	logger: Logger,
	record?: RecordRequest,
): void => {
	const description = describeRequest(req);
	logger.log(`Received request: ${description}`);
	record?.(req.socket, description);
	// Do nothing else: simulate an unresponsive server, keeping the socket open.
	req.socket.setTimeout(0); // Disable socket timeout
	req.socket.setKeepAlive(true); // Keep the socket alive
};

/** Build the blackhole server. Does not listen — the caller decides that. */
export const createBlackholeServer = (logger: Logger): http.Server => {
	const server = http.createServer();
	// Close is tracked per connection rather than per request, so a client that
	// connects and then goes away without ever sending a request line is still
	// accounted for.
	const lastRequest = createRequestLog();

	server.on("connection", (socket: net.Socket) => {
		logger.log("Connection opened");
		socket.on("close", () => {
			const description = lastRequest.get(socket);
			logger.log(
				description === undefined
					? "Connection closed by client before any request"
					: `Connection closed by client: ${description}`,
			);
		});
	});

	server.on("request", (req: http.IncomingMessage) => {
		handleRequest(req, logger, (socket: net.Socket, description: string) => {
			lastRequest.set(socket, description);
		});
	});

	return server;
};

/**
 * Build the SIGINT/SIGTERM handler.
 *
 * server.close() only stops new connections and waits for existing ones to end
 * — and this server holds every connection open indefinitely by design, so it
 * would wait forever. closeAllConnections() severs them so shutdown actually
 * completes. Repeat signals are ignored, and a close failure exits non-zero
 * rather than reporting a clean shutdown that did not happen.
 */
export const createShutdown = (
	server: http.Server,
	logger: Logger,
	exit: Exit,
): (() => void) => {
	let shuttingDown = false;
	return () => {
		if (shuttingDown) {
			logger.log("Shutdown already in progress; ignoring signal.");
			return;
		}
		shuttingDown = true;
		logger.log("\nShutting down http-blackhole server...");
		server.close((error?: Error) => {
			if (error) {
				logger.log(`Server close failed: ${error.message}`);
				exit(1);
				return;
			}
			logger.log("Server closed. Exiting.");
			exit(0);
		});
		server.closeAllConnections();
	};
};
