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

import type { IncomingHttpHeaders } from "node:http";
import type { Logger } from "@prosopo/logger";
import { describe, expect, it, vi } from "vitest";
import { getHandshakeTiming } from "../../../api/handshakeTimingMiddleware.js";

const mockLogger = (): Logger => {
	const log: unknown = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		with: vi.fn().mockImplementation(() => log),
	};
	return log as Logger;
};

describe("getHandshakeTiming", () => {
	it("returns both values when both headers are present and parseable", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-to-chello-us": "42",
			"x-tls-chello-to-handshake-us": "137",
		};
		const result = getHandshakeTiming(headers, mockLogger());
		expect(result.tcpToChelloUs).toBe(42);
		expect(result.chelloToHandshakeUs).toBe(137);
	});

	it("returns 0 for legitimate zero-us measurements", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-to-chello-us": "0",
			"x-tls-chello-to-handshake-us": "0",
		};
		const result = getHandshakeTiming(headers, mockLogger());
		expect(result.tcpToChelloUs).toBe(0);
		expect(result.chelloToHandshakeUs).toBe(0);
	});

	it("returns undefined when a header is missing", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-to-chello-us": "5",
		};
		const result = getHandshakeTiming(headers, mockLogger());
		expect(result.tcpToChelloUs).toBe(5);
		expect(result.chelloToHandshakeUs).toBeUndefined();
	});

	it("returns undefined for both when neither header is present", () => {
		const headers: IncomingHttpHeaders = {};
		const result = getHandshakeTiming(headers, mockLogger());
		expect(result.tcpToChelloUs).toBeUndefined();
		expect(result.chelloToHandshakeUs).toBeUndefined();
	});

	it("rejects non-numeric header values", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-to-chello-us": "not-a-number",
			"x-tls-chello-to-handshake-us": "137",
		};
		const result = getHandshakeTiming(headers, mockLogger());
		expect(result.tcpToChelloUs).toBeUndefined();
		expect(result.chelloToHandshakeUs).toBe(137);
	});

	it("rejects negative values", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-to-chello-us": "-3",
		};
		const result = getHandshakeTiming(headers, mockLogger());
		expect(result.tcpToChelloUs).toBeUndefined();
	});

	it("takes the first value when the header is repeated (string[])", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-to-chello-us": ["17", "99"],
		};
		const result = getHandshakeTiming(headers, mockLogger());
		expect(result.tcpToChelloUs).toBe(17);
	});
});

describe("handshakeTimingMiddleware", () => {
	it("returns a middleware function", async () => {
		const { handshakeTimingMiddleware } = await import(
			"../../../api/handshakeTimingMiddleware.js"
		);
		// @ts-ignore — mock env, matches ja4Middleware.unit.test.ts pattern
		const middleware = handshakeTimingMiddleware({});
		expect(typeof middleware).toBe("function");
	});
});
