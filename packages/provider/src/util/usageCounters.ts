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
import {
	COUNTER_WINDOW_SECONDS,
	type CounterSpec,
	encodeCounterKey,
} from "@prosopo/types";

type RedisClient = Awaited<ReturnType<RedisConnection["getClient"]>>;

/** Lua: INCR + EXPIRE only on first transition to 1. No TTL refresh. */
const INCR_WITH_TTL_LUA = `local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return count`;

export interface CounterIncrement {
	spec: CounterSpec;
	value: string;
}

/**
 * Per-sitekey usage counters backed by Redis. Writes are atomic via a Lua
 * script that only sets TTL on first transition to 1 — subsequent INCRs
 * within the same window do not refresh the TTL.
 *
 * All operations gracefully no-op (or return zeros) when Redis is unavailable
 * so the caller can fall back to baseline behaviour.
 */
export class UsageCounters {
	private readonly connection: RedisConnection;
	private readonly logger: Logger;
	private scriptShaPromise: Promise<string> | null = null;

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

	private async getScriptSha(client: RedisClient): Promise<string> {
		if (!this.scriptShaPromise) {
			this.scriptShaPromise = client.scriptLoad(INCR_WITH_TTL_LUA).then(
				(sha) => sha as string,
				(error) => {
					this.scriptShaPromise = null;
					throw error;
				},
			);
		}
		return this.scriptShaPromise;
	}

	/**
	 * Atomically increment a counter. Sets TTL only on the first write within
	 * the window. Returns the post-increment value, or null on Redis failure.
	 */
	async incr(
		dappAccount: string,
		spec: CounterSpec,
		value: string,
	): Promise<number | null> {
		const client = await this.getClient();
		if (!client) {
			return null;
		}
		const key = encodeCounterKey(dappAccount, spec, value);
		const ttlSeconds = COUNTER_WINDOW_SECONDS[spec.window];
		try {
			const sha = await this.getScriptSha(client);
			const result = await client.evalSha(sha, {
				keys: [key],
				arguments: [String(ttlSeconds)],
			});
			return Number(result);
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Counter incr failed",
				err: error,
				data: { key },
			}));
			return null;
		}
	}

	/**
	 * Fire-and-forget increment. Errors are logged but do not propagate.
	 */
	incrAsync(dappAccount: string, spec: CounterSpec, value: string): void {
		this.incr(dappAccount, spec, value).catch((error) => {
			this.logger.error(() => ({
				msg: "Counter incrAsync rejected",
				err: error,
				data: { dappAccount, spec, value },
			}));
		});
	}

	/**
	 * Fire-and-forget increment of multiple counters in parallel.
	 */
	incrManyAsync(dappAccount: string, increments: CounterIncrement[]): void {
		for (const { spec, value } of increments) {
			this.incrAsync(dappAccount, spec, value);
		}
	}

	/**
	 * Bulk read counters via MGET. Missing keys map to 0. Returns a record
	 * keyed by encoded counter key. Returns null on Redis failure so callers
	 * can fall back.
	 */
	async batchGet(
		dappAccount: string,
		reads: CounterIncrement[],
	): Promise<Record<string, number> | null> {
		if (reads.length === 0) {
			return {};
		}
		const client = await this.getClient();
		if (!client) {
			return null;
		}
		const keys = reads.map((r) =>
			encodeCounterKey(dappAccount, r.spec, r.value),
		);
		try {
			const values = await client.mGet(keys);
			const out: Record<string, number> = {};
			for (let i = 0; i < keys.length; i++) {
				const raw = values[i];
				const key = keys[i];
				if (key === undefined) continue;
				out[key] = raw === null || raw === undefined ? 0 : Number(raw);
			}
			return out;
		} catch (error) {
			this.logger.warn(() => ({
				msg: "Counter batchGet failed",
				err: error,
				data: { keyCount: keys.length },
			}));
			return null;
		}
	}
}

/**
 * Helper: produce the standard 24-counter served/solved write set for a given
 * captcha challenge. Used by both served (post-session) and solved hooks.
 */
export const buildAllWindowIncrements = (
	kind: "served" | "solved",
	captchaType: CounterSpec["captchaType"],
	ip: string,
	userAccount: string,
): CounterIncrement[] => {
	const out: CounterIncrement[] = [];
	for (const window of [
		"1m",
		"10m",
		"1h",
		"3h",
		"6h",
		"24h",
	] as CounterSpec["window"][]) {
		out.push(
			{ spec: { kind, captchaType, dimension: "ip", window }, value: ip },
			{
				spec: { kind, captchaType, dimension: "userAccount", window },
				value: userAccount,
			},
		);
		if (captchaType !== "any") {
			out.push(
				{
					spec: { kind, captchaType: "any", dimension: "ip", window },
					value: ip,
				},
				{
					spec: {
						kind,
						captchaType: "any",
						dimension: "userAccount",
						window,
					},
					value: userAccount,
				},
			);
		}
	}
	return out;
};
