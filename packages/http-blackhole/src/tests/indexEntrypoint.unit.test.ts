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

// The entrypoint runs on import: it binds a port, registers signal handlers and
// wires process.exit in as the shutdown callback. It therefore gets a file of
// its own — importing it from a shared file would leak a listening server and a
// pair of signal handlers into every other test, and vitest shuffles order.
//
// PORT=0 keeps the bind from colliding with anything, and process.exit is
// stubbed before the import so exercising shutdown does not kill the runner.

import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Matches process.exit, which accepts a string or null code as well. */
type ExitStub = (code?: string | number | null) => never;

const originalPort: string | undefined = process.env.PORT;
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

/** Signal handlers present before the import, so only new ones are removed. */
let preexisting: Map<NodeJS.Signals, NodeJS.SignalsListener[]>;

const listenersAddedByImport = (
	signal: NodeJS.Signals,
): NodeJS.SignalsListener[] => {
	const before: NodeJS.SignalsListener[] = preexisting.get(signal) ?? [];
	return process
		.listeners(signal)
		.filter((listener: NodeJS.SignalsListener) => !before.includes(listener));
};

const waitForLog = async (
	log: MockInstance<Console["log"]>,
	fragment: string,
	timeoutMs = 5000,
): Promise<boolean> => {
	const deadline = Date.now() + timeoutMs;
	const seen = (): boolean =>
		log.mock.calls.some((call: unknown[]) =>
			call.some(
				(arg: unknown) => typeof arg === "string" && arg.includes(fragment),
			),
		);
	while (Date.now() < deadline) {
		if (seen()) {
			return true;
		}
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 10);
		});
	}
	return seen();
};

beforeEach(() => {
	preexisting = new Map(
		signals.map((signal: NodeJS.Signals) => [
			signal,
			[...process.listeners(signal)],
		]),
	);
	// Bind an ephemeral port: the real default would clash with anything already
	// running locally, and a clash is an unhandled 'error' that kills the run.
	process.env.PORT = "0";
	// The entrypoint does its work as an import side effect, so the module cache
	// must be cleared or only the first test in this file would actually run it.
	vi.resetModules();
});

afterEach(async () => {
	// Drive shutdown before restoring the process.exit stub: the test's server is
	// still listening, and its own handler is the only reference to it. Repeat
	// invocations are ignored by design, so this is safe after a test that has
	// already shut down.
	for (const listener of listenersAddedByImport("SIGINT")) {
		listener("SIGINT");
	}
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 50);
	});
	for (const signal of signals) {
		for (const listener of listenersAddedByImport(signal)) {
			process.removeListener(signal, listener);
		}
	}
	if (undefined === originalPort) {
		Reflect.deleteProperty(process.env, "PORT");
	} else {
		process.env.PORT = originalPort;
	}
	vi.restoreAllMocks();
});

describe("index entrypoint", () => {
	it("starts listening and registers both shutdown signals", async () => {
		const log = vi.spyOn(console, "log").mockImplementation((): void => {});
		vi.spyOn(process, "exit").mockImplementation(((): void => {}) as ExitStub);

		await import("../index.js");

		expect(await waitForLog(log, "is listening on port")).toBe(true);
		// Both signals must be wired, not just SIGINT: a container stop sends
		// SIGTERM, and an unhandled SIGTERM would skip shutdown entirely.
		expect(listenersAddedByImport("SIGINT")).toHaveLength(1);
		expect(listenersAddedByImport("SIGTERM")).toHaveLength(1);
	});

	it("shuts down cleanly and exits zero when signalled", async () => {
		const log = vi.spyOn(console, "log").mockImplementation((): void => {});
		const exit = vi
			.spyOn(process, "exit")
			.mockImplementation(((): void => {}) as ExitStub);

		await import("../index.js");
		await waitForLog(log, "is listening on port");

		const handler: NodeJS.SignalsListener | undefined =
			listenersAddedByImport("SIGINT")[0];
		if (undefined === handler) {
			throw new Error("the entrypoint registered no SIGINT handler");
		}
		handler("SIGINT");

		// This is the whole reason shutdown severs connections: without that, a
		// server holding sockets open by design never finishes closing, and this
		// log line would never arrive.
		expect(await waitForLog(log, "Server closed. Exiting.")).toBe(true);
		expect(exit).toHaveBeenCalledWith(0);
	});

	it("wires the shutdown so a repeat signal is ignored", async () => {
		const log = vi.spyOn(console, "log").mockImplementation((): void => {});
		vi.spyOn(process, "exit").mockImplementation(((): void => {}) as ExitStub);

		await import("../index.js");
		await waitForLog(log, "is listening on port");

		const handler: NodeJS.SignalsListener | undefined =
			listenersAddedByImport("SIGINT")[0];
		if (undefined === handler) {
			throw new Error("the entrypoint registered no SIGINT handler");
		}
		// A user holding Ctrl+C sends several in a row; the second must not start
		// a second close, which would call back with an ERR_SERVER_NOT_RUNNING.
		handler("SIGINT");
		handler("SIGINT");

		expect(await waitForLog(log, "Shutdown already in progress")).toBe(true);
		expect(await waitForLog(log, "Server closed. Exiting.")).toBe(true);
	});

	it("binds the port taken from the environment", async () => {
		const log = vi.spyOn(console, "log").mockImplementation((): void => {});
		vi.spyOn(process, "exit").mockImplementation(((): void => {}) as ExitStub);

		await import("../index.js");
		await waitForLog(log, "is listening on port");

		// The entrypoint logs the configured PORT, not the port the OS actually
		// bound — with PORT=0 it says 0 while listening on an ephemeral port.
		// That is what is asserted here: the value came from the environment
		// rather than from the hardcoded default.
		const message: string | undefined = log.mock.calls
			.flat()
			.find(
				(arg: unknown): arg is string =>
					typeof arg === "string" && arg.includes("is listening on port"),
			);
		expect(message).toBe("http-blackhole server is listening on port 0");
	});
});
