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

/** Port used when PORT is unset or does not parse to a non-zero number. */
export const DEFAULT_PORT = 8080;

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

/**
 * Resolve the listen port from a raw environment value.
 *
 * Note `Number(value) || DEFAULT_PORT` treats 0 as absent, so PORT=0 — which
 * would otherwise mean "pick any free port" — falls back to DEFAULT_PORT.
 * Values that parse to a number are passed straight through without a validity
 * check, so an out-of-range or fractional port surfaces later as a listen error.
 */
export const resolvePort = (value: string | undefined): number =>
	Number(value) || DEFAULT_PORT;

/**
 * Handle one request by deliberately never responding: the socket is held open
 * so the client is forced to hit its own timeout. This is the entire purpose of
 * the package — it exists to test client-side timeout handling.
 */
export const handleRequest = (
	req: http.IncomingMessage,
	logger: Logger,
): void => {
	logger.log(`Received request: ${req.method} ${req.url}`);
	// Do nothing: simulate an unresponsive server, keeping the socket open.
	req.socket.setTimeout(0); // Disable socket timeout
	req.socket.setKeepAlive(true); // Keep the socket alive

	req.socket.on("close", () => {
		logger.log(`Connection closed by client: ${req.method} ${req.url}`);
	});
};

/** Build the blackhole server. Does not listen — the caller decides that. */
export const createBlackholeServer = (logger: Logger): http.Server =>
	http.createServer((req: http.IncomingMessage) => {
		handleRequest(req, logger);
	});

/**
 * Build the SIGINT/SIGTERM handler.
 *
 * Caveat: server.close() waits for in-flight connections to end, and this
 * server holds every connection open indefinitely by design. So whenever a
 * client is connected the callback never fires and the process never exits of
 * its own accord — the supervisor's grace period and SIGKILL end it instead.
 */
export const createShutdown = (
	server: http.Server,
	logger: Logger,
	exit: Exit,
): (() => void) => {
	return () => {
		logger.log("\nShutting down http-blackhole server...");
		server.close(() => {
			logger.log("Server closed. Exiting.");
			exit(0);
		});
	};
};
