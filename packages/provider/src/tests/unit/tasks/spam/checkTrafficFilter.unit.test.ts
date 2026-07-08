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
	skipExtrasOnValidDnsPath: false,
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

	it("does not block proxy-on-datacenter IPs when blockDatacenter is on but blockProxy is off", () => {
		const result = checkTrafficFilter(
			baseInfo({ isDatacenter: true, isProxy: true }),
			{ ...allBlocked, blockProxy: false },
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("does not block Tor-on-datacenter IPs when blockDatacenter is on but blockTor is off", () => {
		const result = checkTrafficFilter(
			baseInfo({ isDatacenter: true, isTor: true }),
			{ ...allBlocked, blockTor: false },
		);
		expect(result).toEqual({ isBlocked: false });
	});

	it("does not block crawler-on-datacenter IPs when blockDatacenter is on but blockCrawler is off", () => {
		// Search crawlers live on datacenter infra by definition. If the
		// operator opted crawlers in, the datacenter rule shouldn't catch
		// them out the back door.
		const result = checkTrafficFilter(
			baseInfo({ isDatacenter: true, isCrawler: true }),
			{ ...allBlocked, blockCrawler: false },
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

		it("applies VPN-datacenter suppression to extra IPs when blockVpn is off", () => {
			// A VPN user's DNS resolver typically sits on the VPN provider's
			// datacenter range. If the operator hasn't opted into blocking
			// VPN traffic, that resolver shouldn't drop the request either
			// — the extras must honour the same VPN toggle as the primary.
			const noVpnBlock: ITrafficFilter = { ...allBlocked, blockVpn: false };
			const result = checkTrafficFilter(cleanPrimary, noVpnBlock, [
				baseInfo({
					ip: "198.51.100.10",
					isVPN: true,
					isDatacenter: true,
				}),
			]);
			expect(result).toEqual({ isBlocked: false });
		});

		it("still blocks a datacenter extra that is not a VPN when blockVpn is off", () => {
			const noVpnBlock: ITrafficFilter = { ...allBlocked, blockVpn: false };
			const result = checkTrafficFilter(cleanPrimary, noVpnBlock, [
				baseInfo({
					ip: "198.51.100.10",
					isVPN: false,
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

		it("does not check the crawler flag on extra IPs even when blockCrawler is on", () => {
			// Google 8.8.8.8 and Cloudflare 1.1.1.1 share IP space with
			// search crawlers, so is_crawler=true on a resolver would
			// false-positive block ordinary users.
			const result = checkTrafficFilter(cleanPrimary, allBlocked, [
				baseInfo({ ip: "8.8.8.8", isCrawler: true }),
			]);
			expect(result).toEqual({ isBlocked: false });
		});

		it("still blocks the crawler flag on the primary IP when an extra is present", () => {
			const result = checkTrafficFilter(
				baseInfo({ isCrawler: true }),
				allBlocked,
				[baseInfo({ ip: "8.8.8.8" })],
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.CRAWLER_BLOCKED",
			});
		});

		it("applies proxy-datacenter suppression to extra IPs when blockProxy is off", () => {
			const noProxyBlock: ITrafficFilter = { ...allBlocked, blockProxy: false };
			const result = checkTrafficFilter(cleanPrimary, noProxyBlock, [
				baseInfo({
					ip: "198.51.100.10",
					isProxy: true,
					isDatacenter: true,
				}),
			]);
			expect(result).toEqual({ isBlocked: false });
		});

		it("applies Tor-datacenter suppression to extra IPs when blockTor is off", () => {
			const noTorBlock: ITrafficFilter = { ...allBlocked, blockTor: false };
			const result = checkTrafficFilter(cleanPrimary, noTorBlock, [
				baseInfo({
					ip: "198.51.100.10",
					isTor: true,
					isDatacenter: true,
				}),
			]);
			expect(result).toEqual({ isBlocked: false });
		});

		it("applies crawler-datacenter suppression to extra IPs when blockCrawler is off", () => {
			const noCrawlerBlock: ITrafficFilter = {
				...allBlocked,
				blockCrawler: false,
			};
			const result = checkTrafficFilter(cleanPrimary, noCrawlerBlock, [
				baseInfo({
					ip: "198.51.100.10",
					isCrawler: true,
					isDatacenter: true,
				}),
			]);
			expect(result).toEqual({ isBlocked: false });
		});
	});

	describe("datacenterNameAllowlist", () => {
		it("suppresses datacenter block when name matches the allowlist", () => {
			// iCloud Private Relay exits from datacenter IPs but the users
			// behind them are real humans, so an operator can allowlist the
			// datacenter name reported by upstream and still keep the rest
			// of the datacenter block on.
			const result = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					datacenterName: "iCloud Private Relay",
				}),
				{ ...allBlocked, datacenterNameAllowlist: ["iCloud Private Relay"] },
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("matches the allowlist case-insensitively and ignores whitespace", () => {
			const result = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					datacenterName: "  iCloud Private Relay  ",
				}),
				{
					...allBlocked,
					datacenterNameAllowlist: ["icloud private relay"],
				},
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("still blocks datacenter IPs whose name does not match", () => {
			const result = checkTrafficFilter(
				baseInfo({ isDatacenter: true, datacenterName: "Amazon AWS" }),
				{ ...allBlocked, datacenterNameAllowlist: ["iCloud Private Relay"] },
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("still blocks datacenter IPs that report no datacenter name", () => {
			// Operators can only opt traffic out by name. A missing name
			// must keep behaving like before the allowlist existed.
			const result = checkTrafficFilter(baseInfo({ isDatacenter: true }), {
				...allBlocked,
				datacenterNameAllowlist: ["iCloud Private Relay"],
			});
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("preserves the legacy behavior when the allowlist is missing or empty", () => {
			const missing = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					datacenterName: "iCloud Private Relay",
				}),
				allBlocked,
			);
			expect(missing).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});

			const empty = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					datacenterName: "iCloud Private Relay",
				}),
				{ ...allBlocked, datacenterNameAllowlist: [] },
			);
			expect(empty).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("does not suppress non-datacenter blocks for the same IP", () => {
			// Allowlist must not become a backdoor: a VPN or Tor exit that
			// also reports an allowlisted datacenter name should still
			// trip whichever earlier rule fires first.
			const torResult = checkTrafficFilter(
				baseInfo({
					isTor: true,
					isDatacenter: true,
					datacenterName: "iCloud Private Relay",
				}),
				{ ...allBlocked, datacenterNameAllowlist: ["iCloud Private Relay"] },
			);
			expect(torResult).toEqual({
				isBlocked: true,
				reason: "API.TOR_BLOCKED",
			});

			const vpnResult = checkTrafficFilter(
				baseInfo({
					isVPN: true,
					isDatacenter: true,
					datacenterName: "iCloud Private Relay",
				}),
				{ ...allBlocked, datacenterNameAllowlist: ["iCloud Private Relay"] },
			);
			expect(vpnResult).toEqual({
				isBlocked: true,
				reason: "API.VPN_BLOCKED",
			});
		});

		it("applies the allowlist to extra IPs as well", () => {
			const result = checkTrafficFilter(
				baseInfo({ ip: "192.0.2.1" }),
				{ ...allBlocked, datacenterNameAllowlist: ["iCloud Private Relay"] },
				[
					baseInfo({
						ip: "198.51.100.10",
						isDatacenter: true,
						datacenterName: "iCloud Private Relay",
					}),
				],
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("matches the allowlist against providerName when datacenterName is absent", () => {
			// Upstream often sets is_datacenter without setting
			// datacenter.datacenter; company.name (providerName) is the
			// next-best fallback.
			const result = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					providerName: "iCloud Private Relay",
				}),
				{ ...allBlocked, datacenterNameAllowlist: ["iCloud Private Relay"] },
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("matches the allowlist against asnOrganization when neither datacenterName nor providerName carries the operator", () => {
			const result = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					asnOrganization: "Cloudflare, Inc.",
				}),
				{ ...allBlocked, datacenterNameAllowlist: ["Cloudflare, Inc."] },
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("still blocks datacenter IPs that carry none of the three name fields", () => {
			const result = checkTrafficFilter(baseInfo({ isDatacenter: true }), {
				...allBlocked,
				datacenterNameAllowlist: ["iCloud Private Relay"],
			});
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});
	});

	describe("providerType ISP suppression", () => {
		it("does not block datacenter IPs whose providerType is 'isp'", () => {
			// Consumer ISPs (e.g. Afrihost, Comcast) are sometimes flagged
			// is_datacenter=true by upstream but their eyeball ranges carry
			// real end-users.
			const result = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					providerType: "isp",
					providerName: "afrihost.co.za",
					asnOrganization: "AFRIHOST SP (PTY) LTD",
				}),
				allBlocked,
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("still blocks datacenter IPs when providerType is 'hosting'", () => {
			const result = checkTrafficFilter(
				baseInfo({ isDatacenter: true, providerType: "hosting" }),
				allBlocked,
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("still blocks datacenter IPs when providerType is missing", () => {
			// Preserves the pre-fix behavior for upstream responses that
			// don't carry providerType at all.
			const result = checkTrafficFilter(
				baseInfo({ isDatacenter: true }),
				allBlocked,
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("does not let ISP classification bypass earlier rules", () => {
			// The ISP suppression only affects the datacenter rule. A Tor
			// exit or VPN that also reports providerType='isp' must still
			// trip whichever earlier rule fires first.
			const torResult = checkTrafficFilter(
				baseInfo({
					isTor: true,
					isDatacenter: true,
					providerType: "isp",
				}),
				allBlocked,
			);
			expect(torResult).toEqual({
				isBlocked: true,
				reason: "API.TOR_BLOCKED",
			});

			const vpnResult = checkTrafficFilter(
				baseInfo({
					isVPN: true,
					isDatacenter: true,
					providerType: "isp",
				}),
				allBlocked,
			);
			expect(vpnResult).toEqual({
				isBlocked: true,
				reason: "API.VPN_BLOCKED",
			});
		});

		it("applies ISP suppression to extra IPs as well", () => {
			const result = checkTrafficFilter(
				baseInfo({ ip: "192.0.2.1" }),
				allBlocked,
				[
					baseInfo({
						ip: "198.51.100.10",
						isDatacenter: true,
						providerType: "isp",
					}),
				],
			);
			expect(result).toEqual({ isBlocked: false });
		});
	});

	describe("skipExtrasOnValidDnsPath", () => {
		it("skips the extras evaluation when the catcher confirmed a valid DNS path and the setting is on", () => {
			const result = checkTrafficFilter(
				baseInfo({ ip: "192.0.2.1" }),
				{ ...allBlocked, skipExtrasOnValidDnsPath: true },
				[
					baseInfo({
						ip: "162.158.213.93",
						isDatacenter: true,
						asnOrganization: "Cloudflare, Inc.",
					}),
				],
				true,
			);
			expect(result).toEqual({ isBlocked: false });
		});

		it("still evaluates extras when the setting is off, even if pathValid is true", () => {
			const result = checkTrafficFilter(
				baseInfo({ ip: "192.0.2.1" }),
				{ ...allBlocked, skipExtrasOnValidDnsPath: false },
				[
					baseInfo({
						ip: "162.158.213.93",
						isDatacenter: true,
						asnOrganization: "Cloudflare, Inc.",
					}),
				],
				true,
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("still evaluates extras when the setting is on but the DNS path did not validate", () => {
			const result = checkTrafficFilter(
				baseInfo({ ip: "192.0.2.1" }),
				{ ...allBlocked, skipExtrasOnValidDnsPath: true },
				[
					baseInfo({
						ip: "162.158.213.93",
						isDatacenter: true,
						asnOrganization: "Cloudflare, Inc.",
					}),
				],
				false,
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("still evaluates extras when the setting is on but pathValid is undefined", () => {
			const result = checkTrafficFilter(
				baseInfo({ ip: "192.0.2.1" }),
				{ ...allBlocked, skipExtrasOnValidDnsPath: true },
				[
					baseInfo({
						ip: "162.158.213.93",
						isDatacenter: true,
						asnOrganization: "Cloudflare, Inc.",
					}),
				],
				undefined,
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});

		it("still blocks on the primary IP regardless of pathValid", () => {
			const result = checkTrafficFilter(
				baseInfo({
					isDatacenter: true,
					datacenterName: "Amazon AWS",
				}),
				{ ...allBlocked, skipExtrasOnValidDnsPath: true },
				[],
				true,
			);
			expect(result).toEqual({
				isBlocked: true,
				reason: "API.DATACENTER_BLOCKED",
			});
		});
	});
});
