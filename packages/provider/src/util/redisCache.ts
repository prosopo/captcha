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

/** The Redis client type returned by RedisConnection.getClient() */
type RedisClient = Awaited<ReturnType<RedisConnection["getClient"]>>;

const BIGINT_TAG = "__bigint__:";

/** JSON replacer that tags BigInt values so they can be restored by bigIntReviver. */
const bigIntReplacer = (_key: string, value: unknown): unknown =>
	"bigint" === typeof value ? `${BIGINT_TAG}${value.toString()}` : value;

/** JSON reviver that restores tagged BigInt values produced by bigIntReplacer. */
const bigIntReviver = (_key: string, value: unknown): unknown =>
	"string" === typeof value && value.startsWith(BIGINT_TAG)
		? BigInt(value.slice(BIGINT_TAG.length))
		: value;

/**
 * Redis-backed write queue and read cache for reducing MongoDB load.
 *
 * Provides:
 * - Session record caching (reduces MongoDB reads)
 * - Session-by-hash caching for frictionless deduplication
 * - Session write queuing with periodic flush to MongoDB
 *
 * Uses an existing RedisConnection from @prosopo/redis-client rather than
 * creating its own connection.
 */
export class RedisWriteQueue {
	private readonly connection: RedisConnection;
	private readonly logger: Logger;
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private flushCallback: ((queue: RedisWriteQueue) => Promise<void>) | null =
		null;
	private earlyFlushThreshold: number | undefined;

	constructor(connection: RedisConnection, logger: Logger) {
		this.connection = connection;
		this.logger = logger;
	}

	private async getClient(): Promise<RedisClient | null> {
		if (!this.connection.isReady()) {
			return null;
		}
		try {
			return await this.connection.getClient();
		} catch {
			return null;
		}
	}

	// ── Session read cache ──────────────────────────────────────────────

	/**
	 * Cache a session record in Redis for fast lookups, reducing MongoDB reads.
	 */
	async cacheSession(
		sessionId: string,
		sessionData: Record<string, unknown>,
		ttlSeconds = 86400,
	): Promise<boolean> {
		const client = await this.getClient();
		if (!client) {
			return false;
		}

		try {
			const key = `cache:session:${sessionId}`;
			await client.set(key, JSON.stringify(sessionData, bigIntReplacer), {
				EX: ttlSeconds,
			});
			return true;
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to cache session in Redis",
				err: error,
				sessionId,
			}));
			return false;
		}
	}

	/**
	 * Retrieve a cached session record from Redis.
	 */
	async getCachedSession(
		sessionId: string,
	): Promise<Record<string, unknown> | null> {
		const client = await this.getClient();
		if (!client) {
			return null;
		}

		try {
			const key = `cache:session:${sessionId}`;
			const data = await client.get(key);
			if (!data) {
				return null;
			}
			return JSON.parse(data, bigIntReviver) as Record<string, unknown>;
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to get cached session from Redis",
				err: error,
				sessionId,
			}));
			return null;
		}
	}

	/**
	 * Invalidate a cached session when it's updated.
	 */
	async invalidateCachedSession(sessionId: string): Promise<void> {
		const client = await this.getClient();
		if (!client) {
			return;
		}

		try {
			await client.del(`cache:session:${sessionId}`);
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to invalidate cached session in Redis",
				err: error,
				sessionId,
			}));
		}
	}

	// ── Frictionless session deduplication cache ────────────────────────

	/**
	 * Cache a session lookup by userSitekeyIpHash for frictionless deduplication.
	 * Extends the effective TTL of the cached session, reducing duplicate
	 * session creation under concurrent requests for the same user+site+IP.
	 */
	async cacheSessionByHash(
		userSitekeyIpHash: string,
		sessionId: string,
		ttlSeconds = 3600,
	): Promise<boolean> {
		const client = await this.getClient();
		if (!client) {
			return false;
		}

		try {
			const key = `cache:session:hash:${userSitekeyIpHash}`;
			await client.set(key, sessionId, { EX: ttlSeconds });
			return true;
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to cache session hash in Redis",
				err: error,
				userSitekeyIpHash,
			}));
			return false;
		}
	}

	/**
	 * Get cached sessionId by userSitekeyIpHash for frictionless deduplication.
	 */
	async getCachedSessionByHash(
		userSitekeyIpHash: string,
	): Promise<string | null> {
		const client = await this.getClient();
		if (!client) {
			return null;
		}

		try {
			const key = `cache:session:hash:${userSitekeyIpHash}`;
			return await client.get(key);
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to get cached session hash from Redis",
				err: error,
				userSitekeyIpHash,
			}));
			return null;
		}
	}

	// ── Session write queue ─────────────────────────────────────────────

	/**
	 * Queue a session record for batched insertion into MongoDB.
	 * The session data is also cached in Redis for immediate reads.
	 */
	async queueSessionRecord(
		sessionId: string,
		record: Record<string, unknown>,
		ttlSeconds = 86400,
	): Promise<boolean> {
		const client = await this.getClient();
		if (!client) {
			return false;
		}

		try {
			const key = `writeq:session:${sessionId}`;
			const serialized = JSON.stringify(record, bigIntReplacer);
			await client.set(key, serialized, { EX: ttlSeconds });
			await client.sAdd("writeq:session:pending", sessionId);

			// Also cache for immediate reads
			await client.set(`cache:session:${sessionId}`, serialized, {
				EX: ttlSeconds,
			});

			// Fire-and-forget: trigger an early flush if the queue is large
			this.triggerEarlyFlushIfNeeded();

			return true;
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to queue session record in Redis",
				err: error,
				sessionId,
			}));
			return false;
		}
	}

	/**
	 * Get all pending session records ready for batch flush.
	 */
	async drainSessionRecords(
		limit = 500,
	): Promise<Array<{ sessionId: string; record: Record<string, unknown> }>> {
		const client = await this.getClient();
		if (!client) {
			return [];
		}

		try {
			const sessionIds = await client.sMembers("writeq:session:pending");
			const batch = sessionIds.slice(0, limit);
			const results: Array<{
				sessionId: string;
				record: Record<string, unknown>;
			}> = [];

			for (const sessionId of batch) {
				const key = `writeq:session:${sessionId}`;
				const data = await client.get(key);
				if (data) {
					results.push({
						sessionId,
						record: JSON.parse(data, bigIntReviver) as Record<string, unknown>,
					});
				}
				await client.sRem("writeq:session:pending", sessionId);
				await client.del(key);
			}

			return results;
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Failed to drain session records from Redis",
				err: error,
			}));
			return [];
		}
	}

	// ── Periodic flush ──────────────────────────────────────────────────

	/**
	 * Start periodic background flush of queued records.
	 * The callback receives this queue instance and should drain + bulk-write records.
	 *
	 * When the queue depth exceeds `earlyFlushThreshold`, an early flush is
	 * triggered on the next `queueSessionRecord` call without waiting for
	 * the regular interval.
	 */
	startPeriodicFlush(
		callback: (queue: RedisWriteQueue) => Promise<void>,
		intervalMs = 10000,
		earlyFlushThreshold = 50,
	): void {
		this.stopPeriodicFlush();
		this.flushCallback = callback;
		this.earlyFlushThreshold = earlyFlushThreshold;
		this.flushTimer = setInterval(() => {
			this.flushCallback?.(this).catch((error) => {
				this.logger.error(() => ({
					msg: "Periodic flush failed",
					err: error,
				}));
			});
		}, intervalMs);
	}

	/**
	 * Trigger an early flush if the pending queue exceeds the threshold.
	 * Called automatically after queueing a record. This avoids large
	 * batch build-ups between regular interval flushes.
	 */
	private triggerEarlyFlushIfNeeded(): void {
		if (!this.flushCallback || !this.earlyFlushThreshold) return;
		this.getPendingCount()
			.then((count): Promise<void> | void => {
				if (count >= (this.earlyFlushThreshold ?? 50)) {
					return this.flushCallback?.(this);
				}
			})
			.catch((error) => {
				this.logger.error(() => ({
					msg: "Early flush failed",
					err: error,
				}));
			});
	}

	/** Get the number of pending session records awaiting flush. */
	private async getPendingCount(): Promise<number> {
		const client = await this.getClient();
		if (!client) return 0;
		try {
			return await client.sCard("writeq:session:pending");
		} catch {
			return 0;
		}
	}

	/**
	 * Stop the periodic flush timer.
	 */
	stopPeriodicFlush(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
		this.flushCallback = null;
		this.earlyFlushThreshold = undefined;
	}

	/**
	 * Check if the underlying Redis connection is ready.
	 */
	isReady(): boolean {
		return this.connection.isReady();
	}
}
