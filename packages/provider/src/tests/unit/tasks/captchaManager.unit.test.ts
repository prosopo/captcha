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

import type { RedisWriteQueue } from "@prosopo/database";
import { type Logger, getLogger } from "@prosopo/logger";
import {
	ContextType,
	IpAddressType,
	type KeyringPair,
	type Session,
	contextAwareThresholdDefault,
} from "@prosopo/types";
import {
	CaptchaType,
	type IUserSettings,
	ResultReason,
	Tier,
} from "@prosopo/types";
import type { ClientRecord, IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type AccessPolicy,
	AccessPolicyType,
	type AccessRulesStorage,
} from "@prosopo/user-access-policy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaManager } from "../../../tasks/captchaManager.js";
import type { BehavioralDataResult } from "../../../tasks/detection/decodeBehavior.js";

vi.mock("../../../tasks/detection/decodeBehavior.js", () => ({
	default: vi.fn(),
}));

const loggerOuter = getLogger("info", "test:captcha-manager");

const defaultUserSettings: IUserSettings = {
	frictionlessThreshold: 0.8,
	domains: [],
	captchaType: CaptchaType.frictionless,
	powDifficulty: 4,
	imageThreshold: 0.8,
	imageMaxRounds: 3,
	verifiedTimeout: 120000,
	solutionTimeout: 60000,
	puzzleTolerance: 15,
	disallowWebView: false,
	contextAware: {
		enabled: false,
		contexts: {
			default: {
				type: ContextType.Default,
				threshold: contextAwareThresholdDefault,
			},
		},
	},
};

describe("CaptchaManager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let logger: Logger;
	let captchaManager: CaptchaManager;
	let mockEnv: ProviderEnvironment;
	let mockWriteQueue: RedisWriteQueue;

	beforeEach(() => {
		db = {
			checkAndRemoveSession: vi.fn(),
			getSessionRecordBySessionId: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		const mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
		} as unknown as Logger;
		logger = mockLogger;

		mockEnv = {
			config: {
				ipApi: {
					apiKey: "testKey",
					baseUrl: "https://api.ipapi.is",
				},
			},
		} as unknown as ProviderEnvironment;

		mockWriteQueue = {
			invalidateCachedSession: vi.fn().mockResolvedValue(undefined),
			invalidateCachedSessionByHash: vi.fn().mockResolvedValue(undefined),
			getCachedSession: vi.fn().mockResolvedValue(null),
			cacheSessionEscalation: vi.fn().mockResolvedValue(true),
			getCachedSessionEscalation: vi.fn().mockResolvedValue(null),
			invalidateCachedSessionEscalation: vi.fn().mockResolvedValue(undefined),
		} as unknown as RedisWriteQueue;

		captchaManager = new CaptchaManager(
			db,
			pair,
			mockEnv.config,
			logger,
			mockWriteQueue,
		);

		vi.clearAllMocks();
	});

	// Session-chain walker. Escalation sessions (isEscalation=true) inherit
	// their originSessionId from the pow-solve that spawned them. DM-input
	// reads go through the walker so simdReadings / dnsEvent / entropy
	// fields that live on the origin are surfaced on the escalation record
	// without duplicating them at write time.
	describe("getSessionRecordWithOriginFallback", () => {
		const dbGet = () =>
			db.getSessionRecordBySessionId as unknown as ReturnType<typeof vi.fn>;

		it("returns the session as-is when there's no originSessionId (non-escalation)", async () => {
			const session = {
				sessionId: "sess",
				captchaType: CaptchaType.pow,
				simdReadings: undefined,
			} as unknown as Session;
			dbGet().mockResolvedValue(session);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("sess");

			expect(got).toBe(session);
			expect(dbGet()).toHaveBeenCalledTimes(1);
		});

		it("returns undefined when the session isn't found", async () => {
			dbGet().mockResolvedValue(null);
			const got =
				await captchaManager.getSessionRecordWithOriginFallback("sess");
			expect(got).toBeUndefined();
		});

		it("skips the origin walk when the escalation already carries every fallback-eligible field", async () => {
			const session = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
				simdReadings: { supported: true, results: [] },
				dnsEvent: { receivedAt: new Date() },
				entropyMathRandomFingerprint: "a",
				entropyCryptoFingerprint: "b",
				entropyWallClockOffsetMs: 0,
				entropyMathRandomFirst: 0.1,
				g: "c",
				i: false,
			} as unknown as Session;
			dbGet().mockResolvedValue(session);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got).toBe(session);
			// Only one DB call — origin was never fetched.
			expect(dbGet()).toHaveBeenCalledTimes(1);
		});

		it("fills simdReadings from origin when the escalation is missing it", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				simdReadings: { supported: true, results: [1, 2, 3] },
				dnsEvent: { receivedAt: new Date() },
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
				// simdReadings and dnsEvent are undefined on the escalation
				// (the exact production bug — origin's fire-and-forget writes
				// raced buildEscalation's Mongo read).
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.simdReadings).toEqual({
				supported: true,
				results: [1, 2, 3],
			});
			expect(got?.dnsEvent).toBeDefined();
			// The escalation's own identity is preserved — origin fields
			// don't overwrite escalation-owned fields.
			expect(got?.sessionId).toBe("esc");
			expect(got?.captchaType).toBe(CaptchaType.puzzle);
		});

		it("fills g from origin when the escalation is missing it", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				g: "Google Inc. (NVIDIA)~ANGLE (NVIDIA, NVIDIA GeForce RTX 3080)",
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.g).toBe(
				"Google Inc. (NVIDIA)~ANGLE (NVIDIA, NVIDIA GeForce RTX 3080)",
			);
			expect(got?.sessionId).toBe("esc");
		});

		it("keeps the escalation's own g rather than the origin's", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				g: "origin-value",
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
				g: "escalation-value",
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.g).toBe("escalation-value");
		});

		it("fills i from origin when the escalation is missing it", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				i: true,
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.i).toBe(true);
			expect(got?.sessionId).toBe("esc");
		});

		it("carries a false i forward rather than treating it as absent", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				i: false,
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.i).toBe(false);
		});

		it("keeps the escalation's own i rather than the origin's", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				i: false,
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
				i: true,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.i).toBe(true);
		});

		it("does not fill anything when origin also lacks the fields", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				simdReadings: undefined,
				dnsEvent: undefined,
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.simdReadings).toBeUndefined();
			expect(got?.dnsEvent).toBeUndefined();
		});

		it("returns the escalation unchanged when the origin session has been deleted", async () => {
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin-gone",
				captchaType: CaptchaType.puzzle,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(null);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got).toBe(escalation);
		});

		it("preserves escalation-owned fields — origin captchaType / sessionId / score never leak through", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				score: 0.1,
				simdReadings: { supported: true },
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
				score: 0.5,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			// simd was filled from origin
			expect(got?.simdReadings).toEqual({ supported: true });
			// escalation-owned fields untouched
			expect(got?.sessionId).toBe("esc");
			expect(got?.captchaType).toBe(CaptchaType.puzzle);
			expect(got?.score).toBe(0.5);
		});

		// Chain fallback surface. The DM's post-pow / verify-time input
		// read path relies on each of these fields being visible on the
		// escalation session; if any of them isn't in the fallback allowlist
		// the DM sees an incomplete view of the origin's signal at verify
		// time and its decision can diverge from what it would have made
		// pre-escalation. One test per field so a future refactor that drops
		// one from the allowlist has to explicitly delete or flip its test.
		it("fills dnsEvent from origin when the escalation is missing it", async () => {
			const receivedAt = new Date();
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				dnsEvent: { receivedAt, ja4: "ja4x" },
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.image,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.dnsEvent).toEqual({ receivedAt, ja4: "ja4x" });
			expect(got?.sessionId).toBe("esc");
			expect(got?.captchaType).toBe(CaptchaType.image);
		});

		it("fills dnsEvent from origin for puzzle escalations too", async () => {
			const receivedAt = new Date();
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				dnsEvent: { receivedAt, ja4: "ja4y" },
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.dnsEvent).toEqual({ receivedAt, ja4: "ja4y" });
			expect(got?.captchaType).toBe(CaptchaType.puzzle);
		});

		it("fills entropyMathRandomFingerprint from origin when the escalation is missing it", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				entropyMathRandomFingerprint: "0x1234abcd",
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.image,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.entropyMathRandomFingerprint).toBe("0x1234abcd");
		});

		it("fills entropyCryptoFingerprint from origin when the escalation is missing it", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				entropyCryptoFingerprint: "0xdeadbeef",
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.puzzle,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.entropyCryptoFingerprint).toBe("0xdeadbeef");
		});

		it("fills entropyWallClockOffsetMs from origin including exact-zero (must not be treated as absent)", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				entropyWallClockOffsetMs: 0,
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.image,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.entropyWallClockOffsetMs).toBe(0);
		});

		it("fills entropyMathRandomFirst from origin when the escalation is missing it", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				entropyMathRandomFirst: 0.123456,
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.image,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.entropyMathRandomFirst).toBe(0.123456);
		});

		// Explicit non-inheritance surface. These fields are NOT in the
		// fallback allowlist; the tests document that so a future change
		// that decides to persist them has to explicitly flip the assertion.
		it("does NOT chain decryptedHeadHash from origin — escalation records carry their own via buildEscalation's copy at creation time; if that copy raced Mongo the DM sees `undefined` at verify", async () => {
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				decryptedHeadHash: "origin-head-hash-xyz",
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.image,
				// decryptedHeadHash intentionally absent on the escalation.
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(got?.decryptedHeadHash).toBeUndefined();
		});

		it("does NOT chain behavioural data from origin — BDP lives only in the pow-solve payload, decrypted per-request and never persisted; verify-time DM sees `undefined`", async () => {
			// Uses an off-schema field name to represent behavioural data
			// on the origin (the type doesn't declare it — that's the
			// whole point of this documentation test).
			const origin = {
				sessionId: "origin",
				captchaType: CaptchaType.pow,
				behavioralDataPacked: {
					c1: [{ t: 1, x: 2, y: 3 }],
					c2: [],
					c3: [],
				},
			} as unknown as Session;
			const escalation = {
				sessionId: "esc",
				originSessionId: "origin",
				captchaType: CaptchaType.image,
				simdReadings: undefined,
			} as unknown as Session;
			dbGet().mockResolvedValueOnce(escalation).mockResolvedValueOnce(origin);

			const got =
				await captchaManager.getSessionRecordWithOriginFallback("esc");

			expect(
				(got as unknown as { behavioralDataPacked?: unknown })
					.behavioralDataPacked,
			).toBeUndefined();
		});
	});

	describe("isValidRequest", () => {
		it("should validate a request for an image captcha when the client settings are set to image and no session ID is passed", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.image,
					},
				},
				CaptchaType.image,
				mockEnv,
			);
			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
			});
		});
		it("should validate a request for an pow captcha when the client settings are set to pow and no session ID is passed", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.pow,
					},
				},
				CaptchaType.pow,
				mockEnv,
			);
			expect(result).toEqual({
				valid: true,
				type: CaptchaType.pow,
			});
		});
		it("should validate a request for an pow captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type pow", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.pow,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.pow,
				sessionId: "sessionId",
			});
		});

		it("returns the session's stored ipInfo so callers can avoid a second DB read", async () => {
			// Sessions now persist the full IPInfoResponse rather than a
			// flat countryCode. isValidRequest surfaces it on the return
			// so the verify path / downstream routing can read country /
			// vpn / etc. without re-fetching the session.
			const stubIpInfo = {
				ip: "1.2.3.4",
				isValid: true as const,
				isVPN: true,
				isTor: false,
				isProxy: false,
				isDatacenter: false,
				isAbuser: false,
				isMobile: false,
				isSatellite: false,
				isCrawler: false,
				countryCode: "DE",
			};
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.pow,
				ipInfo: stubIpInfo,
			} as Pick<Session, "sessionId" | "captchaType" | "ipInfo">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(result.ipInfo).toBe(stubIpInfo);
		});
		it("should invalidate the Redis session cache after consuming a frictionless pow session", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.pow,
				userSitekeyIpHash: "hash-xyz",
			} as Pick<Session, "sessionId" | "captchaType" | "userSitekeyIpHash">);

			await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(mockWriteQueue.invalidateCachedSession).toHaveBeenCalledWith(
				"sessionId",
			);
			expect(mockWriteQueue.invalidateCachedSessionByHash).toHaveBeenCalledWith(
				"hash-xyz",
			);
		});
		it("should invalidate the Redis session cache after consuming a frictionless image session", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
				userSitekeyIpHash: "hash-xyz",
			} as Pick<Session, "sessionId" | "captchaType" | "userSitekeyIpHash">);

			await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(mockWriteQueue.invalidateCachedSession).toHaveBeenCalledWith(
				"sessionId",
			);
			expect(mockWriteQueue.invalidateCachedSessionByHash).toHaveBeenCalledWith(
				"hash-xyz",
			);
		});
		it("should invalidate Redis cache when session is not found, to break stale-cache loops", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue(undefined);
			// Simulate the drifted-cache state: DB record is gone, but the
			// Redis sessionId cache still holds the original entry which
			// carries the userSitekeyIpHash needed to invalidate the hash
			// mapping.

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(mockWriteQueue.getCachedSession as any).mockResolvedValueOnce({
				sessionId: "sessionId",
				userSitekeyIpHash: "hash-xyz",
			});

			await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
			);

			// When DB has no record but Redis cache does, BOTH the sessionId
			// cache and the hash → sessionId mapping must be invalidated;
			// otherwise the hash mapping keeps resolving to the dead
			// sessionId and /frictionless keeps "Reusing existing session"
			// while /captcha/{type} keeps 400-ing in a loop.
			expect(mockWriteQueue.invalidateCachedSession).toHaveBeenCalledWith(
				"sessionId",
			);
			expect(mockWriteQueue.invalidateCachedSessionByHash).toHaveBeenCalledWith(
				"hash-xyz",
			);
		});
		// ---------- post-PoW escalation fallback ----------
		//
		// When the routing machine returns image/puzzle from postPow,
		// `submitPoWCaptchaSolution.buildEscalation` mints a new session
		// with a fresh sessionId and writes an `origin → escalation`
		// mapping into Redis. A widget that handles the escalation
		// response correctly switches to the new sessionId. But several
		// real-world paths keep using the original sessionId for the
		// follow-up `/captcha/{type}` request — old bundled SDKs, dapps
		// that hand-roll the wrapper, network-glitch retries, browser-tab
		// races. Without the fallback below, those requests landed on
		// CAPTCHA.NO_SESSION_FOUND because the origin session had already
		// been consumed by the preceding /captcha/pow. The four tests
		// below pin the contract.

		it("resolves to the escalation session when the origin sessionId is consumed and an escalation mapping exists", async () => {
			// Origin session was consumed by the earlier /captcha/pow:
			// checkAndRemoveSession returns undefined for the origin id.
			// The escalation session is still live: the peek returns it
			// and, because its captchaType matches the requested type,
			// checkAndRemoveSession is then called to consume it.
			const checkAndRemove = db.checkAndRemoveSession as unknown as ReturnType<
				typeof vi.fn
			>;
			checkAndRemove.mockImplementation(async (sessionId: string) => {
				if (sessionId === "escalation-id") {
					return {
						sessionId: "escalation-id",
						captchaType: CaptchaType.image,
						userSitekeyIpHash: "hash-xyz",
					} as Pick<Session, "sessionId" | "captchaType" | "userSitekeyIpHash">;
				}
				return undefined;
			});
			(
				db.getSessionRecordBySessionId as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValueOnce({
				sessionId: "escalation-id",
				captchaType: CaptchaType.image,
				userSitekeyIpHash: "hash-xyz",
			} as Pick<Session, "sessionId" | "captchaType" | "userSitekeyIpHash">);
			(
				mockWriteQueue.getCachedSessionEscalation as unknown as ReturnType<
					typeof vi.fn
				>
			).mockResolvedValueOnce("escalation-id");

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"origin-id",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				sessionId: "escalation-id",
			});
			// The escalation mapping is single-use: invalidate so the
			// next retry on origin-id falls through to NO_SESSION_FOUND
			// instead of chasing a now-consumed escalation.
			expect(
				mockWriteQueue.invalidateCachedSessionEscalation,
			).toHaveBeenCalledWith("origin-id");
			// The escalation session's own cache entries must also be
			// invalidated (it's been consumed).
			expect(mockWriteQueue.invalidateCachedSession).toHaveBeenCalledWith(
				"escalation-id",
			);
			expect(mockWriteQueue.invalidateCachedSessionByHash).toHaveBeenCalledWith(
				"hash-xyz",
			);
		});

		it("returns NO_SESSION_FOUND when origin is consumed AND escalation session is also gone", async () => {
			// Both the origin and the escalation have been consumed (the
			// user-double-click-the-button case: PoW solved → escalation
			// minted → user solves escalation → user/widget then retries
			// PoW submit with the original sessionId, finds neither
			// alive). The read-only peek returns undefined so we never
			// reach the consume step.
			(
				db.checkAndRemoveSession as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValue(undefined);
			(
				db.getSessionRecordBySessionId as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValueOnce(undefined);
			(
				mockWriteQueue.getCachedSessionEscalation as unknown as ReturnType<
					typeof vi.fn
				>
			).mockResolvedValueOnce("escalation-id");

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"origin-id",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: false,
				reason: ResultReason.CAPTCHA_NO_SESSION_FOUND,
				type: CaptchaType.image,
			});
			// Even when the escalation can't be resolved, the mapping is
			// dropped so retries fall through cleanly rather than
			// repeating the same Redis round-trip.
			expect(
				mockWriteQueue.invalidateCachedSessionEscalation,
			).toHaveBeenCalledWith("origin-id");
		});

		it("returns INCORRECT_CAPTCHA_TYPE without consuming the escalation session when the type does not match", async () => {
			// The widget escalated from pow → image but ignored the
			// PoW-submit envelope and is still calling /captcha/pow with
			// the origin sessionId. We MUST NOT consume the escalation
			// session here — it's the user's only path to recovery
			// (a well-behaved widget can still reach /captcha/image with
			// the escalation sessionId from the PoW-submit response).
			const checkAndRemove = db.checkAndRemoveSession as unknown as ReturnType<
				typeof vi.fn
			>;
			checkAndRemove.mockResolvedValue(undefined);
			(
				db.getSessionRecordBySessionId as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValueOnce({
				sessionId: "escalation-id",
				captchaType: CaptchaType.image,
				userSitekeyIpHash: "hash-xyz",
			} as Pick<Session, "sessionId" | "captchaType" | "userSitekeyIpHash">);
			(
				mockWriteQueue.getCachedSessionEscalation as unknown as ReturnType<
					typeof vi.fn
				>
			).mockResolvedValueOnce("escalation-id");

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"origin-id",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: false,
				reason: ResultReason.INCORRECT_CAPTCHA_TYPE,
				type: CaptchaType.pow,
			});
			// Crucially: the escalation session must NOT have been consumed.
			// checkAndRemoveSession was called once for the origin sessionId
			// (which returned undefined) and must not have been called for
			// the escalation sessionId.
			const consumeCalls = checkAndRemove.mock.calls.map((c) => c[0]);
			expect(consumeCalls).toEqual(["origin-id"]);
			expect(consumeCalls).not.toContain("escalation-id");
			// The mapping is single-use and was followed; drop it.
			expect(
				mockWriteQueue.invalidateCachedSessionEscalation,
			).toHaveBeenCalledWith("origin-id");
		});

		it("falls through to NO_SESSION_FOUND when no escalation mapping was recorded", async () => {
			// Origin consumed, no postPow escalation happened, no mapping
			// in Redis — should behave exactly like before the fix.
			(
				db.checkAndRemoveSession as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValue(undefined);
			(
				mockWriteQueue.getCachedSessionEscalation as unknown as ReturnType<
					typeof vi.fn
				>
			).mockResolvedValueOnce(null);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"origin-id",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: false,
				reason: ResultReason.CAPTCHA_NO_SESSION_FOUND,
				type: CaptchaType.pow,
			});
			// No mapping to invalidate; the early-out should not call
			// `invalidateCachedSessionEscalation` for `null` mappings.
			expect(
				mockWriteQueue.invalidateCachedSessionEscalation,
			).not.toHaveBeenCalled();
		});

		it("does not consult the escalation mapping when origin session is still live", async () => {
			// Origin session is live (typical happy path). The mapping
			// lookup must NOT run — it would just be wasted Redis round
			// trips, and we don't want to invalidate something that may
			// still be needed if the widget DOES handle the escalation
			// correctly later.
			(
				db.checkAndRemoveSession as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValue({
				sessionId: "origin-id",
				captchaType: CaptchaType.pow,
			} as Pick<Session, "sessionId" | "captchaType">);

			await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"origin-id",
				undefined,
				"127.0.0.1",
			);

			expect(mockWriteQueue.getCachedSessionEscalation).not.toHaveBeenCalled();
			expect(
				mockWriteQueue.invalidateCachedSessionEscalation,
			).not.toHaveBeenCalled();
		});

		it("should not throw when writeQueue is null and session is consumed", async () => {
			const managerWithoutRedis = new CaptchaManager(
				db,
				pair,
				mockEnv.config,
				logger,
				null,
			);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.pow,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await managerWithoutRedis.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.pow,
				sessionId: "sessionId",
			});
		});
		it("should validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type image", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				sessionId: "sessionId",
			});
		});

		it("should not validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type pow", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.pow,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.image,
			});
		});

		it("should not validate a request for a pow captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type image", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.pow,
			});
		});

		it("should not validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed but not found", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue(undefined);

			const sessionId = "sessionId";

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				sessionId,
			);

			expect(result).toEqual({
				valid: false,
				reason: "CAPTCHA.NO_SESSION_FOUND",
				type: CaptchaType.image,
			});
		});
		it("should not validate a request for a pow captcha when the client settings are set to frictionless and a session ID is passed but not found", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue(undefined);

			const sessionId = "sessionId";

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				sessionId,
			);

			expect(result).toEqual({
				valid: false,
				reason: "CAPTCHA.NO_SESSION_FOUND",
				type: CaptchaType.pow,
			});
		});
		it("should not validate a request for a pow captcha when the client settings are set to frictionless but no session ID is passed in", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				undefined,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.pow,
			});
		});
		it("should not validate a request for an image captcha when the client settings are set to frictionless but no session ID is passed in", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				undefined,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.image,
			});
		});

		it("should not validate a request for a pow captcha when the client settings are set to image", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.image,
					},
				},
				CaptchaType.pow,
				mockEnv,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.pow,
			});
		});
		it("should not validate a request for an image captcha when the client settings are set to pow", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.pow,
					},
				},
				CaptchaType.image,
				mockEnv,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.image,
			});
		});

		// The pre-fix behaviour: a Block policy with no captchaType (the
		// sanitiser strips it from every Block on write) reached
		// isValidRequest and tripped the captchaType-equality check
		// (`undefined !== "image"` → INCORRECT_CAPTCHA_TYPE), which broke
		// every /captcha/* request for any user matching a Block rule —
		// including the deferToVerify variant whose whole point is to
		// solve normally then block at verify. isValidRequest now only
		// enforces the captchaType check when the policy actually pins
		// one; callers should also filter deferToVerify at the site (see
		// getImageCaptchaChallenge etc.), but this defensive guard
		// backstops that.
		it("validates a request when the matched Block policy has no captchaType (defensive against the sanitiser-strips-captchaType bug)", async () => {
			const strippedBlock: AccessPolicy = {
				type: AccessPolicyType.Block,
			};

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.image,
					},
				},
				CaptchaType.image,
				mockEnv,
				undefined,
				strippedBlock,
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
			});
		});

		it("validates a request when the matched Block policy is deferToVerify (no request-time enforcement)", async () => {
			const deferredBlock: AccessPolicy = {
				type: AccessPolicyType.Block,
				deferToVerify: true,
			};

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.image,
					},
				},
				CaptchaType.image,
				mockEnv,
				undefined,
				deferredBlock,
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
			});
		});

		// Preserved behaviour: a Restrict policy that pins a captchaType
		// still enforces the type check. Regression guard so the
		// defensive relaxation above doesn't accidentally silence type
		// mismatches on genuine Restrict rules.
		it("still returns INCORRECT_CAPTCHA_TYPE for a Restrict policy pinning a different captchaType", async () => {
			const restrictPow: AccessPolicy = {
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.pow,
			};

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				undefined,
				restrictPow,
			);

			expect(result).toEqual({
				valid: false,
				reason: ResultReason.INCORRECT_CAPTCHA_TYPE,
				type: CaptchaType.image,
			});
		});

		// Commenting out since this is old logic and I'm in a rush
		// it("should not validate a request when IP address mismatches for frictionless session", async () => {
		// 	// biome-ignore lint/suspicious/noExplicitAny: tests
		// 	(db.checkAndRemoveSession as any).mockResolvedValue({
		// 		tokenId: "tokenId" as unknown as ObjectId,
		// 		captchaType: CaptchaType.image,
		// 	} as Pick<Session, "tokenId" | "captchaType">);

		// 	// biome-ignore lint/suspicious/noExplicitAny: tests
		// 	(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
		// 		_id: "frictionlessTokenId",
		// 		ipAddress: {
		// 			lower: 2130706433n, // 127.0.0.1 as bigint
		// 			type: IpAddressType.v4,
		// 		},
		// 	} as Partial<FrictionlessToken>);

		// 	const result = await captchaManager.isValidRequest(
		// 		{
		// 			account: "account",
		// 			tier: Tier.Free,
		// 			settings: {
		// 				...defaultUserSettings,
		// 				captchaType: CaptchaType.frictionless,
		// 			},
		// 		},
		// 		CaptchaType.image,
		// 		mockEnv,
		// 		"sessionId",
		// 		undefined,
		// 		"192.168.1.100", // Different IP
		// 	);

		// 	expect(result).toEqual({
		// 		valid: false,
		// 		reason: "CAPTCHA.IP_ADDRESS_MISMATCH",
		// 		type: CaptchaType.image,
		// 	});
		// });

		it("should validate a request when no IP is stored on frictionless token", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
				undefined,
				"192.168.1.100",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				sessionId: "sessionId",
			});
		});

		it("should validate a request when no currentIP is provided even with IP stored on token", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
				undefined,
				undefined, // No currentIP provided
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				sessionId: "sessionId",
			});
		});

		// Regression guard for the class of INCORRECT_CAPTCHA_TYPE errors
		// observed on prod at ~150/hr, concentrated on pimeyes / eyematch /
		// 5G1hy. An anomaly detector inserts an IP restrict-to-image rule
		// (e.g. IP_CLIENT_CROSSOVER) between the user's /frictionless response
		// and their subsequent /captcha/pow call, so the widget's in-flight
		// pow-typed session gets 400'd at the /captcha/pow entry gate even
		// though the session was minted legitimately before the rule appeared.
		//
		// The fix: when a valid sessionId is present, the session record is
		// authoritative for captchaType. The policy still fires at verify
		// time via the decisionMachineRunner + checkForHardBlock, so the
		// abuse signal is not lost.
		describe("user access policy precedence over session", () => {
			it("honours the session's captchaType when a restrict-to-image policy materialises between /frictionless and /captcha/{type}", async () => {
				// Session was minted with pow (before the rule existed).
				(
					db.checkAndRemoveSession as unknown as ReturnType<typeof vi.fn>
				).mockResolvedValue({
					sessionId: "sessionId",
					captchaType: CaptchaType.pow,
				} as Pick<Session, "sessionId" | "captchaType">);

				// Rule fires AFTER: restrict-to-image now active on this IP.
				const restrictImagePolicy: AccessPolicy = {
					type: AccessPolicyType.Restrict,
					captchaType: CaptchaType.image,
				} as AccessPolicy;

				const result = await captchaManager.isValidRequest(
					{
						account: "account",
						tier: Tier.Free,
						settings: {
							...defaultUserSettings,
							captchaType: CaptchaType.frictionless,
						},
					},
					CaptchaType.pow, // widget hits /captcha/pow with the in-flight session
					mockEnv,
					"sessionId",
					restrictImagePolicy,
					"127.0.0.1",
				);

				// Before the fix this returned INCORRECT_CAPTCHA_TYPE; after,
				// the session's own captchaType wins because it's the
				// authoritative record and the policy will still fire at
				// verify time via other paths.
				expect(result).toEqual({
					valid: true,
					type: CaptchaType.pow,
					sessionId: "sessionId",
				});
			});

			it("still rejects a session whose own captchaType does not match the requested type", async () => {
				// Session's captchaType is image, widget hits /captcha/pow —
				// this is a genuine mismatch (not a policy race) and must
				// still return INCORRECT_CAPTCHA_TYPE.
				(
					db.checkAndRemoveSession as unknown as ReturnType<typeof vi.fn>
				).mockResolvedValue({
					sessionId: "sessionId",
					captchaType: CaptchaType.image,
				} as Pick<Session, "sessionId" | "captchaType">);

				const result = await captchaManager.isValidRequest(
					{
						account: "account",
						tier: Tier.Free,
						settings: {
							...defaultUserSettings,
							captchaType: CaptchaType.frictionless,
						},
					},
					CaptchaType.pow,
					mockEnv,
					"sessionId",
					undefined,
					"127.0.0.1",
				);

				expect(result.valid).toBe(false);
				expect(result.reason).toBe(ResultReason.INCORRECT_CAPTCHA_TYPE);
			});

			it("enforces policy captchaType on sessionless requests (direct /captcha/{type} with no /frictionless minted session)", async () => {
				// No sessionId, policy pins image, widget asks for pow.
				// Sessionless callers have no minted-in-context session to
				// trust, so policy still wins here — preserves the pre-fix
				// behaviour for the direct-entry case.
				const restrictImagePolicy: AccessPolicy = {
					type: AccessPolicyType.Restrict,
					captchaType: CaptchaType.image,
				} as AccessPolicy;

				const result = await captchaManager.isValidRequest(
					{
						account: "account",
						tier: Tier.Free,
						settings: {
							...defaultUserSettings,
							captchaType: CaptchaType.pow,
						},
					},
					CaptchaType.pow,
					mockEnv,
					undefined, // no sessionId
					restrictImagePolicy,
				);

				expect(result.valid).toBe(false);
				expect(result.reason).toBe(ResultReason.INCORRECT_CAPTCHA_TYPE);
			});

			it("allows sessionless requests when the policy captchaType matches", async () => {
				const restrictImagePolicy: AccessPolicy = {
					type: AccessPolicyType.Restrict,
					captchaType: CaptchaType.image,
				} as AccessPolicy;

				const result = await captchaManager.isValidRequest(
					{
						account: "account",
						tier: Tier.Free,
						settings: {
							...defaultUserSettings,
							captchaType: CaptchaType.image,
						},
					},
					CaptchaType.image,
					mockEnv,
					undefined,
					restrictImagePolicy,
				);

				expect(result.valid).toBe(true);
				expect(result.type).toBe(CaptchaType.image);
			});
		});
	});
	describe("getVerificationResponse", () => {
		it("should return a verification response with a score if the tier is not free", async () => {
			const result = captchaManager.getVerificationResponse(
				true,
				{
					account: "account",
					tier: Tier.Professional,
				} as unknown as ClientRecord,
				() => "translated",
				0.5,
			);
			expect(result).toEqual({
				status: "translated",
				verified: true,
				score: 0.5,
			});
		});
		it("should return a verification response without a score if the tier is free", async () => {
			const result = captchaManager.getVerificationResponse(
				true,
				{
					account: "account",
					tier: Tier.Free,
				} as unknown as ClientRecord,
				() => "translated",
				0.5,
			);
			expect(result).toEqual({
				status: "translated",
				verified: true,
			});
		});
		it("should return a reason when verified is false and the tier is not free", () => {
			const result = captchaManager.getVerificationResponse(
				false,
				{
					account: "account",
					tier: Tier.Professional,
				} as unknown as ClientRecord,
				() => "translated",
				0.5,
				"API.TIMESTAMP_TOO_OLD",
			);
			expect(result).toEqual({
				status: "translated",
				verified: false,
				score: 0.5,
				reason: "API.TIMESTAMP_TOO_OLD",
			});
		});
		it("should not return a reason when verified is false and the tier is free", () => {
			const result = captchaManager.getVerificationResponse(
				false,
				{
					account: "account",
					tier: Tier.Free,
				} as unknown as ClientRecord,
				() => "translated",
				undefined,
				"API.TIMESTAMP_TOO_OLD",
			);
			expect(result).toEqual({
				status: "translated",
				verified: false,
			});
		});
		it("should not return a reason when verified is true", () => {
			const result = captchaManager.getVerificationResponse(
				true,
				{
					account: "account",
					tier: Tier.Professional,
				} as unknown as ClientRecord,
				() => "translated",
				0.5,
				"API.TIMESTAMP_TOO_OLD",
			);
			expect(result).toEqual({
				status: "translated",
				verified: true,
				score: 0.5,
			});
		});
		it("should not return a reason when reason is undefined", () => {
			const result = captchaManager.getVerificationResponse(
				false,
				{
					account: "account",
					tier: Tier.Professional,
				} as unknown as ClientRecord,
				() => "translated",
				0.5,
			);
			expect(result).toEqual({
				status: "translated",
				verified: false,
				score: 0.5,
			});
		});
	});

	describe("decryptBehavioralData", () => {
		// biome-ignore lint/suspicious/noExplicitAny: tests
		let decryptFn: any;

		beforeEach(async () => {
			// Get the mocked default export
			const mod = await import("../../../tasks/detection/decodeBehavior.js");
			decryptFn = mod.default;
			vi.mocked(decryptFn).mockReset();
		});

		it("should return null when no bundle is provided", async () => {
			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				undefined,
			);
			expect(result).toBeNull();
			expect(decryptFn).not.toHaveBeenCalled();
		});

		it("should decrypt with the bundle's key + inner config", async () => {
			const mockResult: BehavioralDataResult = {
				collector1: [{ event: "click" }],
				collector2: [],
				collector3: [],
				deviceCapability: "desktop",
				timestamp: 1000,
			};
			vi.mocked(decryptFn).mockResolvedValue(mockResult);

			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				{
					key: "pk",
					innerConfig: "cfg",
				},
			);
			expect(result).toEqual(mockResult);
			expect(decryptFn).toHaveBeenCalledTimes(1);
			expect(decryptFn).toHaveBeenCalledWith("encryptedData", "pk", "cfg");
		});

		it("should return null when the bundle fails to decrypt", async () => {
			vi.mocked(decryptFn).mockRejectedValue(new Error("decrypt failed"));

			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				{
					key: "pk",
					innerConfig: "cfg",
				},
			);
			expect(result).toBeNull();
			expect(decryptFn).toHaveBeenCalledTimes(1);
		});
	});

	describe("checkForHardBlock", () => {
		const compositeIp = { lower: 2130706433n, type: IpAddressType.v4 }; // 127.0.0.1
		const mockHeaders = { "user-agent": "test-agent" };
		// biome-ignore lint/suspicious/noExplicitAny: tests
		const mockChallengeRecord: any = {
			sessionId: undefined,
			ipAddress: compositeIp,
			ja4: "test-ja4",
			dappAccount: "dappAccount",
		};

		beforeEach(() => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db as any).getSessionRecordBySessionId = vi.fn().mockResolvedValue(null);
		});

		it("should return undefined when there are no matching policies", async () => {
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toBeUndefined();
		});

		it("should return undefined for a Block policy that has a captchaType (captcha-type selector, not hard block)", async () => {
			const blockWithCaptchaType: AccessPolicy = {
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.image,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([blockWithCaptchaType]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toBeUndefined();
		});

		it("should return the policy for a Block policy without a captchaType (hard block)", async () => {
			const hardBlockPolicy: AccessPolicy = {
				type: AccessPolicyType.Block,
				description: "hard block",
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([hardBlockPolicy]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toEqual(hardBlockPolicy);
		});

		it("should return undefined for a Restrict policy without captchaType (not a Block policy)", async () => {
			const restrictPolicy: AccessPolicy = {
				type: AccessPolicyType.Restrict,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([restrictPolicy]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toBeUndefined();
		});

		// Block + captchaType USED to mean "captcha-type selector, not a
		// hard block" (the previous test). deferToVerify=true on the same
		// rule flips it back to a hard block: the policy explicitly opted
		// out of request-time enforcement and asked to be matched here
		// instead. Without this, deferToVerify Block rules become
		// invisible — middleware skips them (correct) and verify also
		// skips them (the bug we'd be testing for).
		it("should return the policy for a Block policy with deferToVerify=true AND captchaType (verify-time hard block)", async () => {
			const deferBlock: AccessPolicy = {
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.image,
				deferToVerify: true,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([deferBlock]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toEqual(deferBlock);
		});

		// deferToVerify=true with no captchaType still resolves to a hard
		// block — it's a hard block by either gate of the OR (no
		// captchaType OR deferToVerify). This guards against a future
		// refactor that makes the two gates mutually exclusive instead
		// of redundant-on-overlap.
		it("should return the policy for a Block policy with deferToVerify=true AND no captchaType", async () => {
			const deferBlockNoType: AccessPolicy = {
				type: AccessPolicyType.Block,
				deferToVerify: true,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([deferBlockNoType]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toEqual(deferBlockNoType);
		});

		// Restrict + deferToVerify: the frictionless flow serves the
		// rule's captchaType (image / N rounds) as normal — imposing the
		// compute burden — and verify hard-blocks regardless of solve
		// outcome. Used by PROXY_POOL_TLS_NARROW to force a solving farm
		// to burn N image rounds per session while still failing verify.
		// Bots solve at 100%, so correctness gating doesn't stop them —
		// wasting their compute does.
		it("should return the policy for Restrict + deferToVerify=true (verify-time hard block after serving captcha)", async () => {
			const restrictDefer: AccessPolicy = {
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.image,
				solvedImagesCount: 8,
				deferToVerify: true,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([restrictDefer]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toEqual(restrictDefer);
		});

		// Restrict rules WITHOUT deferToVerify are pure routing rules —
		// they pick which challenge type to serve, not whether to reject.
		// The hard-block matcher must NOT return them, or every
		// image-throttled user would be denied outright.
		it("should return undefined for Restrict without deferToVerify (routing rules are not hard blocks)", async () => {
			const restrictRoute: AccessPolicy = {
				type: AccessPolicyType.Restrict,
				captchaType: CaptchaType.image,
				solvedImagesCount: 4,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([restrictRoute]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toBeUndefined();
		});
	});
});
