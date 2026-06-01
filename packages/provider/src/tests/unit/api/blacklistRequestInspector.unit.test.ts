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
	type AccessRulesStorage,
} from "@prosopo/user-access-policy";
import { describe, expect, it, vi } from "vitest";
import {
	BlacklistRequestInspector,
	getRequestUserScope,
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
