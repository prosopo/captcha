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

import type { IIpInfoService } from "@prosopo/ipinfo";
import type {
	EnrichedDnsEvent,
	IPInfoResponse,
	ITrafficFilter,
	Session,
} from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import {
	computeDnsAsymmetry,
	enrichDnsEvent,
	extraIpInfosFromEnrichedDnsEvent,
} from "../../../../tasks/dnsEvent/enrichDnsEvent.js";

const makeIpInfoService = (
	lookups: Record<string, IPInfoResponse>,
): IIpInfoService =>
	({
		lookup: vi.fn(async (ip: string) => lookups[ip]),
	}) as unknown as IIpInfoService;

const baseInfo = (overrides: Partial<IPInfoResponse> = {}): IPInfoResponse =>
	({
		ip: "1.2.3.4",
		isValid: true,
		isVPN: false,
		isTor: false,
		isProxy: false,
		isDatacenter: false,
		isAbuser: false,
		isMobile: false,
		isSatellite: false,
		isCrawler: false,
		...overrides,
	}) as IPInfoResponse;

const eventWith = (
	overrides: Partial<NonNullable<Session["dnsEvent"]>>,
): NonNullable<Session["dnsEvent"]> => ({
	receivedAt: new Date(),
	...overrides,
});

describe("enrichDnsEvent", () => {
	it("returns undefined when dnsEvent is undefined", async () => {
		const service = makeIpInfoService({});
		expect(await enrichDnsEvent(undefined, service, "1.2.3.4")).toBeUndefined();
		expect(service.lookup).not.toHaveBeenCalled();
	});

	it("looks up both peer + resolver IPs", async () => {
		const peer = baseInfo({ ip: "198.51.100.10", isDatacenter: true });
		const resolver = baseInfo({ ip: "198.51.100.20", isVPN: true });
		const service = makeIpInfoService({
			"198.51.100.10": peer,
			"198.51.100.20": resolver,
		});
		const result = await enrichDnsEvent(
			eventWith({
				peerIp: "198.51.100.10",
				resolverIp: "198.51.100.20",
				pathValid: true,
			}),
			service,
			"203.0.113.5",
		);
		expect(result).toEqual({
			peerIp: "198.51.100.10",
			resolverIp: "198.51.100.20",
			pathValid: true,
			peerIpInfo: peer,
			resolverIpInfo: resolver,
		});
		expect(service.lookup).toHaveBeenCalledTimes(2);
	});

	it("skips a lookup when the dnsEvent IP equals the primary IP", async () => {
		const resolver = baseInfo({ ip: "198.51.100.20" });
		const service = makeIpInfoService({ "198.51.100.20": resolver });
		const result = await enrichDnsEvent(
			eventWith({ peerIp: "1.2.3.4", resolverIp: "198.51.100.20" }),
			service,
			"1.2.3.4",
		);
		expect(result?.peerIpInfo).toBeUndefined();
		expect(result?.resolverIpInfo).toEqual(resolver);
		expect(service.lookup).toHaveBeenCalledTimes(1);
		expect(service.lookup).toHaveBeenCalledWith("198.51.100.20");
	});

	it("returns dnsEvent fields verbatim when no lookups are needed", async () => {
		const service = makeIpInfoService({});
		const result = await enrichDnsEvent(
			eventWith({ pathValid: false }),
			service,
			"1.2.3.4",
		);
		expect(result).toEqual({
			peerIp: undefined,
			resolverIp: undefined,
			pathValid: false,
		});
		expect(service.lookup).not.toHaveBeenCalled();
	});

	it("does not surface an undefined lookup result on the enriched object", async () => {
		const service = {
			lookup: vi.fn(async () => undefined),
		} as unknown as IIpInfoService;
		const result = await enrichDnsEvent(
			eventWith({ peerIp: "198.51.100.10" }),
			service,
			"1.2.3.4",
		);
		expect(result?.peerIpInfo).toBeUndefined();
	});
});

describe("computeDnsAsymmetry", () => {
	const enrichedWith = (
		overrides: Partial<EnrichedDnsEvent>,
	): EnrichedDnsEvent => ({
		peerIp: undefined,
		resolverIp: undefined,
		pathValid: true,
		...overrides,
	});

	// A resolver/peer IP that ipapi flags as datacenter+VPN — the common
	// consumer-VPN case (e.g. CDN77, Datacamp, M247).
	const dcVpn = (overrides: Partial<IPInfoResponse> = {}): IPInfoResponse =>
		baseInfo({ isDatacenter: true, isVPN: true, ...overrides });

	const filterAllowingVpn: Partial<ITrafficFilter> = {
		blockVpn: false,
		blockProxy: false,
		blockTor: false,
		blockCrawler: false,
		blockDatacenter: true,
		blockAbuser: true,
	};

	it("returns 0 when the enriched event is undefined", () => {
		expect(computeDnsAsymmetry(undefined, undefined)).toBe(0);
	});

	it("adds 0.3 for pathValid=false regardless of trafficFilter", () => {
		expect(
			computeDnsAsymmetry(enrichedWith({ pathValid: false }), undefined),
		).toBeCloseTo(0.3);
		expect(
			computeDnsAsymmetry(
				enrichedWith({ pathValid: false }),
				undefined,
				filterAllowingVpn,
			),
		).toBeCloseTo(0.3);
	});

	describe("legacy path (no trafficFilter)", () => {
		it("counts every datacenter and abuser flag on resolver + peer", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({ isDatacenter: true, isAbuser: true }),
					peerIpInfo: baseInfo({ isDatacenter: true, isAbuser: true }),
				}),
				undefined,
			);
			// 0.3 (resolver DC) + 0.2 (resolver abuser) + 0.2 (peer DC)
			// + 0.2 (peer abuser) = 0.9
			expect(score).toBeCloseTo(0.9);
		});

		it("adds the client-ISP + resolver-DC compound signal", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({ isDatacenter: true }),
				}),
				baseInfo({ providerType: "isp" }),
			);
			// 0.3 (resolver DC) + 0.2 (client-ISP compound) = 0.5
			expect(score).toBeCloseTo(0.5);
		});

		it("caps the score at 1", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					pathValid: false,
					resolverIpInfo: baseInfo({ isDatacenter: true, isAbuser: true }),
					peerIpInfo: baseInfo({ isDatacenter: true, isAbuser: true }),
				}),
				baseInfo({ providerType: "isp" }),
			);
			// 0.3 + 0.3 + 0.2 + 0.2 + 0.2 + 0.2 = 1.4 → capped at 1
			expect(score).toBe(1);
		});
	});

	describe("cross-category suppression", () => {
		it("suppresses datacenter penalty when isVPN and blockVpn is off", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: dcVpn(),
					peerIpInfo: dcVpn(),
				}),
				undefined,
				filterAllowingVpn,
			);
			expect(score).toBe(0);
		});

		it("keeps the datacenter penalty when isVPN but blockVpn is on", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({ resolverIpInfo: dcVpn(), peerIpInfo: dcVpn() }),
				undefined,
				{ ...filterAllowingVpn, blockVpn: true },
			);
			expect(score).toBeCloseTo(0.5);
		});

		it("suppresses when isProxy and blockProxy off", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({ isDatacenter: true, isProxy: true }),
				}),
				undefined,
				filterAllowingVpn,
			);
			expect(score).toBe(0);
		});

		it("suppresses when isTor and blockTor off", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({ isDatacenter: true, isTor: true }),
				}),
				undefined,
				filterAllowingVpn,
			);
			expect(score).toBe(0);
		});

		it("suppresses when isCrawler and blockCrawler off", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({ isDatacenter: true, isCrawler: true }),
				}),
				undefined,
				filterAllowingVpn,
			);
			expect(score).toBe(0);
		});

		it("does not affect the client-ISP compound when resolver DC is suppressed", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({ resolverIpInfo: dcVpn() }),
				baseInfo({ providerType: "isp" }),
				filterAllowingVpn,
			);
			// resolver DC suppressed by VPN → compound also 0
			expect(score).toBe(0);
		});
	});

	describe("datacenter gating", () => {
		it("does not count datacenter when blockDatacenter is not opted in", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({ isDatacenter: true }),
					peerIpInfo: baseInfo({ isDatacenter: true }),
				}),
				undefined,
				{ ...filterAllowingVpn, blockDatacenter: false },
			);
			expect(score).toBe(0);
		});

		it("short-circuits datacenter when providerType is isp", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({
						isDatacenter: true,
						providerType: "isp",
					}),
					peerIpInfo: baseInfo({
						isDatacenter: true,
						providerType: "isp",
					}),
				}),
				undefined,
				filterAllowingVpn,
			);
			expect(score).toBe(0);
		});

		it("skips datacenter when the operator has allowlisted its name", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({
						isDatacenter: true,
						datacenterName: "iCloud Private Relay",
					}),
					peerIpInfo: baseInfo({
						isDatacenter: true,
						providerName: "iCloud Private Relay",
					}),
				}),
				undefined,
				{
					...filterAllowingVpn,
					datacenterNameAllowlist: ["icloud private relay"],
				},
			);
			expect(score).toBe(0);
		});
	});

	describe("abuser gating", () => {
		it("does not count abuser when blockAbuser is false", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({ isAbuser: true, abuserScore: 1 }),
					peerIpInfo: baseInfo({ isAbuser: true, abuserScore: 1 }),
				}),
				undefined,
				{ ...filterAllowingVpn, blockAbuser: false },
			);
			expect(score).toBe(0);
		});

		it("does not count abuser when the score is below the threshold", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({
						isAbuser: true,
						abuserScore: 0.02,
						companyAbuserScore: 0.01,
					}),
				}),
				undefined,
				{ ...filterAllowingVpn, abuserScoreThreshold: 0.5 },
			);
			expect(score).toBe(0);
		});

		it("counts abuser when the score meets the threshold", () => {
			const score = computeDnsAsymmetry(
				enrichedWith({
					resolverIpInfo: baseInfo({
						isAbuser: true,
						abuserScore: 0.6,
					}),
				}),
				undefined,
				{ ...filterAllowingVpn, abuserScoreThreshold: 0.5 },
			);
			expect(score).toBeCloseTo(0.2);
		});
	});
});

describe("extraIpInfosFromEnrichedDnsEvent", () => {
	const peer = baseInfo({ ip: "198.51.100.10" });
	const resolver = baseInfo({ ip: "198.51.100.20" });

	it("returns empty when input is undefined", () => {
		expect(extraIpInfosFromEnrichedDnsEvent(undefined)).toEqual([]);
	});

	it("returns only the present infos in [peer, resolver] order", () => {
		expect(
			extraIpInfosFromEnrichedDnsEvent({
				peerIpInfo: peer,
				resolverIpInfo: resolver,
			}),
		).toEqual([peer, resolver]);
		expect(
			extraIpInfosFromEnrichedDnsEvent({ resolverIpInfo: resolver }),
		).toEqual([resolver]);
		expect(extraIpInfosFromEnrichedDnsEvent({ peerIpInfo: peer })).toEqual([
			peer,
		]);
	});
});
