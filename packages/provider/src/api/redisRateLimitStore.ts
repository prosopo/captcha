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
import type { RedisConnection } from "@prosopo/redis-client";
import {
	type ClientRateLimitInfo,
	MemoryStore,
	type Options,
	type Store,
} from "express-rate-limit";

type RedisClient = Awaited<ReturnType<RedisConnection["getClient"]>>;

const INCREMENT_LUA = `local hits = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if hits == 1 or ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {hits, ttl}`;

const DECREMENT_LUA = `if redis.call('EXISTS', KEYS[1]) == 1 then
  return redis.call('DECR', KEYS[1])
end
return 0`;

export const RATE_LIMIT_REDIS_TIMEOUT_MS = 100;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`Redis rate limit call exceeded ${ms}ms`)),
			ms,
		);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});

const parseIncrementReply = (reply: unknown): [number, number] => {
	if (Array.isArray(reply) && reply.length === 2) {
		const hits = Number(reply[0]);
		const ttl = Number(reply[1]);
		if (Number.isInteger(hits) && Number.isFinite(ttl)) {
			return [hits, ttl];
		}
	}
	throw new Error("Unexpected rate limit increment reply");
};

/**
 * express-rate-limit store shared by every provider container on a node, so a
 * client gets one allowance no matter which container serves it. Falls back to
 * a per-process MemoryStore while Redis is unreachable or slow, so limits keep
 * applying (per container) rather than failing open or blocking requests.
 */
export class RedisRateLimitStore implements Store {
	readonly prefix: string;
	readonly localKeys = false;
	private windowMs = 60_000;
	private readonly fallback = new MemoryStore();

	constructor(
		private readonly getConnection: () => RedisConnection | undefined,
		private readonly logger: Logger,
		prefix: string,
		private readonly timeoutMs = RATE_LIMIT_REDIS_TIMEOUT_MS,
	) {
		this.prefix = `rl:${prefix}:`;
	}

	init(options: Options): void {
		this.windowMs = options.windowMs;
		this.fallback.init(options);
	}

	private async getClient(): Promise<RedisClient | undefined> {
		const connection = this.getConnection();
		if (!connection?.isReady()) {
			return undefined;
		}
		return connection.getClient();
	}

	private async run<T>(
		operation: string,
		key: string,
		onRedis: (client: RedisClient, redisKey: string) => Promise<T>,
		onFallback: () => Promise<T> | T,
	): Promise<T> {
		try {
			const client = await this.getClient();
			if (client) {
				return await withTimeout(
					onRedis(client, this.prefix + key),
					this.timeoutMs,
				);
			}
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Redis rate limit store failed, using in-memory fallback",
				err: error,
				data: { operation, prefix: this.prefix },
			}));
		}
		return onFallback();
	}

	increment(key: string): Promise<ClientRateLimitInfo> {
		return this.run(
			"increment",
			key,
			async (client, redisKey) => {
				const [totalHits, ttl] = parseIncrementReply(
					await client.eval(INCREMENT_LUA, {
						keys: [redisKey],
						arguments: [String(this.windowMs)],
					}),
				);
				return { totalHits, resetTime: new Date(Date.now() + ttl) };
			},
			() => this.fallback.increment(key),
		);
	}

	decrement(key: string): Promise<void> {
		return this.run(
			"decrement",
			key,
			async (client, redisKey) => {
				await client.eval(DECREMENT_LUA, { keys: [redisKey] });
			},
			() => this.fallback.decrement(key),
		);
	}

	resetKey(key: string): Promise<void> {
		return this.run(
			"resetKey",
			key,
			async (client, redisKey) => {
				await client.del(redisKey);
			},
			() => this.fallback.resetKey(key),
		);
	}
}
