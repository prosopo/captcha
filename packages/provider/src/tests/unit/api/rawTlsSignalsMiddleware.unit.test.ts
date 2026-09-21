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
import {
	getRawTlsSignals,
	rawTlsSignalsForSession,
} from "../../../api/rawTlsSignalsMiddleware.js";

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

describe("getRawTlsSignals", () => {
	it("parses every present header", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-syn-ns": "100000000",
			"x-tls-synack-ns": "100050000",
			"x-tls-ack-ns": "100100000",
			"x-tls-observed-ttl": "53",
			"x-tls-tcp-mss": "1452",
			"x-tls-tcp-wscale": "7",
			"x-tls-tcp-opts-flags": "31",
			"x-tls-tcp-opts-order": "202818",
			"x-tls-tcp-window": "64240",
		};
		const result = getRawTlsSignals(headers, mockLogger());
		expect(result.synNs).toBe(100000000);
		expect(result.synackNs).toBe(100050000);
		expect(result.ackNs).toBe(100100000);
		expect(result.observedTtl).toBe(53);
		expect(result.tcpMss).toBe(1452);
		expect(result.tcpWscale).toBe(7);
		expect(result.tcpOptsFlags).toBe(31);
		expect(result.tcpOptsOrder).toBe(202818);
		expect(result.tcpWindow).toBe(64240);
	});

	it("returns undefined for every field when no headers are present", () => {
		const result = getRawTlsSignals({}, mockLogger());
		expect(result.synNs).toBeUndefined();
		expect(result.synackNs).toBeUndefined();
		expect(result.ackNs).toBeUndefined();
		expect(result.observedTtl).toBeUndefined();
		expect(result.tcpMss).toBeUndefined();
		expect(result.tcpWscale).toBeUndefined();
		expect(result.tcpOptsFlags).toBeUndefined();
		expect(result.tcpOptsOrder).toBeUndefined();
		expect(result.tcpWindow).toBeUndefined();
	});

	it("rejects out-of-range values with the field-specific cap", () => {
		// ttl > 255 (u8 cap), mss > 65535 (u16), opts_flags > 255 (u8).
		const headers: IncomingHttpHeaders = {
			"x-tls-observed-ttl": "999",
			"x-tls-tcp-mss": "70000",
			"x-tls-tcp-opts-flags": "300",
			"x-tls-tcp-wscale": "42", // in u8 range so still accepted
		};
		const result = getRawTlsSignals(headers, mockLogger());
		expect(result.observedTtl).toBeUndefined();
		expect(result.tcpMss).toBeUndefined();
		expect(result.tcpOptsFlags).toBeUndefined();
		expect(result.tcpWscale).toBe(42);
	});

	it("rejects negative values", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-wscale": "-1",
		};
		const result = getRawTlsSignals(headers, mockLogger());
		expect(result.tcpWscale).toBeUndefined();
	});

	it("rejects non-numeric values", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-mss": "not-a-number",
			"x-tls-tcp-wscale": "7",
		};
		const result = getRawTlsSignals(headers, mockLogger());
		expect(result.tcpMss).toBeUndefined();
		expect(result.tcpWscale).toBe(7);
	});

	it("takes the first value when the header is repeated (string[])", () => {
		const headers: IncomingHttpHeaders = {
			"x-tls-tcp-mss": ["1452", "1460"],
		};
		const result = getRawTlsSignals(headers, mockLogger());
		expect(result.tcpMss).toBe(1452);
	});
});

describe("rawTlsSignalsForSession", () => {
	it("omits undefined fields so Mongo docs stay slim", () => {
		const out = rawTlsSignalsForSession({
			tcpMss: 1460,
			// everything else undefined
		} as Parameters<typeof rawTlsSignalsForSession>[0]);
		expect(out).toEqual({ tcpMss: 1460 });
	});

	it("copies every defined field verbatim", () => {
		const out = rawTlsSignalsForSession({
			synNs: 1,
			synackNs: 2,
			ackNs: 3,
			observedTtl: 4,
			tcpMss: 5,
			tcpWscale: 6,
			tcpOptsFlags: 7,
			tcpOptsOrder: 8,
			tcpWindow: 9,
		} as Parameters<typeof rawTlsSignalsForSession>[0]);
		expect(out).toEqual({
			synNs: 1,
			synackNs: 2,
			ackNs: 3,
			observedTtl: 4,
			tcpMss: 5,
			tcpWscale: 6,
			tcpOptsFlags: 7,
			tcpOptsOrder: 8,
			tcpWindow: 9,
		});
	});
});

describe("rawTlsSignalsMiddleware", () => {
	it("returns a middleware function", async () => {
		const { rawTlsSignalsMiddleware } = await import(
			"../../../api/rawTlsSignalsMiddleware.js"
		);
		// @ts-ignore — mock env, matches ja4Middleware.unit.test.ts pattern
		const middleware = rawTlsSignalsMiddleware({});
		expect(typeof middleware).toBe("function");
	});
});
