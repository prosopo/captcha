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

import type { IPInfoResult, ITrafficFilter } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { checkTrafficFilter } from "../../../../tasks/spam/checkTrafficFilter.js";

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
	it("blocks VPN when blockVpn is true", () => {
		const result = checkTrafficFilter(baseInfo({ isVPN: true }), allBlocked);
		expect(result).toEqual({ isBlocked: true, reason: "API.VPN_BLOCKED" });
	});

	it("blocks proxy when blockProxy is true", () => {
		const result = checkTrafficFilter(baseInfo({ isProxy: true }), allBlocked);
		expect(result).toEqual({ isBlocked: true, reason: "API.PROXY_BLOCKED" });
	});

	it("blocks Tor when blockTor is true", () => {
		const result = checkTrafficFilter(baseInfo({ isTor: true }), allBlocked);
		expect(result).toEqual({ isBlocked: true, reason: "API.TOR_BLOCKED" });
	});

	it("blocks abusive ASN when blockAbuser is true", () => {
		const result = checkTrafficFilter(baseInfo({ isAbuser: true }), allBlocked);
		expect(result).toEqual({ isBlocked: true, reason: "API.ABUSER_BLOCKED" });
	});

	it("blocks abuser when score meets threshold", () => {
		const result = checkTrafficFilter(
			baseInfo({ isAbuser: true, abuserScore: 0.06, companyAbuserScore: 0.03 }),
			{ ...allBlocked, abuserScoreThreshold: 0.05 },
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.ABUSER_BLOCKED" });
	});

	it("allows abuser when score is below threshold", () => {
		const result = checkTrafficFilter(
			baseInfo({
				isAbuser: true,
				abuserScore: 0.0052,
				companyAbuserScore: 0.0273,
			}),
			{ ...allBlocked, abuserScoreThreshold: 0.05 },
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("uses company abuser score when it is higher than ASN score", () => {
		const result = checkTrafficFilter(
			baseInfo({
				isAbuser: true,
				abuserScore: 0.01,
				companyAbuserScore: 0.08,
			}),
			{ ...allBlocked, abuserScoreThreshold: 0.05 },
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.ABUSER_BLOCKED" });
	});

	it("blocks datacenter when blockDatacenter is true", () => {
		const result = checkTrafficFilter(
			baseInfo({ isDatacenter: true }),
			allBlocked,
		);
		expect(result).toEqual({
			isBlocked: true,
			reason: "API.DATACENTER_BLOCKED",
		});
	});

	it("does not block VPN-on-datacenter IPs when blockDatacenter is on but blockVpn is off", () => {
		// Commercial VPNs run on datacenter IPs. Operators who enabled
		// datacenter blocking but not VPN blocking did not intend to
		// catch VPN end-users.
		const result = checkTrafficFilter(
			baseInfo({ isDatacenter: true, isVPN: true }),
			{ ...allBlocked, blockVpn: false },
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("still blocks raw datacenter (non-VPN) IPs when blockDatacenter is on and blockVpn is off", () => {
		const result = checkTrafficFilter(
			baseInfo({ isDatacenter: true, isVPN: false }),
			{ ...allBlocked, blockVpn: false },
		);
		expect(result).toEqual({
			isBlocked: true,
			reason: "API.DATACENTER_BLOCKED",
		});
	});

	it("blocks VPN-on-datacenter IPs as VPN when both filters are enabled", () => {
		// The VPN check runs first and short-circuits before the
		// datacenter rule, so the reason should be VPN_BLOCKED.
		const result = checkTrafficFilter(
			baseInfo({ isDatacenter: true, isVPN: true }),
			allBlocked,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.VPN_BLOCKED" });
	});

	it("blocks mobile when blockMobile is true", () => {
		const result = checkTrafficFilter(baseInfo({ isMobile: true }), allBlocked);
		expect(result).toEqual({ isBlocked: true, reason: "API.MOBILE_BLOCKED" });
	});

	it("blocks satellite when blockSatellite is true", () => {
		const result = checkTrafficFilter(
			baseInfo({ isSatellite: true }),
			allBlocked,
		);
		expect(result).toEqual({
			isBlocked: true,
			reason: "API.SATELLITE_BLOCKED",
		});
	});

	it("blocks crawler when blockCrawler is true", () => {
		const result = checkTrafficFilter(
			baseInfo({ isCrawler: true }),
			allBlocked,
		);
		expect(result).toEqual({ isBlocked: true, reason: "API.CRAWLER_BLOCKED" });
	});

	it("allows traffic when all filters are disabled", () => {
		const result = checkTrafficFilter(baseInfo({ isVPN: true }), {
			blockVpn: false,
			blockProxy: false,
			blockTor: false,
			blockAbuser: false,
			blockDatacenter: false,
			blockMobile: false,
			blockSatellite: false,
			blockCrawler: false,
		});
		expect(result).toEqual({ isBlocked: false });
	});

	it("allows residential IPs through", () => {
		const result = checkTrafficFilter(baseInfo(), allBlocked);
		expect(result).toEqual({ isBlocked: false });
	});

	it("allows through if IP info is missing entirely", () => {
		// `req.ipInfo` is optional — a missing payload (sidecar
		// outage, middleware error) must fall back to allowing the
		// request, not blocking it.
		const result = checkTrafficFilter(undefined, allBlocked);
		expect(result).toEqual({ isBlocked: false });
	});

	it("allows through if IP info is invalid", () => {
		const result = checkTrafficFilter(
			{ isValid: false, error: "lookup failed", ip: "1.2.3.4" },
			allBlocked,
		);
		expect(result).toEqual({ isBlocked: false });
	});

	describe("extraIpInfos", () => {
		const cleanPrimary = baseInfo({ ip: "192.0.2.1" });

		it("blocks when an extra IP is a datacenter", () => {
			const result = checkTrafficFilter(cleanPrimary, allBlocked, [
				baseInfo({ ip: "198.51.100.10", isDatacenter: true }),
			]);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("blocks when an extra IP exceeds the abuser score threshold", () => {
			const result = checkTrafficFilter(
				cleanPrimary,
				{ ...allBlocked, abuserScoreThreshold: 80 },
				[
					baseInfo({
						ip: "203.0.113.10",
						isAbuser: true,
						abuserScore: 95,
					}),
				],
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.ABUSER_BLOCKED",
			});
		});

		it("does NOT apply VPN-datacenter suppression to extra IPs", () => {
			const noVpnBlock: ITrafficFilter = { ...allBlocked, blockVpn: false };
			const result = checkTrafficFilter(cleanPrimary, noVpnBlock, [
				baseInfo({
					ip: "198.51.100.10",
					isVPN: true,
					isDatacenter: true,
				}),
			]);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("does apply VPN-datacenter suppression to the primary IP", () => {
			const noVpnBlock: ITrafficFilter = { ...allBlocked, blockVpn: false };
			const result = checkTrafficFilter(
				baseInfo({ isVPN: true, isDatacenter: true }),
				noVpnBlock,
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("allows through when extra IPs are clean", () => {
			const result = checkTrafficFilter(cleanPrimary, allBlocked, [
				baseInfo({ ip: "8.8.8.8" }),
				baseInfo({ ip: "1.1.1.1" }),
			]);
			expect(result).toEqual({ isBlocked: false });
		});

		it("ignores undefined / invalid entries in the extras list", () => {
			const result = checkTrafficFilter(cleanPrimary, allBlocked, [
				undefined,
				{ isValid: false, error: "lookup failed", ip: "1.2.3.4" },
				baseInfo({ ip: "198.51.100.10", isDatacenter: true }),
			]);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("primary block takes precedence over extra block", () => {
			const result = checkTrafficFilter(baseInfo({ isTor: true }), allBlocked, [
				baseInfo({ ip: "198.51.100.10", isDatacenter: true }),
			]);
			expect(result).toEqual({ isBlocked: true, reason: "API.TOR_BLOCKED" });
		});
	});
});
