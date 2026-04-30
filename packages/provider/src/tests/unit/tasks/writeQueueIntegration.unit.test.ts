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
import {
	CaptchaStatus,
	CaptchaType,
	FrictionlessPenalties,
	type KeyringPair,
	type ProsopoConfigOutput,
	type Session,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { RedisConnection } from "@prosopo/redis-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../compositeIpAddress.js";
import { FrictionlessManager } from "../../../tasks/frictionless/frictionlessTasks.js";
import { RedisWriteQueue } from "../../../util/redisCache.js";
import { Tasks } from "../../../tasks/tasks.js";

describe("Write queue integration with captcha flows", () => {
	let mockLogger: Logger;
	let mockRedisClient: {
		set: ReturnType<typeof vi.fn>;
		get: ReturnType<typeof vi.fn>;
		del: ReturnType<typeof vi.fn>;
		sAdd: ReturnType<typeof vi.fn>;
		sMembers: ReturnType<typeof vi.fn>;
		sRem: ReturnType<typeof vi.fn>;
	};
	let mockConnection: RedisConnection;
	let writeQueue: RedisWriteQueue;

	beforeEach(() => {
		mockLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		} as unknown as Logger;

		mockRedisClient = {
			set: vi.fn().mockResolvedValue("OK"),
			get: vi.fn().mockResolvedValue(null),
			del: vi.fn().mockResolvedValue(1),
			sAdd: vi.fn().mockResolvedValue(1),
			sMembers: vi.fn().mockResolvedValue([]),
			sRem: vi.fn().mockResolvedValue(1),
		};

		mockConnection = {
			isReady: vi.fn().mockReturnValue(true),
			getClient: vi.fn().mockResolvedValue(mockRedisClient),
			getAwaitingTimeMs: vi.fn().mockReturnValue(0),
		};

		writeQueue = new RedisWriteQueue(mockConnection, mockLogger);
	});

	describe("FrictionlessManager session caching with PoW captcha", () => {
		it("should cache PoW session in Redis after creation", async () => {
			const db: IProviderDatabase = {
				storeSessionRecord: vi.fn(),
				getDetectorKeys: vi.fn(() => Promise.resolve(["test-key"])),
			} as unknown as IProviderDatabase;

			const pair: KeyringPair = {
				sign: vi.fn(),
				address: "testAddress",
			} as unknown as KeyringPair;

			const config: ProsopoConfigOutput = {
				penalties: FrictionlessPenalties.parse({}),
				captchas: { solved: { count: 5 }, unsolved: { count: 5 } },
				lRules: { en: 1 },
			} as unknown as ProsopoConfigOutput;

			const manager = new FrictionlessManager(db, pair, config, mockLogger);
			manager.setWriteQueue(writeQueue);

			manager.setSessionParams({
				token: "pow-token",
				score: 0.3,
				threshold: 0.5,
				scoreComponents: { baseScore: 0.3 },
				providerSelectEntropy: 13337,
				ipAddress: getCompositeIpAddress("10.0.0.1"),
				webView: false,
				iFrame: false,
				decryptedHeadHash: "hash123",
				siteKey: "dapp-sitekey",
			});

			const userSitekeyIpHash = "user-ip-hash-pow";
			const response = await manager.sendPowCaptcha({
				userSitekeyIpHash,
				powDifficulty: 4,
			});

			expect(response.captchaType).toBe(CaptchaType.pow);
			expect(response.sessionId).toBeDefined();
			expect(db.storeSessionRecord).toHaveBeenCalledOnce();

			// Allow fire-and-forget caching promises to settle.
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Verify Redis caching occurred
			expect(mockRedisClient.set).toHaveBeenCalled();
			const setCalls = mockRedisClient.set.mock.calls as unknown[][];

			// Should cache by userSitekeyIpHash (hash → sessionId)
			const hashCached = setCalls.some(
				(call) =>
					call[0] === `cache:session:hash:${userSitekeyIpHash}` &&
					call[1] === response.sessionId,
			);
			expect(hashCached).toBe(true);
		});

		it("should cache image session in Redis after creation", async () => {
			const db: IProviderDatabase = {
				storeSessionRecord: vi.fn(),
				getDetectorKeys: vi.fn(() => Promise.resolve(["test-key"])),
			} as unknown as IProviderDatabase;

			const pair: KeyringPair = {
				sign: vi.fn(),
				address: "testAddress",
			} as unknown as KeyringPair;

			const config: ProsopoConfigOutput = {
				penalties: FrictionlessPenalties.parse({}),
				captchas: { solved: { count: 5 }, unsolved: { count: 5 } },
				lRules: { en: 1 },
			} as unknown as ProsopoConfigOutput;

			const manager = new FrictionlessManager(db, pair, config, mockLogger);
			manager.setWriteQueue(writeQueue);

			manager.setSessionParams({
				token: "image-token",
				score: 0.8,
				threshold: 0.5,
				scoreComponents: { baseScore: 0.8 },
				providerSelectEntropy: 13337,
				ipAddress: getCompositeIpAddress("10.0.0.2"),
				webView: false,
				iFrame: false,
				decryptedHeadHash: "hash456",
				siteKey: "dapp-sitekey",
			});

			const userSitekeyIpHash = "user-ip-hash-img";
			const response = await manager.sendImageCaptcha({
				userSitekeyIpHash,
				solvedImagesCount: 3,
			});

			expect(response.captchaType).toBe(CaptchaType.image);
			expect(response.sessionId).toBeDefined();
			expect(db.storeSessionRecord).toHaveBeenCalledOnce();

			// Allow fire-and-forget caching to settle
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Verify Redis caching occurred for both keys
			expect(mockRedisClient.set).toHaveBeenCalled();
			const setCalls = mockRedisClient.set.mock.calls;

			const hashCacheCall = setCalls.find(
				(call: string[]) =>
					typeof call[0] === "string" &&
					call[0] === `cache:session:hash:${userSitekeyIpHash}`,
			);
			expect(hashCacheCall).toBeDefined();
		});
	});

	describe("Redis cache read-through for session deduplication", () => {
		it("should return cached session from Redis when available", async () => {
			const sessionId = "cached-session-123";
			const sessionData = {
				sessionId,
				captchaType: CaptchaType.pow,
				score: 0.3,
				deleted: false,
			};

			// Simulate Redis cache hit
			mockRedisClient.get
				.mockResolvedValueOnce(sessionId) // getCachedSessionByHash
				.mockResolvedValueOnce(JSON.stringify(sessionData)); // getCachedSession

			const cachedHashResult =
				await writeQueue.getCachedSessionByHash("user-hash-123");
			expect(cachedHashResult).toBe(sessionId);

			const cachedSession = await writeQueue.getCachedSession(sessionId);
			expect(cachedSession).toEqual(sessionData);
			expect(cachedSession?.captchaType).toBe(CaptchaType.pow);
			expect(cachedSession?.deleted).toBe(false);
		});

		it("should fall through to null on Redis cache miss", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			const cachedHashResult =
				await writeQueue.getCachedSessionByHash("nonexistent-hash");
			expect(cachedHashResult).toBeNull();
		});

		it("should fall through to null when Redis is unavailable", async () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);

			const cachedHashResult =
				await writeQueue.getCachedSessionByHash("any-hash");
			expect(cachedHashResult).toBeNull();

			const cachedSession = await writeQueue.getCachedSession("any-id");
			expect(cachedSession).toBeNull();
		});
	});

	describe("Session queue flush to MongoDB", () => {
		it("should flush queued session records to MongoDB via Tasks.flushWriteQueue", async () => {
			const mockDb: IProviderDatabase = {
				storeSessionRecord: vi.fn().mockResolvedValue(undefined),
			} as unknown as IProviderDatabase;

			const sessionRecord: Record<string, unknown> = {
				sessionId: "flush-session-1",
				createdAt: new Date().toISOString(),
				token: "test-token",
				score: 0.5,
				threshold: 0.5,
				scoreComponents: { baseScore: 0.5 },
				providerSelectEntropy: 13337,
				ipAddress: { lower: 16843009, type: "v4" },
				captchaType: CaptchaType.pow,
				webView: false,
				iFrame: false,
				decryptedHeadHash: "abc",
			};

			// Queue the session
			await writeQueue.queueSessionRecord("flush-session-1", sessionRecord);

			// Mock draining: return the queued records
			mockRedisClient.sMembers.mockResolvedValue(["flush-session-1"]);
			mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionRecord));

			// Flush
			await Tasks.flushWriteQueue(writeQueue, mockDb, mockLogger);

			expect(mockDb.storeSessionRecord).toHaveBeenCalledOnce();
			expect(mockDb.storeSessionRecord).toHaveBeenCalledWith(sessionRecord);
		});

		it("should handle flush errors gracefully without crashing", async () => {
			const mockDb: IProviderDatabase = {
				storeSessionRecord: vi
					.fn()
					.mockRejectedValue(new Error("MongoDB write error")),
			} as unknown as IProviderDatabase;

			// Mock draining: return a queued record
			mockRedisClient.sMembers.mockResolvedValue(["err-session"]);
			mockRedisClient.get.mockResolvedValue(
				JSON.stringify({ sessionId: "err-session" }),
			);

			// Should not throw
			await Tasks.flushWriteQueue(writeQueue, mockDb, mockLogger);

			expect(mockLogger.error).toHaveBeenCalled();
		});

		it("should do nothing when queue is empty", async () => {
			const mockDb: IProviderDatabase = {
				storeSessionRecord: vi.fn(),
			} as unknown as IProviderDatabase;

			mockRedisClient.sMembers.mockResolvedValue([]);

			await Tasks.flushWriteQueue(writeQueue, mockDb, mockLogger);

			expect(mockDb.storeSessionRecord).not.toHaveBeenCalled();
		});
	});

	describe("Cache invalidation on session update", () => {
		it("should invalidate cached session when updated", async () => {
			const sessionId = "session-to-invalidate";

			// First cache it
			await writeQueue.cacheSession(sessionId, { score: 0.5 });
			expect(mockRedisClient.set).toHaveBeenCalled();

			// Then invalidate
			await writeQueue.invalidateCachedSession(sessionId);
			expect(mockRedisClient.del).toHaveBeenCalledWith(
				`cache:session:${sessionId}`,
			);
		});
	});
});
