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

// Writes redis.json: the text the TS RedisWriteQueue puts in Redis for each call, against a
// client that keeps what it is sent. A Rust and a TS provider share a Redis, so the Rust must
// write the same text and read what the TS wrote. Each call's arguments are recorded as the
// JSON the Rust holds them as: what the TS writes for them, read back.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Logger } from "@prosopo/logger";
import type { RedisConnection } from "@prosopo/redis-client";
import { RedisWriteQueue } from "../../src/redisCache.js";

const NOW_MS = 1_710_000_060_123;
const RealDate = Date;
class PinnedDate extends RealDate {
	constructor(...args: ConstructorParameters<typeof Date> | []) {
		if (args.length === 0) super(NOW_MS);
		else super(...(args as ConstructorParameters<typeof Date>));
	}
	static override now(): number {
		return NOW_MS;
	}
}
globalThis.Date = PinnedDate as unknown as DateConstructor;

type Sent = { command: string; args: string[] };
const store = new Map<string, string>();
let sent: Sent[] = [];
const client = {
	set: async (key: string, value: string, options: { EX: number }): Promise<string> => {
		sent.push({ command: "SET", args: [key, value, "EX", String(options.EX)] });
		store.set(key, value);
		return "OK";
	},
	get: async (key: string): Promise<string | null> => {
		sent.push({ command: "GET", args: [key] });
		return store.get(key) ?? null;
	},
	eval: async (script: string, options: { keys: string[]; arguments: string[] }): Promise<number> => {
		sent.push({ command: "EVAL", args: [script, String(options.keys.length), ...options.keys, ...options.arguments] });
		const [key] = options.keys;
		const [expected, next] = options.arguments;
		if (key === undefined || next === undefined || store.get(key) !== expected) return 0;
		store.set(key, next);
		return 1;
	},
	del: async (key: string): Promise<number> => {
		sent.push({ command: "DEL", args: [key] });
		return store.delete(key) ? 1 : 0;
	},
};
const connection = { isReady: () => true, getClient: async () => client } as unknown as RedisConnection;
const quiet = { warn: () => {}, info: () => {}, debug: () => {}, error: () => {} } as unknown as Logger;
const queue = new RedisWriteQueue(connection, quiet);

const asRustHolds = (value: unknown): unknown =>
	JSON.parse(JSON.stringify(value, (_key: string, inner: unknown) => (typeof inner === "bigint" ? `__bigint__:${inner}` : inner)));

type Case = { name: string; method: string; args: unknown[]; before: Record<string, string>; sent: Sent[]; result: unknown };
const cases: Case[] = [];
const record = async (name: string, method: string, args: unknown[]): Promise<void> => {
	sent = [];
	const before: Record<string, string> = Object.fromEntries(store);
	const result: unknown = await (queue as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method](...args);
	cases.push({ name, method, args: args.map(asRustHolds), before, sent: [...sent], result: asRustHolds(result ?? null) });
};

const session = {
	sessionId: "s1",
	"10": "integer-like keys come first",
	"2": "and in numeric order",
	createdAt: new Date(1_700_000_000_123),
	score: 0.1 + 0.2,
	threshold: 1e21,
	tiny: 5e-7,
	negativeZero: -0,
	big: 1_700_000_000_000_000_000,
	ipAddress: { lower: 3232235777n, upper: 2n ** 64n - 1n, type: "v6" },
	headers: { "user-agent": "Mozilla/5.0", "accept-language": "en-GB,en;q=0.9" },
	text: "quote \" backslash \\ newline \n tab \t control \u0001 line separator   emoji 😀",
	nothing: null,
	flags: [true, false, 0, -1.5],
	nested: { deeper: { deepest: [{ a: 1 }, []] } },
};
await record("cache a session", "cacheSession", ["s1", session]);
await record("cache a session for a minute", "cacheSession", ["s2", { sessionId: "s2" }, 60]);
await record("read a cached session", "getCachedSession", ["s1"]);
await record("read a missing session", "getCachedSession", ["missing"]);
await record("patch a session", "patchCachedSession", ["s1", { score: 0.75, "1": "new integer-like key", headers: { origin: "https://example.com" }, newField: [1, 2] }]);
await record("patch a session for a minute", "patchCachedSession", ["s2", { blocked: true }, 60]);
await record("patch a missing session", "patchCachedSession", ["missing", { score: 1 }]);
await record("attach SIMD readings", "patchCachedSimdReadingsIfAbsent", ["s1", { v: 1, r: [0.5, 2] }, "frictionless"]);
await record("attach SIMD readings again", "patchCachedSimdReadingsIfAbsent", ["s1", { v: 2 }, "challenge"]);
await record("attach SIMD readings to a missing session", "patchCachedSimdReadingsIfAbsent", ["missing", { v: 1 }, "submit"]);
await record("read the patched session", "getCachedSession", ["s1"]);
await record("cache a session by hash", "cacheSessionByHash", ["hash-1", "s1"]);
await record("read a session by hash", "getCachedSessionByHash", ["hash-1"]);
await record("cache a detector bundle", "cacheDetectorBundle", ["detector-1", "bundle-7"]);
await record("read a detector bundle", "getDetectorBundle", ["detector-1"]);
await record("cache an escalation", "cacheSessionEscalation", ["origin-1", "escalated-1"]);
await record("read an escalation", "getCachedSessionEscalation", ["origin-1"]);
await record("invalidate an escalation", "invalidateCachedSessionEscalation", ["origin-1"]);
await record("invalidate a session", "invalidateCachedSession", ["s2"]);
await record("invalidate a session by hash", "invalidateCachedSessionByHash", ["hash-1"]);
store.set("cache:session:falsy", JSON.stringify({ sessionId: "falsy", simdReadings: 0 }));
await record("attach SIMD readings over a falsy value", "patchCachedSimdReadingsIfAbsent", ["falsy", { v: 1 }, "submit"]);

writeFileSync(fileURLToPath(new URL("./redis.json", import.meta.url)), `${JSON.stringify({ nowMs: NOW_MS, cases }, null, "\t")}\n`);
console.log(`wrote redis.json (${cases.length} cases)`);
