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
import {
	CaptchaType,
	FrictionlessReason,
	type IPInfoResponse,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import {
	AccessPolicyType,
	type AccessRule,
	type AccessRulesStorage,
	type UserScope,
} from "@prosopo/user-access-policy";
import type { NextFunction, Request, Response } from "express";
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
			os: "unknown",
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
			os: "unknown",
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
			os: "unknown",
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
			os: "unknown",
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

	it("threads the OS classified from the request UA into the access-rule lookup", async () => {
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
			{
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			},
			{},
			mockLogger,
			validIpInfo("DE"),
		);

		// OS is classified server-side from the UA, so an os-based access rule
		// can fire at the earliest entry point (blockMiddleware).
		const hasOs = seenScopes.some((scope) => scope.os === "windows");
		expect(hasOs).toBe(true);
	});

	it("always classifies an OS (falls back to 'unknown') so allow-list rules can match unrecognised UAs", async () => {
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

		expect(seenScopes.length).toBeGreaterThan(0);
		expect(seenScopes.every((scope) => scope.os === "unknown")).toBe(true);
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

	// A Block policy with deferToVerify=true is the verify-time-only block:
	// the request must pass blockMiddleware unimpeded (so the captcha
	// challenge is served), and the block fires later at the verify step
	// via CaptchaManager.checkForHardBlock. If middleware aborted here, the
	// captcha widget would 401 client-side and the bot would never reach
	// the verify path that's supposed to gather their behavioural data.
	it("does NOT abort the request when the only matching Block policy has deferToVerify=true", async () => {
		const storage = buildStorage(async () => [
			{
				type: AccessPolicyType.Block,
				deferToVerify: true,
			},
		]);
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
		expect(shouldAbort).toBe(false);
	});

	// Defence in depth: a Restrict policy with deferToVerify=true also gets
	// filtered out at middleware time. Restrict-with-deferToVerify isn't a
	// pattern the rule-writer emits today (deferToVerify is currently only
	// meaningful on Block), but the filter is policy-type-agnostic so the
	// behaviour shouldn't depend on type.
	it("does NOT abort when only matching policy is Restrict + deferToVerify", async () => {
		const storage = buildStorage(async () => [
			{
				type: AccessPolicyType.Restrict,
				deferToVerify: true,
			},
		]);
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
		expect(shouldAbort).toBe(false);
	});

	// Mixed result: a deferToVerify=true policy must NOT bury a non-deferred
	// Block policy that also matches. The filter strips deferred policies
	// before the top-pick, so the remaining non-deferred Block still
	// surfaces and aborts the request. Without this, an operator who set
	// deferToVerify on a high-specificity rule would accidentally suppress
	// the lower-specificity hard block on the same scope.
	it("aborts when a deferToVerify policy coexists with a non-deferred Block policy", async () => {
		const storage = buildStorage(async () => [
			{
				type: AccessPolicyType.Block,
				deferToVerify: true,
				ja4Hash: "ja4hash",
			},
			{
				type: AccessPolicyType.Block,
			},
		]);
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

// Coverage for the synthetic blocked-session persistence + structured log
// the inspector emits at the 401 decision point. Separate `describe` so the
// fixtures (a stub `IProviderDatabase` with a spyable storeBlockedSession,
// and a logger that records arguments) don't bleed into the abort-decision
// fixtures above.
describe("BlacklistRequestInspector blocked-session persistence", () => {
	// Logger stub that captures the lazy log payloads so individual assertions
	// can inspect what was logged without depending on call order across
	// info/debug/warn calls.
	const captureLogger = () => {
		const calls: Array<{
			level: "info" | "warn" | "error" | "debug";
			payload: ReturnType<() => Record<string, unknown>>;
		}> = [];
		const lvl = (level: "info" | "warn" | "error" | "debug") =>
			vi.fn((fn: () => Record<string, unknown>) => {
				calls.push({ level, payload: fn() });
			});
		return {
			logger: {
				info: lvl("info"),
				warn: lvl("warn"),
				error: lvl("error"),
				debug: lvl("debug"),
			} as unknown as Logger,
			calls,
		};
	};

	const buildStorage = (rules: Partial<AccessRule>[]): AccessRulesStorage =>
		({
			findRules: vi.fn().mockResolvedValue(rules),
		}) as unknown as AccessRulesStorage;

	const buildDb = (
		impl?: (session: unknown) => Promise<void>,
	): { db: IProviderDatabase; spy: ReturnType<typeof vi.fn> } => {
		const spy = vi.fn(impl ?? (async () => undefined));
		return {
			db: { storeBlockedSession: spy } as unknown as IProviderDatabase,
			spy,
		};
	};

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

	const BOT_JA4 = "t13d1313h2_f57a46bbacb6_7f0f34a4126d";
	const BOT_UA =
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15";

	it("emits a structured 'Access policy block' log line on Block decisions, carrying the matched rule's identity", async () => {
		const { logger, calls } = captureLogger();
		const storage = buildStorage([
			{
				type: AccessPolicyType.Block,
				ja4Hash: BOT_JA4,
				description: "ja4 block — custom (Twickets-targeted)",
			},
		]);
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			BOT_JA4,
			{ "user-agent": BOT_UA, "prosopo-site-key": "sk-twickets" },
			{},
			logger,
			validIpInfo("GB"),
		);
		expect(shouldAbort).toBe(true);

		const blockLog = calls.find((c) => c.payload.msg === "Access policy block");
		expect(blockLog).toBeDefined();
		const data = blockLog?.payload.data as Record<string, unknown>;
		expect(data.policyType).toBe(AccessPolicyType.Block);
		expect(typeof data.ruleHash).toBe("string");
		// Rule was scoped only on ja4Hash — derived ruleType reflects that.
		expect(data.ruleType).toEqual(["ja4Hash"]);
		expect(data.ruleDescription).toBe("ja4 block — custom (Twickets-targeted)");
		const userScope = data.userScope as Record<string, unknown>;
		expect(userScope.ja4).toBe(BOT_JA4);
		expect(userScope.userAgent).toBe(BOT_UA);
		expect(userScope.ip).toBe("1.1.1.1");
		expect(userScope.countryCode).toBe("GB");
	});

	it("calls db.storeBlockedSession with blocked=true, ACCESS_POLICY_BLOCK reason and the rule identity on Block decisions", async () => {
		const { logger } = captureLogger();
		const { db, spy } = buildDb();
		const storage = buildStorage([
			{
				type: AccessPolicyType.Block,
				ja4Hash: BOT_JA4,
				description: "ja4 block — Solver",
			},
		]);
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
			db,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			BOT_JA4,
			{ "user-agent": BOT_UA },
			{},
			logger,
			validIpInfo("GB"),
		);
		expect(shouldAbort).toBe(true);
		// Fire-and-forget — give the microtask queue a tick to drain the
		// void'd promise before asserting on the spy.
		await Promise.resolve();
		expect(spy).toHaveBeenCalledTimes(1);
		const written = spy.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(written.reason).toBe(FrictionlessReason.ACCESS_POLICY_BLOCK);
		expect(written.ruleHash).toEqual(expect.any(String));
		expect(written.ruleType).toEqual(["ja4Hash"]);
		expect(written.ruleDescription).toBe("ja4 block — Solver");
		const headers = written.headers as Record<string, unknown>;
		expect(headers["user-agent"]).toBe(BOT_UA);
		// Sentinel required-field values that the request never reached
		// the point of populating — asserted so the schema-required fields
		// can never silently regress to undefined and trip Mongoose
		// validation at write time.
		expect(written.score).toBe(1);
		expect(written.threshold).toBe(0);
		expect(written.captchaType).toBe("frictionless");
		const result = written.result as Record<string, unknown>;
		expect(result.status).toBe("Disapproved");
	});

	it("does NOT call storeBlockedSession when no rule matches", async () => {
		const { logger } = captureLogger();
		const { db, spy } = buildDb();
		const storage = buildStorage([]); // no rules match
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
			db,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			"clean-ja4",
			{ "user-agent": "clean-ua" },
			{},
			logger,
			validIpInfo("GB"),
		);
		expect(shouldAbort).toBe(false);
		await Promise.resolve();
		expect(spy).not.toHaveBeenCalled();
	});

	it("does NOT call storeBlockedSession when matched policy is Restrict (not Block)", async () => {
		const { logger } = captureLogger();
		const { db, spy } = buildDb();
		const storage = buildStorage([
			{
				type: AccessPolicyType.Restrict,
				ja4Hash: BOT_JA4,
				description: "restrict — higher image rounds",
			},
		]);
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
			db,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			BOT_JA4,
			{ "user-agent": BOT_UA },
			{},
			logger,
			validIpInfo("GB"),
		);
		// Restrict policies don't 401 at middleware — they let the request
		// through with modified captcha params; the downstream captcha-
		// creation path then writes a normal session record. So no
		// blocked-session doc should be created here.
		expect(shouldAbort).toBe(false);
		await Promise.resolve();
		expect(spy).not.toHaveBeenCalled();
	});

	it("does NOT call storeBlockedSession when only matching Block policy has deferToVerify=true", async () => {
		const { logger } = captureLogger();
		const { db, spy } = buildDb();
		const storage = buildStorage([
			{
				type: AccessPolicyType.Block,
				deferToVerify: true,
				ja4Hash: BOT_JA4,
				description: "deferred ja4 block",
			},
		]);
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
			db,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			BOT_JA4,
			{ "user-agent": BOT_UA },
			{},
			logger,
			validIpInfo("GB"),
		);
		// deferToVerify policies are filtered before the block decision so
		// the request passes through unimpeded — the verify-step path
		// already writes its own commitment record.
		expect(shouldAbort).toBe(false);
		await Promise.resolve();
		expect(spy).not.toHaveBeenCalled();
	});

	it("still 401s when storeBlockedSession rejects (DB write must not block the response)", async () => {
		const { logger, calls } = captureLogger();
		const { db } = buildDb(async () => {
			throw new Error("simulated mongo failure");
		});
		const storage = buildStorage([
			{
				type: AccessPolicyType.Block,
				ja4Hash: BOT_JA4,
				description: "ja4 block — Solver",
			},
		]);
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
			db,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			BOT_JA4,
			{ "user-agent": BOT_UA },
			{},
			logger,
			validIpInfo("GB"),
		);
		// The block decision returns synchronously; the void'd promise can
		// reject in the background without affecting the 401.
		expect(shouldAbort).toBe(true);
		// Structured "Access policy block" log line still landed.
		expect(calls.some((c) => c.payload.msg === "Access policy block")).toBe(
			true,
		);
	});

	it("works without a db dependency — log fires, no persistence attempt", async () => {
		const { logger, calls } = captureLogger();
		const storage = buildStorage([
			{
				type: AccessPolicyType.Block,
				ja4Hash: BOT_JA4,
				description: "ja4 block — Solver",
			},
		]);
		// Constructor with the legacy 2-arg form (no db) — existing
		// production code paths that construct the inspector without a db
		// must keep working.
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			BOT_JA4,
			{ "user-agent": BOT_UA },
			{},
			logger,
			validIpInfo("GB"),
		);
		expect(shouldAbort).toBe(true);
		expect(calls.some((c) => c.payload.msg === "Access policy block")).toBe(
			true,
		);
	});

	it("derives ruleType as ['ip'] when the rule scopes on numericIp", async () => {
		const { logger } = captureLogger();
		const { db, spy } = buildDb();
		// 1.1.1.1 == 16843009 as a big-int integer-encoded IPv4.
		const storage = buildStorage([
			{
				type: AccessPolicyType.Block,
				numericIp: 16843009n,
				description: "single-IP block — 1.1.1.1",
			},
		]);
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
			db,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			"unrelated-ja4",
			{ "user-agent": BOT_UA },
			{},
			logger,
			validIpInfo("GB"),
		);
		expect(shouldAbort).toBe(true);
		await Promise.resolve();
		const written = spy.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(written.ruleType).toEqual(["ip"]);
	});

	it("derives ruleType as ['ipMask'] when the rule scopes on a CIDR range", async () => {
		const { logger } = captureLogger();
		const { db, spy } = buildDb();
		// 1.1.1.0/24 → numericIpMaskMin=16843008, max=16843263
		const storage = buildStorage([
			{
				type: AccessPolicyType.Block,
				numericIpMaskMin: 16843008n,
				numericIpMaskMax: 16843263n,
				description: "CIDR block 1.1.1.0/24",
			},
		]);
		const inspector = new BlacklistRequestInspector(
			storage,
			async () => undefined,
			db,
		);

		const shouldAbort = await inspector.shouldAbortRequest(
			"/v1/prosopo/provider/client/captcha/frictionless",
			"1.1.1.1",
			"unrelated-ja4",
			{ "user-agent": BOT_UA },
			{},
			logger,
			validIpInfo("GB"),
		);
		expect(shouldAbort).toBe(true);
		await Promise.resolve();
		const written = spy.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(written.ruleType).toEqual(["ipMask"]);
	});
});

describe("BlacklistRequestInspector.abortRequestForBlockedUsers", () => {
	const mockLogger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	} as unknown as Logger;

	const buildResponse = (): {
		res: Response;
		status: ReturnType<typeof vi.fn>;
		json: ReturnType<typeof vi.fn>;
	} => {
		const json = vi.fn();
		const status = vi.fn(() => ({ json }));
		return { res: { status } as unknown as Response, status, json };
	};

	const buildRequest = (overrides: Partial<Request>): Request =>
		({
			ip: "1.1.1.1",
			url: "/v1/prosopo/provider/client/captcha/frictionless",
			ja4: "unrelated-ja4",
			headers: {},
			body: {},
			logger: mockLogger,
			...overrides,
		}) as unknown as Request;

	it("responds 403 Forbidden and does not call next() when the request is denied", async () => {
		// Missing IP on an api route is a deny path in shouldAbortRequest, so
		// no storage/rules setup is needed to exercise the abort response.
		const inspector = new BlacklistRequestInspector(
			{
				findRules: vi.fn().mockResolvedValue([]),
			} as unknown as AccessRulesStorage,
			async () => undefined,
		);
		const { res, status, json } = buildResponse();
		const next: NextFunction = vi.fn();

		await inspector.abortRequestForBlockedUsers(
			buildRequest({ ip: "" }),
			res,
			next,
		);

		expect(status).toHaveBeenCalledWith(403);
		expect(json).toHaveBeenCalledWith({ error: "Forbidden" });
		expect(next).not.toHaveBeenCalled();
	});

	it("calls next() and does not write a status when the request is allowed", async () => {
		const inspector = new BlacklistRequestInspector(
			{
				findRules: vi.fn().mockResolvedValue([]),
			} as unknown as AccessRulesStorage,
			async () => undefined,
		);
		const { res, status } = buildResponse();
		const next: NextFunction = vi.fn();

		// Non-api route short-circuits shouldAbortRequest to false (allow).
		await inspector.abortRequestForBlockedUsers(
			buildRequest({ url: "/favicon.ico" }),
			res,
			next,
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(status).not.toHaveBeenCalled();
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

	// Issue #3713: at equal specificity, harshness picks the winner.
	// Ordering: Block > Restrict[image, rounds DESC] > Restrict[puzzle] >
	// Restrict[pow]. Specificity stays the primary criterion — these tests
	// use equal-specificity setups to isolate the new tiebreaker.

	it("on equal specificity, ranks Restrict tiers as image > puzzle > pow", () => {
		const powRule: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.pow,
		};
		const puzzleRule: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.puzzle,
		};
		const imageRule: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.image,
		};
		const ranked = rankCandidateRules(
			[powRule, puzzleRule, imageRule],
			request,
			undefined,
		);
		expect(ranked).toEqual([imageRule, puzzleRule, powRule]);
	});

	it("on equal specificity, image with more solvedImagesCount is harsher", () => {
		const twoRounds: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.image,
			solvedImagesCount: 2,
		};
		const fourRounds: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.image,
			solvedImagesCount: 4,
		};
		const ranked = rankCandidateRules(
			[twoRounds, fourRounds],
			request,
			undefined,
		);
		expect(ranked[0]).toEqual(fourRounds);
		expect(ranked[1]).toEqual(twoRounds);
	});

	it("on equal specificity, Block beats every Restrict captcha tier", () => {
		const block: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
		};
		const image: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.image,
			solvedImagesCount: 9,
		};
		const ranked = rankCandidateRules([image, block], request, undefined);
		expect(ranked[0]).toEqual(block);
	});

	// `deferToVerify` is a fire-time flag, not a harshness signal — a
	// deferred Block at equal specificity still ranks ahead of a Restrict so
	// downstream verify-time consumers (which iterate the same ranked array)
	// still see the Block first.
	it("on equal specificity, a deferToVerify Block still outranks a Restrict", () => {
		const deferredBlock: AccessRule = {
			type: AccessPolicyType.Block,
			ja4Hash: "ja4-A",
			deferToVerify: true,
		};
		const restrict: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.image,
			solvedImagesCount: 4,
		};
		const ranked = rankCandidateRules(
			[restrict, deferredBlock],
			request,
			undefined,
		);
		expect(ranked[0]).toEqual(deferredBlock);
	});

	it("a more-specific pow Restrict still beats a less-specific image Restrict", () => {
		// Harshness is only the equal-specificity tiebreaker. A narrower
		// pow rule (ja4 + asn) still wins over a broader image rule (ja4).
		const broadImage: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			captchaType: CaptchaType.image,
			solvedImagesCount: 4,
		};
		const specificPow: AccessRule = {
			type: AccessPolicyType.Restrict,
			ja4Hash: "ja4-A",
			asn: 205016,
			captchaType: CaptchaType.pow,
		};
		const ranked = rankCandidateRules(
			[broadImage, specificPow],
			request,
			undefined,
		);
		expect(ranked[0]).toEqual(specificPow);
	});
});
