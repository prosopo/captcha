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
import type { IPInfoResponse, Session } from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import {
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
