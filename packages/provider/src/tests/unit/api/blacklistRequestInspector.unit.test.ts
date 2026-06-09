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

import type { Logger } from "@prosopo/logger";
import type { IPInfoResponse } from "@prosopo/types";
import {
	AccessPolicyType,
	type AccessRule,
	type AccessRulesStorage,
	type UserScope,
} from "@prosopo/user-access-policy";
import { describe, expect, it, vi } from "vitest";
import {
	BlacklistRequestInspector,
	getRequestUserScope,
	rankCandidateRules,
} from "../../../api/blacklistRequestInspector.js";

describe("getRequestUserScope", () => {
	it("should return a user scope with ja4Hash and userAgent and ip and userId", () => {
		const ja4 = "t13d1516h2_8daaf6152771_8eba31f8906f";
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const user = "testuser";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, ja4, rawIp, user);
		expect(userScope).toEqual({
			ja4Hash: ja4,
			userAgent: userAgent,
			ip: rawIp,
			userId: "testuser",
		});
	});
	it("should return a user scope with ja4Hash and userAgent and ip", () => {
		const ja4 = "t13d1516h2_8daaf6152771_8eba31f8906f";
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, ja4, rawIp);
		expect(userScope).toEqual({
			ja4Hash: ja4,
			userAgent: userAgent,
			ip: rawIp,
		});
	});
	it("should return a user scope with userAgent and ip", () => {
		const userAgent = "testuseragent1";
		const rawIp = "1.1.1.1";
		const requestHeaders = {
			"user-agent": userAgent,
			"X-Forwarded-For": rawIp,
		};
		const userScope = getRequestUserScope(requestHeaders, undefined, rawIp);
		expect(userScope).toEqual({
			userAgent: userAgent,
			ip: rawIp,
		});
	});
	it("should return a user scope with userAgent", () => {
		const userAgent = "testuseragent1";
		const requestHeaders = {
			"user-agent": userAgent,
		};
		const userScope = getRequestUserScope(requestHeaders);
		expect(userScope).toEqual({
			userAgent: userAgent,
		});
	});

	it("should include countryCode in the scope when provided", () => {
		const userScope = getRequestUserScope(
			{ "user-agent": "ua" },
			"ja4",
			"1.1.1.1",
			"user1",
			undefined,
			undefined,
			"DE",
		);
		expect(userScope.countryCode).toBe("DE");
	});
});

describe("BlacklistRequestInspector.shouldAbortRequest", () => {
	const mockLogger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	} as unknown as Logger;

	const buildStorage = (
		findRules: (filter: unknown) => Promise<unknown[]>,
	): AccessRulesStorage =>
		({
			findRules: vi.fn().mockImplementation(findRules),
		}) as unknown as AccessRulesStorage;

	const validIpInfo = (countryCode: string): IPInfoResponse => ({
		ip: "1.1.1.1",
		isValid: true,
		isVPN: false,
		isTor: false,
		isProxy: false,
		isDatacenter: false,
		isAbuser: false,
		isMobile: false,
		isSatellite: false,
		isCrawler: false,
		countryCode,
	});

	it("threads req.ipInfo.countryCode into the access-rule lookup", async () => {
		const seenScopes: Array<Record<string, unknown>> = [];
		const storage = buildStorage(async (filter) => {
			const f = filter as { userScope: Record<string, unknown> };
			seenScopes.push(f.userScope);
			return [];
		});
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
		);

		await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			"ja4hash",
			{},
			{},
			mockLogger,
			validIpInfo("DE"),
		);

		// At least one of the prioritised sub-scopes must carry the
		// countryCode — otherwise country-based rules can never fire
		// at the earliest entry point (blockMiddleware).
		const hasCountry = seenScopes.some((scope) => scope.countryCode === "DE");
		expect(hasCountry).toBe(true);
	});

	it("does not pass countryCode when req.ipInfo is missing", async () => {
		const seenScopes: Array<Record<string, unknown>> = [];
		const storage = buildStorage(async (filter) => {
			const f = filter as { userScope: Record<string, unknown> };
			seenScopes.push(f.userScope);
			return [];
		});
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
		);

		await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			"ja4hash",
			{},
			{},
			mockLogger,
			undefined,
		);

		const anyCountry = seenScopes.some((scope) => "countryCode" in scope);
		expect(anyCountry).toBe(false);
	});

	it("does not pass countryCode when req.ipInfo is an error response", async () => {
		const seenScopes: Array<Record<string, unknown>> = [];
		const storage = buildStorage(async (filter) => {
			const f = filter as { userScope: Record<string, unknown> };
			seenScopes.push(f.userScope);
			return [];
		});
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
		);

		await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			"ja4hash",
			{},
			{},
			mockLogger,
			{ isValid: false, error: "lookup failed", ip: "1.1.1.1" },
		);

		const anyCountry = seenScopes.some((scope) => "countryCode" in scope);
		expect(anyCountry).toBe(false);
	});

	it("aborts the request when a Block policy matches on country", async () => {
		const storage = buildStorage(async (filter) => {
			// Return a Block policy iff the scope matches our country
			const f = filter as { userScope: { countryCode?: string } };
			if (f.userScope.countryCode === "DE") {
				return [{ type: AccessPolicyType.Block }];
			}
			return [];
		});
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			"ja4hash",
			{},
			{},
			mockLogger,
			validIpInfo("DE"),
		);
		expect(shouldAbort).toBe(true);
	});
});

describe("rankCandidateRules", () => {
	const request: UserScope = {
		ja4Hash: "ja4-A",
		userAgentHash: "ua-X",
		numericIp: 16909060n, // 1.2.3.4
		asn: 205016,
	};

	it("rejects a rule whose IP doesn't match the request, even if ja4 does", () => {
		// The user-stated worst case: rule with ja4 AND ip, greedy query
		// returns it because ja4 matches, but the IP doesn't.
		const ruleA: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
			numericIp: 99999n,
		};
		const ranked = rankCandidateRules([ruleA], request, undefined);
		expect(ranked).toEqual([]);
	});

	it("accepts a rule whose populated fields all match", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
			numericIp: 16909060n,
		};
		const ranked = rankCandidateRules([rule], request, undefined);
		expect(ranked).toEqual([rule]);
	});

	it("accepts a CIDR rule when request IP is in range", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
			numericIpMaskMin: 16909000n,
			numericIpMaskMax: 16910000n,
		};
		const ranked = rankCandidateRules([rule], request, undefined);
		expect(ranked).toEqual([rule]);
	});

	it("rejects a CIDR rule when request IP is outside range", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			numericIpMaskMin: 99000n,
			numericIpMaskMax: 99999n,
		};
		const ranked = rankCandidateRules([rule], request, undefined);
		expect(ranked).toEqual([]);
	});

	it("ranks more-specific rules first (more populated fields wins)", () => {
		const broad: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
		};
		const specific: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
			asn: 205016,
		};
		const ranked = rankCandidateRules([broad, specific], request, undefined);
		expect(ranked).toEqual([specific, broad]);
	});

	it("ranks a client-scoped rule above a global rule of equal user-scope specificity", () => {
		const global: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
		};
		const clientScoped: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "site-1",
			ja4Hash: "ja4-A",
		};
		const ranked = rankCandidateRules(
			[global, clientScoped],
			request,
			"site-1",
		);
		expect(ranked[0]).toEqual(clientScoped);
		expect(ranked[1]).toEqual(global);
	});

	it("rejects a client-scoped rule whose clientId doesn't match the request", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			clientId: "site-2",
			ja4Hash: "ja4-A",
		};
		const ranked = rankCandidateRules([rule], request, "site-1");
		expect(ranked).toEqual([]);
	});

	it("accepts a global rule (no clientId) when no request clientId is passed", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
		};
		const ranked = rankCandidateRules([rule], request, undefined);
		expect(ranked).toEqual([rule]);
	});

	it("accepts a rule with no user-scope fields (matches every request)", () => {
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
		};
		const ranked = rankCandidateRules([rule], request, undefined);
		expect(ranked).toEqual([rule]);
	});

	it("rejects a rule that requires a field the request doesn't have", () => {
		// Request has no headHash. Rule requires headHash. Should reject.
		const rule: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
			headHash: "hash-X",
		};
		const ranked = rankCandidateRules([rule], request, undefined);
		expect(ranked).toEqual([]);
	});

	it("on equal specificity, Block wins over Restrict (safety tiebreaker)", () => {
		const restrict: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
		};
		const block: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
		};
		// Pass them in restrict-first order — block must still come first.
		const ranked = rankCandidateRules([restrict, block], request, undefined);
		expect(ranked[0]).toEqual(block);
		expect(ranked[1]).toEqual(restrict);
	});

	it("specificity still beats severity (a more-specific Restrict beats a less-specific Block)", () => {
		// A Restrict matching ja4 + asn (2 fields) outranks a Block matching
		// only ja4 (1 field) — the operator intentionally narrowed the policy
		// for this combination.
		const broadBlock: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
		};
		const specificRestrict: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			asn: 205016,
		};
		const ranked = rankCandidateRules(
			[broadBlock, specificRestrict],
			request,
			undefined,
		);
		expect(ranked[0]).toEqual(specificRestrict);
	});
});
