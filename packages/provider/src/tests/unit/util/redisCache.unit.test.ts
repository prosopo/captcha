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
import type { RedisConnection } from "@prosopo/redis-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RedisWriteQueue } from "../../../util/redisCache.js";

describe("RedisWriteQueue", () => {
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

		vi.clearAllMocks();
	});

	afterEach(() => {
		writeQueue.stopPeriodicFlush();
	});

	describe("isReady", () => {
		it("should return true when connection is ready", () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(true);
			expect(writeQueue.isReady()).toBe(true);
		});

		it("should return false when connection is not ready", () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);
			expect(writeQueue.isReady()).toBe(false);
		});
	});

	describe("cacheSession", () => {
		it("should cache session data in Redis with TTL", async () => {
			const sessionId = "session-123";
			const sessionData = { captchaType: "pow", score: 0.5 };

			const result = await writeQueue.cacheSession(sessionId, sessionData);

			expect(result).toBe(true);
			expect(mockRedisClient.set).toHaveBeenCalledWith(
				`cache:session:${sessionId}`,
				JSON.stringify(sessionData),
				{ EX: 86400 },
			);
		});

		it("should accept custom TTL", async () => {
			const sessionId = "session-123";
			const sessionData = { captchaType: "pow" };

			await writeQueue.cacheSession(sessionId, sessionData, 3600);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				`cache:session:${sessionId}`,
				JSON.stringify(sessionData),
				{ EX: 3600 },
			);
		});

		it("should return false when Redis is not ready", async () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);

			const result = await writeQueue.cacheSession("session-123", {});

			expect(result).toBe(false);
			expect(mockRedisClient.set).not.toHaveBeenCalled();
		});

		it("should return false and log warning on Redis error", async () => {
			mockRedisClient.set.mockRejectedValue(new Error("Redis error"));

			const result = await writeQueue.cacheSession("session-123", {
				data: "test",
			});

			expect(result).toBe(false);
			expect(mockLogger.warn).toHaveBeenCalled();
		});
	});

	describe("getCachedSession", () => {
		it("should return cached session data", async () => {
			const sessionData = { captchaType: "pow", score: 0.8 };
			mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

			const result = await writeQueue.getCachedSession("session-123");

			expect(result).toEqual(sessionData);
			expect(mockRedisClient.get).toHaveBeenCalledWith(
				"cache:session:session-123",
			);
		});

		it("should roundtrip BigInt values through cache and restore them", async () => {
			const sessionData = {
				captchaType: "pow",
				ipAddress: { lower: 16843009n, upper: 0n, type: "v4" },
			};

			// Simulate the write path: cacheSession serializes with bigIntReplacer
			await writeQueue.cacheSession("session-bigint", sessionData);
			const storedJson = mockRedisClient.set.mock.calls[0][1] as string;

			// The stored JSON should have tagged BigInts, not raw BigInts
			expect(storedJson).toContain("__bigint__:");
			expect(storedJson).not.toContain("[object");

			// Simulate the read path: getCachedSession deserializes with bigIntReviver
			mockRedisClient.get.mockResolvedValue(storedJson);
			const result = await writeQueue.getCachedSession("session-bigint");

			// BigInt values should be restored, not left as strings
			const ip = result?.ipAddress as {
				lower: bigint;
				upper: bigint;
				type: string;
			};
			expect(typeof ip.lower).toBe("bigint");
			expect(ip.lower).toBe(16843009n);
			expect(typeof ip.upper).toBe("bigint");
			expect(ip.upper).toBe(0n);
			expect(ip.type).toBe("v4");
		});

		it("should return null on cache miss", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			const result = await writeQueue.getCachedSession("session-123");

			expect(result).toBeNull();
		});

		it("should return null when Redis is not ready", async () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);

			const result = await writeQueue.getCachedSession("session-123");

			expect(result).toBeNull();
		});

		it("should return null and log warning on Redis error", async () => {
			mockRedisClient.get.mockRejectedValue(new Error("Redis error"));

			const result = await writeQueue.getCachedSession("session-123");

			expect(result).toBeNull();
			expect(mockLogger.warn).toHaveBeenCalled();
		});
	});

	describe("invalidateCachedSession", () => {
		it("should delete cached session from Redis", async () => {
			await writeQueue.invalidateCachedSession("session-123");

			expect(mockRedisClient.del).toHaveBeenCalledWith(
				"cache:session:session-123",
			);
		});

		it("should not call del when Redis is not ready", async () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);

			await writeQueue.invalidateCachedSession("session-123");

			expect(mockRedisClient.del).not.toHaveBeenCalled();
		});
	});

	describe("cacheSessionByHash", () => {
		it("should cache sessionId by userSitekeyIpHash", async () => {
			const hash = "user-sitekey-ip-hash";
			const sessionId = "session-456";

			const result = await writeQueue.cacheSessionByHash(hash, sessionId);

			expect(result).toBe(true);
			expect(mockRedisClient.set).toHaveBeenCalledWith(
				`cache:session:hash:${hash}`,
				sessionId,
				{ EX: 3600 },
			);
		});

		it("should accept custom TTL", async () => {
			await writeQueue.cacheSessionByHash("hash", "session", 7200);

			expect(mockRedisClient.set).toHaveBeenCalledWith(
				"cache:session:hash:hash",
				"session",
				{ EX: 7200 },
			);
		});

		it("should return false when Redis is not ready", async () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);

			const result = await writeQueue.cacheSessionByHash("hash", "session");

			expect(result).toBe(false);
		});
	});

	describe("getCachedSessionByHash", () => {
		it("should return cached sessionId", async () => {
			mockRedisClient.get.mockResolvedValue("session-456");

			const result = await writeQueue.getCachedSessionByHash("hash-123");

			expect(result).toBe("session-456");
			expect(mockRedisClient.get).toHaveBeenCalledWith(
				"cache:session:hash:hash-123",
			);
		});

		it("should return null on cache miss", async () => {
			mockRedisClient.get.mockResolvedValue(null);

			const result = await writeQueue.getCachedSessionByHash("hash-123");

			expect(result).toBeNull();
		});
	});

	describe("queueSessionRecord", () => {
		it("should queue session and also cache it for immediate reads", async () => {
			const sessionId = "session-789";
			const record = { token: "abc", score: 0.9 };

			const result = await writeQueue.queueSessionRecord(sessionId, record);

			expect(result).toBe(true);
			// Should write to queue key
			expect(mockRedisClient.set).toHaveBeenCalledWith(
				`writeq:session:${sessionId}`,
				JSON.stringify(record),
				{ EX: 86400 },
			);
			// Should add to pending set
			expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
				"writeq:session:pending",
				sessionId,
			);
			// Should also cache for reads
			expect(mockRedisClient.set).toHaveBeenCalledWith(
				`cache:session:${sessionId}`,
				JSON.stringify(record),
				{ EX: 86400 },
			);
		});

		it("should return false when Redis is not ready", async () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);

			const result = await writeQueue.queueSessionRecord("session", {});

			expect(result).toBe(false);
		});
	});

	describe("drainSessionRecords", () => {
		it("should drain all pending session records", async () => {
			const sessionIds = ["session-1", "session-2"];
			const records = [
				{ token: "a", score: 0.5 },
				{ token: "b", score: 0.8 },
			];

			mockRedisClient.sMembers.mockResolvedValue(sessionIds);
			mockRedisClient.get
				.mockResolvedValueOnce(JSON.stringify(records[0]))
				.mockResolvedValueOnce(JSON.stringify(records[1]));

			const result = await writeQueue.drainSessionRecords();

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				sessionId: "session-1",
				record: records[0],
			});
			expect(result[1]).toEqual({
				sessionId: "session-2",
				record: records[1],
			});
			// Should clean up queue keys
			expect(mockRedisClient.sRem).toHaveBeenCalledTimes(2);
			expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
		});

		it("should respect the limit parameter", async () => {
			const sessionIds = ["session-1", "session-2", "session-3"];
			mockRedisClient.sMembers.mockResolvedValue(sessionIds);
			mockRedisClient.get.mockResolvedValue(JSON.stringify({ token: "x" }));

			const result = await writeQueue.drainSessionRecords(2);

			expect(result).toHaveLength(2);
		});

		it("should skip records with no data", async () => {
			mockRedisClient.sMembers.mockResolvedValue(["session-1"]);
			mockRedisClient.get.mockResolvedValue(null);

			const result = await writeQueue.drainSessionRecords();

			expect(result).toHaveLength(0);
		});

		it("should return empty array when Redis is not ready", async () => {
			vi.mocked(mockConnection.isReady).mockReturnValue(false);

			const result = await writeQueue.drainSessionRecords();

			expect(result).toEqual([]);
		});
	});

	describe("startPeriodicFlush / stopPeriodicFlush", () => {
		it("should call the flush callback periodically", async () => {
			vi.useFakeTimers();
			const callback = vi.fn().mockResolvedValue(undefined);

			writeQueue.startPeriodicFlush(callback, 100);

			vi.advanceTimersByTime(100);
			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(writeQueue);

			vi.advanceTimersByTime(100);
			expect(callback).toHaveBeenCalledTimes(2);

			writeQueue.stopPeriodicFlush();

			vi.advanceTimersByTime(200);
			expect(callback).toHaveBeenCalledTimes(2);

			vi.useRealTimers();
		});

		it("should stop previous timer when starting a new one", () => {
			vi.useFakeTimers();
			const callback1 = vi.fn().mockResolvedValue(undefined);
			const callback2 = vi.fn().mockResolvedValue(undefined);

			writeQueue.startPeriodicFlush(callback1, 100);
			writeQueue.startPeriodicFlush(callback2, 100);

			vi.advanceTimersByTime(100);

			expect(callback1).not.toHaveBeenCalled();
			expect(callback2).toHaveBeenCalledTimes(1);

			writeQueue.stopPeriodicFlush();
			vi.useRealTimers();
		});

		it("should log errors from flush callback without throwing", async () => {
			vi.useFakeTimers();
			const callback = vi.fn().mockRejectedValue(new Error("Flush failed"));

			writeQueue.startPeriodicFlush(callback, 100);

			vi.advanceTimersByTime(100);

			// Wait for microtasks to process
			await vi.advanceTimersByTimeAsync(0);

			expect(mockLogger.error).toHaveBeenCalled();

			writeQueue.stopPeriodicFlush();
			vi.useRealTimers();
		});
	});
});
