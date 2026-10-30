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
import type { TcpProbeHit } from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import {
	getRawTlsSignals,
	parseTcpProbeHeader,
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

const encodeProbe = (body: unknown): string =>
	Buffer.from(JSON.stringify(body), "utf8").toString("base64url");

const probeHit: TcpProbeHit = {
	v: 2,
	hit: true,
	flags: 15,
	remote_ip: "2001:db8::1",
	remote_port: 51000,
	local_ip: "2001:db8::2",
	local_port: 443,
	is_v6: true,
	syn_ns: 2 ** 60,
	est_ns: 2 ** 60,
	est_srtt_us: 900,
	est_mss: 1440,
	ack_window: 502,
	ack_tsval: 1,
	ack_tsecr: 2,
	retrans: 0,
	last_state: 1,
	rtt_us: [900, 950],
	pkts: [{ ns: 5, tsval: 3, len: 517, window: 502, flags: 24 }],
	syn: {
		ttl: 52,
		tos: 0,
		total_len: 60,
		ip_id: 0,
		frag_flags: 0,
		flow_label: 12345,
		ip_options: "",
		seq: 7,
		data_offset_resv: 160,
		tcp_flags: 2,
		window: 64240,
		urg_ptr: 0,
		opts: [{ kind: 2, data: "05a0" }],
		opts_malformed: false,
		raw: "ab",
	},
	tcp_info: { state: 1, snd_cwnd: 10 },
};

describe("parseTcpProbeHeader", () => {
	it("decodes a full IPv6 hit, keeping post-handshake packets", () => {
		expect(parseTcpProbeHeader(encodeProbe(probeHit), mockLogger())).toEqual(
			probeHit,
		);
	});

	it("keeps a miss so the blank rate can be measured", () => {
		const miss = { v: 2, hit: false, reason: "unavailable" };
		expect(parseTcpProbeHeader(encodeProbe(miss), mockLogger())).toEqual(miss);
	});

	it("returns undefined when the header is absent", () => {
		expect(parseTcpProbeHeader(undefined, mockLogger())).toBeUndefined();
	});

	it("takes the first value of a repeated header", () => {
		const raw = [encodeProbe(probeHit), "junk"];
		expect(parseTcpProbeHeader(raw, mockLogger())).toEqual(probeHit);
	});

	it.each<[string, string]>([
		["non-base64 junk", "%%%"],
		["base64 that is not JSON", Buffer.from("nope").toString("base64url")],
		["an oversized value", "a".repeat(8193)],
		["an unknown version", encodeProbe({ ...probeHit, v: 3 })],
		["a missing field", encodeProbe({ v: 2, hit: true })],
		["an out-of-range port", encodeProbe({ ...probeHit, remote_port: 70000 })],
		[
			"too many packets",
			encodeProbe({ ...probeHit, pkts: Array(17).fill(probeHit.pkts[0]) }),
		],
		[
			"non-hex SYN bytes",
			encodeProbe({ ...probeHit, syn: { ...probeHit.syn, raw: "<script>" } }),
		],
	])("rejects %s", (_name, raw) => {
		expect(parseTcpProbeHeader(raw, mockLogger())).toBeUndefined();
	});

	it("drops fields a forger added", () => {
		const parsed = parseTcpProbeHeader(
			encodeProbe({ ...probeHit, $where: "1" }),
			mockLogger(),
		);
		expect(parsed).toEqual(probeHit);
	});
});

describe("rawTlsSignalsForSession", () => {
	it("carries the tcp-probe record", () => {
		const out = rawTlsSignalsForSession({
			tcpProbe: probeHit,
		} as Parameters<typeof rawTlsSignalsForSession>[0]);
		expect(out).toEqual({ tcpProbe: probeHit });
	});

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
