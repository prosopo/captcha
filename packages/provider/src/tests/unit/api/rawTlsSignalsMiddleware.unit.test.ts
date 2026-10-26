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
	rawTlsSignalsFromRecord,
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

describe("getRawTlsSignals — whole-SYN fields from the 104-byte record", () => {
	it("parses every new header", () => {
		const headers: IncomingHttpHeaders = {
			// MSS(2), SACK-permitted(4), Timestamps(8), NOP(1), Window-Scale(3)
			// packed one byte per option, least-significant byte first. The
			// probe sends this as decimal, so it is built from the hex here
			// rather than written out.
			"x-tls-tcp-opts-kinds": String(0x0000000301080402n),
			// The same five options as presence bits: 4 | 16 | 64 | 2 | 8.
			"x-tls-tcp-opts-present": "94",
			"x-tls-tcp-opts-count": "5",
			"x-tls-tcp-tsval": "3456789",
			"x-tls-tcp-tsecr": "0",
			"x-tls-tcp-flags": "2",
			"x-tls-tcp-data-offset-resv": "160",
			"x-tls-tcp-urg-ptr": "0",
			"x-tls-ip-ident": "0",
			"x-tls-ip-total-len": "60",
			"x-tls-ip-frag-flags": "16384",
			"x-tls-ip-tos": "0",
		};

		const result = getRawTlsSignals(headers, mockLogger());

		expect(result.tcpOptsKinds).toEqual([2, 4, 8, 1, 3]);
		expect(result.tcpOptsPresent).toBe(94);
		expect(result.tcpOptsCount).toBe(5);
		expect(result.tcpTsval).toBe(3456789);
		expect(result.tcpTsecr).toBe(0);
		expect(result.tcpFlags).toBe(2);
		expect(result.tcpDataOffsetResv).toBe(160);
		expect(result.tcpUrgPtr).toBe(0);
		expect(result.ipIdent).toBe(0);
		expect(result.ipTotalLen).toBe(60);
		expect(result.ipFragFlags).toBe(16384);
		expect(result.ipTos).toBe(0);
	});

	// The whole reason the packed value is decoded rather than stored: a u64
	// reaches 2^64 and a JS number is exact only to 2^53, so Number.parseInt
	// would round — and the rounding lands in the low bytes, which are the
	// option kinds themselves.
	it("reads a packed value above 2^53 without losing the low bytes", () => {
		// Eight options, every slot occupied, so the value needs all 64 bits.
		const packed = 0x22130805040302_01n;
		expect(Number(packed) > Number.MAX_SAFE_INTEGER).toBe(true);

		const result = getRawTlsSignals(
			{ "x-tls-tcp-opts-kinds": String(packed) },
			mockLogger(),
		);

		expect(result.tcpOptsKinds).toEqual([1, 2, 3, 4, 5, 8, 0x13, 0x22]);
	});

	// Kind numbers a 4-bit-per-slot encoding could not tell apart: MSS(2) vs
	// Fast Open(34), Window Scale(3) vs MD5(19).
	it("keeps the kind numbers the old packed order aliased together", () => {
		const result = getRawTlsSignals(
			{ "x-tls-tcp-opts-kinds": String(0x00000000_13220302n) },
			mockLogger(),
		);
		expect(result.tcpOptsKinds).toEqual([2, 3, 34, 19]);
	});

	it("stops at the first empty slot so a trailing EOL is not an option", () => {
		const result = getRawTlsSignals(
			{ "x-tls-tcp-opts-kinds": String(0x0000000000000402n) },
			mockLogger(),
		);
		expect(result.tcpOptsKinds).toEqual([2, 4]);
	});

	// The probe's absent-marker. An empty array would claim a SYN that
	// carried no options at all, which is a different statement.
	it("treats an all-zero packed value as absent, not as an empty list", () => {
		const result = getRawTlsSignals(
			{ "x-tls-tcp-opts-kinds": "0" },
			mockLogger(),
		);
		expect(result.tcpOptsKinds).toBeUndefined();
	});

	it("ignores a malformed or out-of-range packed value", () => {
		for (const raw of ["not a number", "-1", "1.5", String((1n << 64n) + 1n)]) {
			const result = getRawTlsSignals(
				{ "x-tls-tcp-opts-kinds": raw },
				mockLogger(),
			);
			expect(result.tcpOptsKinds, raw).toBeUndefined();
		}
	});

	// chaddy sends exactly one of the two option encodings, so a provider
	// behind an un-upgraded chaddy must still get the legacy pair.
	it("still reads the legacy option headers an 80-byte record produces", () => {
		const result = getRawTlsSignals(
			{
				"x-tls-tcp-opts-flags": "31",
				"x-tls-tcp-opts-order": "202818",
			},
			mockLogger(),
		);
		expect(result.tcpOptsFlags).toBe(31);
		expect(result.tcpOptsOrder).toBe(202818);
		expect(result.tcpOptsKinds).toBeUndefined();
		expect(result.tcpOptsPresent).toBeUndefined();
	});
});

describe("rawTlsSignalsFromRecord", () => {
	it("carries every field off a session record", () => {
		const out = rawTlsSignalsFromRecord({
			synNs: 1,
			tcpOptsKinds: [2, 4, 8],
			tcpOptsPresent: 94,
			tcpTsval: 7,
			ipIdent: 0,
		});
		expect(out).toEqual({
			synNs: 1,
			tcpOptsKinds: [2, 4, 8],
			tcpOptsPresent: 94,
			tcpTsval: 7,
			ipIdent: 0,
		});
	});

	// Called with `sessionRecord?.` at several sites, where the session may
	// not exist at all.
	it("is an empty object for a missing record", () => {
		expect(rawTlsSignalsFromRecord(undefined)).toEqual({});
		expect(rawTlsSignalsFromRecord(null)).toEqual({});
	});

	it("omits undefined fields so Mongo docs stay slim", () => {
		expect(rawTlsSignalsFromRecord({ tcpMss: 1460 })).toEqual({
			tcpMss: 1460,
		});
	});

	// A zero here is a real observation — Linux sends ip_ident 0 with DF set,
	// and a TSecr of 0 is what a well-formed SYN carries — so the filter has
	// to be on `undefined`, not on falsiness.
	it("keeps a zero, which is a real reading for several of these", () => {
		expect(
			rawTlsSignalsFromRecord({ ipIdent: 0, tcpTsecr: 0, tcpFlags: 0 }),
		).toEqual({ ipIdent: 0, tcpTsecr: 0, tcpFlags: 0 });
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
