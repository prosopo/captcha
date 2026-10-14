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

import { execFileSync } from "node:child_process";
import path from "node:path";

export const BENCH_PORTS = {
	mongoDirect: 27117,
	mongoProxied: 27118,
	redisDirect: 6479,
	redisProxied: 6480,
	ipapiStub: 3897,
	ipapiProxied: 3898,
	toxiproxyApi: 8474,
	provider: 9329,
} as const;

const MONGO_CONTAINER = "prosopo-bench-mongo-1";
const REDIS_CONTAINER = "prosopo-bench-redis-1";
const TOXIPROXY_URL = `http://127.0.0.1:${BENCH_PORTS.toxiproxyApi}`;

export const PROXY_NAMES = ["mongo", "redis", "ipapi"] as const;
export type ProxyName = (typeof PROXY_NAMES)[number];

type ProxyDefinition = { name: ProxyName; listen: string; upstream: string };

const PROXIES: ProxyDefinition[] = [
	{
		name: "mongo",
		listen: `0.0.0.0:${BENCH_PORTS.mongoProxied}`,
		upstream: "mongo:27017",
	},
	{
		name: "redis",
		listen: `0.0.0.0:${BENCH_PORTS.redisProxied}`,
		upstream: "redis:6379",
	},
	{
		name: "ipapi",
		listen: `0.0.0.0:${BENCH_PORTS.ipapiProxied}`,
		upstream: `host.docker.internal:${BENCH_PORTS.ipapiStub}`,
	},
];

export const composeUp = (repoRoot: string): void => {
	execFileSync(
		"docker",
		[
			"compose",
			"-f",
			path.join(repoRoot, "docker", "docker-compose.bench.yml"),
			"up",
			"-d",
			"--wait",
		],
		{ stdio: "inherit" },
	);
};

const toxiproxy = async (
	method: string,
	route: string,
	body?: object,
): Promise<Response> => {
	const response = await fetch(`${TOXIPROXY_URL}${route}`, {
		method,
		headers: { "Content-Type": "application/json" },
		...(body && { body: JSON.stringify(body) }),
	});
	if (!response.ok && response.status !== 404) {
		throw new Error(
			`toxiproxy ${method} ${route} failed: ${response.status} ${await response.text()}`,
		);
	}
	return response;
};

export const resetProxies = async (): Promise<void> => {
	for (const proxy of PROXIES) {
		await toxiproxy("DELETE", `/proxies/${proxy.name}`);
		await toxiproxy("POST", "/proxies", { ...proxy, enabled: true });
	}
};

/**
 * Adds `latencyMs` to every response from the chosen stores (Mongo, Redis and
 * the ipapi stub by default), so each sequential round trip to them on the
 * verify path costs that much more. Running the same scenario at two latencies
 * turns the latency difference into a count of sequential round trips, which
 * is the number the bench drives down.
 */
export const setRoundTripLatency = async (
	latencyMs: number,
	targets: readonly ProxyName[] = PROXY_NAMES,
): Promise<void> => {
	for (const proxy of PROXIES) {
		await toxiproxy("DELETE", `/proxies/${proxy.name}/toxics/latency`);
		if (latencyMs > 0 && targets.includes(proxy.name)) {
			await toxiproxy("POST", `/proxies/${proxy.name}/toxics`, {
				name: "latency",
				type: "latency",
				stream: "downstream",
				attributes: { latency: latencyMs, jitter: 0 },
			});
		}
	}
};

export type MongoOps = Record<string, number>;

/**
 * Per-collection operation counts in the bench database, read through the
 * direct (unproxied) port. Taken from `top` rather than `serverStatus` so
 * driver heartbeats, which belong to no collection, do not add noise.
 */
export const readMongoOps = (database: string): MongoOps => {
	const script = `const t = db.adminCommand({ top: 1 }).totals; const out = {}; for (const [ns, v] of Object.entries(t)) { if (!ns.startsWith(${JSON.stringify(`${database}.`)})) continue; out[ns.slice(${database.length + 1})] = v.queries.count + v.getmore.count + v.insert.count + v.update.count + v.remove.count + v.commands.count; } print(JSON.stringify(out));`;
	const output = execFileSync("docker", [
		"exec",
		MONGO_CONTAINER,
		"mongosh",
		"mongodb://root:root@localhost:27017/admin",
		"--quiet",
		"--eval",
		script,
	]).toString();
	return JSON.parse(output.trim()) as MongoOps;
};

export type RedisOps = Record<string, number>;

export const readRedisOps = (): RedisOps => {
	const output = execFileSync("docker", [
		"exec",
		REDIS_CONTAINER,
		"redis-cli",
		"-a",
		"root",
		"--no-auth-warning",
		"INFO",
		"commandstats",
	]).toString();
	const ops: RedisOps = {};
	for (const line of output.split("\n")) {
		const match = line.match(/^cmdstat_([^:]+):calls=(\d+)/);
		if (match?.[1] && match[2]) {
			ops[match[1]] = Number(match[2]);
		}
	}
	return ops;
};

export const diffOps = (
	before: Record<string, number>,
	after: Record<string, number>,
	ignore: string[] = [],
): Record<string, number> => {
	const diff: Record<string, number> = {};
	for (const [key, value] of Object.entries(after)) {
		if (ignore.includes(key)) continue;
		const delta = value - (before[key] ?? 0);
		if (delta > 0) diff[key] = delta;
	}
	return diff;
};

export const flushBenchData = (database: string): void => {
	execFileSync("docker", [
		"exec",
		MONGO_CONTAINER,
		"mongosh",
		`mongodb://root:root@localhost:27017/${database}?authSource=admin`,
		"--quiet",
		"--eval",
		"db.dropDatabase()",
	]);
	execFileSync("docker", [
		"exec",
		REDIS_CONTAINER,
		"redis-cli",
		"-a",
		"root",
		"--no-auth-warning",
		"FLUSHALL",
	]);
};
