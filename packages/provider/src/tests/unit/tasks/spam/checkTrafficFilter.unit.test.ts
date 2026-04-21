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

import type { Logger } from "@prosopo/common";
import type { IPInfoResult, ITrafficFilter } from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { describe, expect, it, vi } from "vitest";
import { checkTrafficFilter } from "../../../../tasks/spam/checkTrafficFilter.js";

const mockLogger = {
	info: () => {},
	error: () => {},
	warn: () => {},
	debug: () => {},
	trace: () => {},
	setLogLevel: () => {},
	getLogLevel: () => "info",
	getScope: () => "test",
} as unknown as Logger;

const baseInfo = (overrides: Partial<IPInfoResult> = {}): IPInfoResult => ({
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
});

const createMockService = (
	lookupFn: IIpInfoService["lookup"],
): IIpInfoService => ({
	initialize: vi.fn(),
	lookup: vi.fn().mockImplementation(lookupFn),
	isAvailable: vi.fn().mockReturnValue(true),
});

const allBlocked: ITrafficFilter = {
	blockVpn: true,
	blockProxy: true,
	blockTor: true,
	blockAbuser: true,
	abuserScoreThreshold: 0,
	blockDatacenter: true,
	blockMobile: true,
	blockSatellite: true,
	blockCrawler: true,
};

describe("checkTrafficFilter", () => {
	it("blocks VPN when blockVpn is true", async () => {
		const service = createMockService(async () => baseInfo({ isVPN: true }));
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.VPN_BLOCKED" });
	});

	it("blocks proxy when blockProxy is true", async () => {
		const service = createMockService(async () => baseInfo({ isProxy: true }));
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.PROXY_BLOCKED" });
	});

	it("blocks Tor when blockTor is true", async () => {
		const service = createMockService(async () => baseInfo({ isTor: true }));
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.TOR_BLOCKED" });
	});

	it("blocks abusive ASN when blockAbuser is true", async () => {
		const service = createMockService(async () => baseInfo({ isAbuser: true }));
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.ABUSER_BLOCKED" });
	});

	it("blocks abuser when score meets threshold", async () => {
		const service = createMockService(async () =>
			baseInfo({ isAbuser: true, abuserScore: 0.06, companyAbuserScore: 0.03 }),
		);
		const result = await checkTrafficFilter(
			"1.2.3.4",
			{ ...allBlocked, abuserScoreThreshold: 0.05 },
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.ABUSER_BLOCKED" });
	});

	it("allows abuser when score is below threshold", async () => {
		const service = createMockService(async () =>
			baseInfo({
				isAbuser: true,
				abuserScore: 0.0052,
				companyAbuserScore: 0.0273,
			}),
		);
		const result = await checkTrafficFilter(
			"1.2.3.4",
			{ ...allBlocked, abuserScoreThreshold: 0.05 },
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("uses company abuser score when it is higher than ASN score", async () => {
		const service = createMockService(async () =>
			baseInfo({
				isAbuser: true,
				abuserScore: 0.01,
				companyAbuserScore: 0.08,
			}),
		);
		const result = await checkTrafficFilter(
			"1.2.3.4",
			{ ...allBlocked, abuserScoreThreshold: 0.05 },
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.ABUSER_BLOCKED" });
	});

	it("blocks datacenter when blockDatacenter is true", async () => {
		const service = createMockService(async () =>
			baseInfo({ isDatacenter: true }),
		);
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({
			isBlocked: true,
			reason: "API.DATACENTER_BLOCKED",
		});
	});

	it("blocks mobile when blockMobile is true", async () => {
		const service = createMockService(async () => baseInfo({ isMobile: true }));
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.MOBILE_BLOCKED" });
	});

	it("blocks satellite when blockSatellite is true", async () => {
		const service = createMockService(async () =>
			baseInfo({ isSatellite: true }),
		);
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({
			isBlocked: true,
			reason: "API.SATELLITE_BLOCKED",
		});
	});

	it("blocks crawler when blockCrawler is true", async () => {
		const service = createMockService(async () =>
			baseInfo({ isCrawler: true }),
		);
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.CRAWLER_BLOCKED" });
	});

	it("allows traffic when all filters are disabled", async () => {
		const service = createMockService(async () => baseInfo({ isVPN: true }));
		const result = await checkTrafficFilter(
			"1.2.3.4",
			{
				blockVpn: false,
				blockProxy: false,
				blockTor: false,
				blockAbuser: false,
				blockDatacenter: false,
				blockMobile: false,
				blockSatellite: false,
				blockCrawler: false,
			},
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("allows residential IPs through", async () => {
		const service = createMockService(async () => baseInfo());
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("fails open if the lookup throws", async () => {
		const service = createMockService(async () => {
			throw new Error("network down");
		});
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("allows through if IP info is invalid", async () => {
		const service = createMockService(async () => ({
			isValid: false,
			error: "lookup failed",
			ip: "1.2.3.4",
		}));
		const result = await checkTrafficFilter(
			"1.2.3.4",
			allBlocked,
			service,
			mockLogger,
		);
		expect(result).toEqual({ isBlocked: false });
	});
});
