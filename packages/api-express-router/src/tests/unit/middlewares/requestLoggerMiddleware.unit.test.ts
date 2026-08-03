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

import { EventEmitter } from "node:events";
import type { IncomingHttpHeaders } from "node:http";
import type { ProviderEnvironment } from "@prosopo/env";
import type { Logger } from "@prosopo/logger";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { requestLoggerMiddleware } from "../../../middlewares/requestLoggerMiddleware.js";
import { type NextCapture, captureNext } from "../testDoubles.js";

/**
 * This middleware is the only thing that gives a request an identity, so what
 * matters is that the id is stable across the request, that it is reused when an
 * upstream proxy already assigned one, and that exactly one "Response sent" line
 * is emitted no matter which express event fires.
 */

interface LogEntry {
	msg?: string;
	data?: Record<string, unknown>;
}

/** The `.with()` bindings and every info() payload the middleware produced. */
interface Recorded {
	bindings: Record<string, unknown>;
	infos: LogEntry[];
}

const recorded: Recorded = { bindings: {}, infos: [] };

const { getLoggerMock } = vi.hoisted(() => ({
	getLoggerMock: vi.fn(),
}));

vi.mock("@prosopo/logger", async () => {
	const actual =
		await vi.importActual<typeof import("@prosopo/logger")>("@prosopo/logger");
	return { ...actual, getLogger: getLoggerMock };
});

const makeLogger = (): Logger => {
	const logger = {
		with: (bindings: Record<string, unknown>): Logger => {
			recorded.bindings = bindings;
			return logger;
		},
		info: (entry: () => LogEntry): void => {
			recorded.infos.push(entry());
		},
		error: vi.fn<(entry: () => LogEntry) => void>(),
		debug: vi.fn<(entry: () => LogEntry) => void>(),
		warn: vi.fn<(entry: () => LogEntry) => void>(),
	} as unknown as Logger;
	return logger;
};

const env = { config: { logLevel: "info" } } as unknown as ProviderEnvironment;

interface Harness {
	req: Request;
	res: Response & EventEmitter;
	next: NextCapture;
	setHeader: ReturnType<
		typeof vi.fn<(name: string, value: string) => Response>
	>;
}

const build = (
	overrides: {
		headers?: IncomingHttpHeaders;
		body?: unknown;
		path?: string;
		method?: string;
		statusCode?: number;
	} = {},
): Harness => {
	const emitter = new EventEmitter();
	const setHeader = vi.fn<(name: string, value: string) => Response>();
	const res = Object.assign(emitter, {
		setHeader,
		statusCode: overrides.statusCode ?? 200,
	}) as unknown as Response & EventEmitter;

	const req = {
		headers: overrides.headers ?? {},
		body: overrides.body,
		path: overrides.path ?? "/verify",
		method: overrides.method ?? "POST",
	} as unknown as Request;

	return { req, res, next: captureNext(), setHeader };
};

const run = (harness: Harness): void => {
	requestLoggerMiddleware(env)(harness.req, harness.res, harness.next.fn);
};

beforeEach(() => {
	recorded.bindings = {};
	recorded.infos = [];
	getLoggerMock.mockReset();
	getLoggerMock.mockImplementation(() => makeLogger());
});

describe("the request id", () => {
	test("reuses the id an upstream proxy already assigned", () => {
		// Caddy stamps x-request-id; reusing it is what lets a proxy log line and
		// an app log line be joined together.
		const harness = build({ headers: { "x-request-id": "caddy-123" } });
		run(harness);
		expect(harness.req.requestId).toBe("caddy-123");
		expect(recorded.bindings.requestId).toBe("caddy-123");
	});

	test("generates an e-prefixed uuid when there is no inbound id", () => {
		const harness = build();
		run(harness);
		expect(harness.req.requestId).toMatch(
			/^e-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	test("generates a fresh id per request", () => {
		const first = build();
		const second = build();
		run(first);
		run(second);
		expect(first.req.requestId).not.toBe(second.req.requestId);
	});

	test("falls back for an empty inbound id rather than using a blank one", () => {
		// A blank header is worse than no header: it would group every such
		// request under the same empty id.
		const harness = build({ headers: { "x-request-id": "" } });
		run(harness);
		expect(harness.req.requestId).toMatch(/^e-/);
	});

	test("mirrors the id back onto the response", () => {
		const harness = build({ headers: { "x-request-id": "caddy-123" } });
		run(harness);
		expect(harness.setHeader).toHaveBeenCalledWith("x-request-id", "caddy-123");
	});

	test("mirrors the generated id too, not just an inbound one", () => {
		const harness = build();
		run(harness);
		expect(harness.setHeader).toHaveBeenCalledWith(
			"x-request-id",
			harness.req.requestId,
		);
	});
});

describe("the log bindings", () => {
	test("carry the user and site key headers when present", () => {
		const harness = build({
			headers: { "prosopo-user": "alice", "prosopo-site-key": "site-1" },
		});
		run(harness);
		expect(recorded.bindings.user).toBe("alice");
		expect(recorded.bindings.siteKey).toBe("site-1");
	});

	test("omit absent fields entirely rather than binding undefined", () => {
		// A bound `user: undefined` would show up as a field in every log line
		// for anonymous traffic.
		const harness = build();
		run(harness);
		expect(Object.keys(recorded.bindings)).toEqual(["requestId"]);
	});

	test("omit headers present but empty", () => {
		const harness = build({
			headers: { "prosopo-user": "", "prosopo-site-key": "" },
		});
		run(harness);
		expect(Object.keys(recorded.bindings)).toEqual(["requestId"]);
	});

	test("collapse a repeated header to a single string", () => {
		// Node hands back an array when a header appears twice; binding the array
		// itself would break the log schema.
		const harness = build({
			headers: { "prosopo-user": ["alice", "bob"] as unknown as string },
		});
		run(harness);
		expect(recorded.bindings.user).toBe("alice,bob");
	});

	test("carry the session id off the request body", () => {
		const harness = build({ body: { sessionId: "sess-9" } });
		run(harness);
		expect(recorded.bindings.sessionId).toBe("sess-9");
	});

	test("tolerate a missing body", () => {
		// Body parsing is mounted per-route, so the middleware can run before a
		// body exists at all.
		const harness = build({ body: undefined });
		expect(() => run(harness)).not.toThrow();
		expect(recorded.bindings.sessionId).toBeUndefined();
	});

	test("tolerate a body that is not an object", () => {
		const harness = build({ body: "raw text" });
		expect(() => run(harness)).not.toThrow();
		expect(recorded.bindings.sessionId).toBeUndefined();
	});

	test("omit an empty session id", () => {
		const harness = build({ body: { sessionId: "" } });
		run(harness);
		expect(recorded.bindings.sessionId).toBeUndefined();
	});

	test("attach the bound logger to the request for handlers downstream", () => {
		const harness = build();
		run(harness);
		expect(harness.req.logger).toBeDefined();
	});
});

describe("envelope logging", () => {
	test("logs a request-received line before calling next", () => {
		const harness = build({ path: "/verify", method: "POST" });
		run(harness);
		expect(recorded.infos[0]).toEqual({
			msg: "Request received",
			data: { method: "POST", path: "/verify" },
		});
		expect(harness.next.calls).toHaveLength(1);
	});

	test("logs a response-sent line with status and outcome when finish fires", () => {
		const harness = build({ statusCode: 201 });
		run(harness);
		harness.res.emit("finish");

		const sent = recorded.infos[1];
		expect(sent?.msg).toBe("Response sent");
		expect(sent?.data?.status).toBe(201);
		expect(sent?.data?.outcome).toBe("finish");
		expect(typeof sent?.data?.durationMs).toBe("number");
	});

	test("records a client disconnect as a close outcome", () => {
		const harness = build();
		run(harness);
		harness.res.emit("close");
		expect(recorded.infos[1]?.data?.outcome).toBe("close");
	});

	test("logs the response only once when both events fire", () => {
		// Express emits close after finish on a normal response, so without the
		// guard every request would be counted twice.
		const harness = build();
		run(harness);
		harness.res.emit("finish");
		harness.res.emit("close");
		expect(
			recorded.infos.filter((e) => e.msg === "Response sent"),
		).toHaveLength(1);
	});

	test("keeps the first outcome when close follows finish", () => {
		const harness = build();
		run(harness);
		harness.res.emit("finish");
		harness.res.emit("close");
		expect(recorded.infos[1]?.data?.outcome).toBe("finish");
	});

	test("reads the status at emit time, not at middleware time", () => {
		// The handler sets the status after this middleware has already run, so a
		// value captured up front would always read 200.
		const harness = build({ statusCode: 200 });
		run(harness);
		harness.res.statusCode = 500;
		harness.res.emit("finish");
		expect(recorded.infos[1]?.data?.status).toBe(500);
	});

	test("reports a non-negative duration", () => {
		const harness = build();
		run(harness);
		harness.res.emit("finish");
		expect(recorded.infos[1]?.data?.durationMs).toBeGreaterThanOrEqual(0);
	});
});

describe("health probes", () => {
	test.each(["/healthz", "/health", "/readyz"])(
		"%s is not envelope-logged",
		(path: string) => {
			// These are polled continuously; logging them would bury real traffic.
			const harness = build({ path });
			run(harness);
			harness.res.emit("finish");
			expect(recorded.infos).toEqual([]);
			expect(harness.next.calls).toHaveLength(1);
		},
	);

	test("a health probe still gets a request id and a logger", () => {
		const harness = build({ path: "/healthz" });
		run(harness);
		expect(harness.req.requestId).toMatch(/^e-/);
		expect(harness.req.logger).toBeDefined();
		expect(harness.setHeader).toHaveBeenCalledWith(
			"x-request-id",
			harness.req.requestId,
		);
	});

	test("a path that merely looks like a probe is still logged", () => {
		// The match is exact, so nothing under a probe-like prefix is silently
		// dropped from the logs.
		const harness = build({ path: "/healthz/deep" });
		run(harness);
		expect(recorded.infos[0]?.msg).toBe("Request received");
	});

	test("registers no response listeners for a probe", () => {
		const harness = build({ path: "/healthz" });
		run(harness);
		expect(harness.res.listenerCount("finish")).toBe(0);
		expect(harness.res.listenerCount("close")).toBe(0);
	});
});

describe("the environment it is built from", () => {
	test("builds its logger under the provider:request scope at the configured level", () => {
		const harness = build();
		run(harness);
		expect(getLoggerMock).toHaveBeenCalledWith("info", "provider:request");
	});

	test("reads the log level from the environment on every request", () => {
		// The middleware is built once at start-up but the level is read per
		// request, so a config change takes effect without a restart.
		const mutable = {
			config: { logLevel: "info" },
		} as unknown as ProviderEnvironment;
		const middleware = requestLoggerMiddleware(mutable);
		const first = build();
		middleware(first.req, first.res, first.next.fn);

		mutable.config.logLevel = "debug";
		const second = build();
		middleware(second.req, second.res, second.next.fn);

		expect(getLoggerMock).toHaveBeenLastCalledWith("debug", "provider:request");
	});
});
