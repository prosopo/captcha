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

import { mkdtempSync, rmSync } from "node:fs";
import { type Server, type Socket, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getLogger } from "@prosopo/logger";
import {
	type AccountSighting,
	type IPInfoResponse,
	WebRtcClientStatus,
	WebRtcOutcome,
	type WebRtcProbeReport,
} from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	evaluateWebRtc,
	parseCandidate,
} from "../../../../api/captcha/getFrictionlessCaptchaChallenge/webrtcSignal.js";
import { encodeLookupRequest } from "../../../../services/stunProbe.js";

const logger = getLogger("info", "webrtcSignal.unit.test");

const REAL_IP = "82.45.237.60";
const PROXY_IP = "95.63.194.71";

// Addresses the fake stun-probe has seen, as `ip port` (port 0 = any port).
const seen = new Set<string>([
	`${REAL_IP} 49637`,
	`${REAL_IP} 0`,
	`${PROXY_IP} 0`,
	"2001:db8:1:2::99 50000",
	"2001:db8:1:2::99 0",
]);

const decodeRequest = (req: Buffer): string => {
	const addr = req.subarray(4, 20);
	const port = req.readUInt16BE(20);
	const isMapped =
		addr.subarray(0, 10).every((b) => b === 0) &&
		addr[10] === 0xff &&
		addr[11] === 0xff;
	if (isMapped) return `${[...addr.subarray(12)].join(".")} ${port}`;
	const groups: string[] = [];
	for (let i = 0; i < 16; i += 2)
		groups.push(addr.readUInt16BE(i).toString(16));
	const ip = groups.join(":").replace(/(^|:)0(:0)+(:|$)/, "::");
	return `${ip} ${port}`;
};

const serveFakeProbe = (socket: Socket): void => {
	let buffer = Buffer.alloc(0);
	socket.on("data", (chunk: Buffer) => {
		buffer = Buffer.concat([buffer, chunk]);
		while (buffer.length >= 22) {
			const key = decodeRequest(buffer.subarray(0, 22));
			buffer = buffer.subarray(22);
			const body = JSON.stringify(
				seen.has(key)
					? { v: 1, hit: true, count: 1, first_ms: 1, last_ms: 1 }
					: { v: 1, hit: false, reason: "no_record" },
			);
			const len = Buffer.alloc(4);
			len.writeUInt32BE(Buffer.byteLength(body));
			socket.write(Buffer.concat([len, Buffer.from(body)]));
		}
	});
};

const leakedInfo: IPInfoResponse = {
	ip: REAL_IP,
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
	asnNumber: 5089,
	countryCode: "GB",
};

const ipInfoService: IIpInfoService = {
	initialize: async (): Promise<void> => undefined,
	lookup: async (_ip: string): Promise<IPInfoResponse> => leakedInfo,
	country: (_ip: string): string | undefined => undefined,
	accountSighting: async (
		_siteKey: string,
		_account: string,
	): Promise<AccountSighting | undefined> => undefined,
	isAvailable: (): boolean => true,
};

const srflx = (ip: string, port: number): string =>
	`candidate:1 1 udp 1677729535 ${ip} ${port} typ srflx raddr 0.0.0.0 rport 0 generation 0`;
const mdnsHost =
	"candidate:2 1 udp 2122260223 2d913296-2a58-482b-b8e1-924e37275540.local 49637 typ host generation 0";

const report = (
	candidates: string[],
	status: WebRtcClientStatus = WebRtcClientStatus.gathered,
): WebRtcProbeReport => ({ status, gatherMs: 120, candidates });

describe("parseCandidate", () => {
	it("reads the fields browsers emit and rejects junk", () => {
		expect(parseCandidate(srflx(REAL_IP, 49637))).toEqual({
			type: "srflx",
			protocol: "udp",
			address: REAL_IP,
			port: 49637,
		});
		expect(parseCandidate(`a=${mdnsHost}`)?.type).toBe("host");
		expect(parseCandidate("candidate:1 1 udp 1 1.2.3.4 99999 typ srflx")).toBe(
			undefined,
		);
		expect(parseCandidate("not a candidate")).toBe(undefined);
	});
});

describe("encodeLookupRequest", () => {
	it("maps IPv4 into ::ffff:0:0/96 and keeps IPv6 as is", () => {
		expect(decodeRequest(encodeLookupRequest("203.0.113.9", 40000))).toBe(
			"203.0.113.9 40000",
		);
		expect(
			encodeLookupRequest("2001:db8::1", 1).subarray(4, 20).toString("hex"),
		).toBe("20010db8000000000000000000000001");
	});
});

describe("evaluateWebRtc", () => {
	let dir: string;
	let socketPath: string;
	let server: Server;

	beforeAll(async () => {
		dir = mkdtempSync(join(tmpdir(), "stun-probe-"));
		socketPath = join(dir, "lookup.sock");
		server = createServer(serveFakeProbe);
		await new Promise<void>((resolve) => server.listen(socketPath, resolve));
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		rmSync(dir, { recursive: true, force: true });
	});

	const evaluate = (r: WebRtcProbeReport | undefined, requestIp: string) =>
		evaluateWebRtc({ report: r, requestIp, socketPath, ipInfoService, logger });

	it("is a match when the STUN request came from the HTTP address", async () => {
		const signal = await evaluate(
			report([mdnsHost, srflx(REAL_IP, 49637)]),
			`::ffff:${REAL_IP}`,
		);
		expect(signal).toMatchObject({
			outcome: WebRtcOutcome.match,
			srflxCount: 1,
			hostMdnsCount: 1,
			hostRawCount: 0,
			requestIpSeen: true,
		});
	});

	it("is a mismatch behind a proxy, recording the leaked address and its network", async () => {
		const signal = await evaluate(
			report([mdnsHost, srflx(REAL_IP, 49637)]),
			PROXY_IP,
		);
		expect(signal?.outcome).toBe(WebRtcOutcome.mismatch);
		expect(signal?.leaked).toEqual({
			ip: REAL_IP,
			asnNumber: 5089,
			countryCode: "GB",
			isProxy: false,
			isVPN: false,
			isDatacenter: false,
		});
	});

	it("records the leaked address even when its network cannot be looked up", async () => {
		const unavailable: IIpInfoService = {
			...ipInfoService,
			isAvailable: (): boolean => false,
		};
		const signal = await evaluateWebRtc({
			report: report([mdnsHost, srflx(REAL_IP, 49637)]),
			requestIp: PROXY_IP,
			socketPath,
			ipInfoService: unavailable,
			logger,
		});
		expect(signal?.outcome).toBe(WebRtcOutcome.mismatch);
		expect(signal?.leaked).toEqual({ ip: REAL_IP });
	});

	it("does not record an address on a match", async () => {
		const signal = await evaluate(
			report([mdnsHost, srflx(REAL_IP, 49637)]),
			REAL_IP,
		);
		expect(signal?.outcome).toBe(WebRtcOutcome.match);
		expect(signal?.leaked).toBeUndefined();
	});

	it("flags a candidate no STUN request matches", async () => {
		const signal = await evaluate(
			report([srflx("198.51.100.7", 1234)]),
			REAL_IP,
		);
		expect(signal?.outcome).toBe(WebRtcOutcome.claimedNotSeen);
	});

	it("compares IPv6 by /64 and does not compare across families", async () => {
		const v6 = report([srflx("2001:db8:1:2::99", 50000)]);
		expect((await evaluate(v6, "2001:db8:1:2:aaaa::1"))?.outcome).toBe(
			WebRtcOutcome.match,
		);
		expect((await evaluate(v6, REAL_IP))?.outcome).toBe(
			WebRtcOutcome.otherFamilyOnly,
		);
	});

	it("reports no srflx, unsupported and error without asking for more", async () => {
		expect((await evaluate(report([mdnsHost]), REAL_IP))?.outcome).toBe(
			WebRtcOutcome.noSrflx,
		);
		expect(
			(await evaluate(report([], WebRtcClientStatus.unsupported), REAL_IP))
				?.outcome,
		).toBe(WebRtcOutcome.unsupported);
		expect(
			(await evaluate(report([], WebRtcClientStatus.error), REAL_IP))?.outcome,
		).toBe(WebRtcOutcome.error);
		expect(await evaluate(undefined, REAL_IP)).toBe(undefined);
	});

	it("is probe_unavailable when the socket is missing", async () => {
		const signal = await evaluateWebRtc({
			report: report([srflx(REAL_IP, 49637)]),
			requestIp: REAL_IP,
			socketPath: join(dir, "missing.sock"),
			ipInfoService,
			logger,
		});
		expect(signal?.outcome).toBe(WebRtcOutcome.probeUnavailable);
	});
});
