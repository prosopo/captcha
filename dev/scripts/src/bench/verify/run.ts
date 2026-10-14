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

import type { ProviderEnvironment } from "@prosopo/env";
import type { IpapiStub } from "./ipapiStub.js";
import {
	type BenchSite,
	type MintedToken,
	mintToken,
	registerBenchSite,
	verifyToken,
} from "./mint.js";
import { BENCH_DATABASE } from "./provider.js";
import type { Scenario } from "./scenarios.js";
import {
	type ProxyName,
	diffOps,
	readMongoOps,
	readRedisOps,
	setRoundTripLatency,
} from "./stack.js";

const WARMUP = 20;
const MINT_CONCURRENCY = 8;
// Lets fire-and-forget writes from minting, or from the measured verifies,
// land inside the window they belong to.
const SETTLE_MS = 1500;
const BENCH_REDIS_COMMANDS = [
	"info",
	"auth",
	"hello",
	"ping",
	"client|setinfo",
];

export type LatencyStats = {
	p50: number;
	p95: number;
	p99: number;
	mean: number;
};

export type OpsPerVerify = {
	mongo: number;
	redis: number;
	ipapi: number;
	mongoByCollection: Record<string, number>;
	redisByCommand: Record<string, number>;
};

export type ScenarioResult = {
	scenario: string;
	samples: number;
	latencyByInjectedMs: Record<string, LatencyStats>;
	roundTrips: number;
	ops: OpsPerVerify;
};

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

const percentile = (sorted: number[], p: number): number =>
	sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ??
	Number.NaN;

const stats = (samples: number[]): LatencyStats => {
	const sorted = [...samples].sort((a, b) => a - b);
	return {
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		p99: percentile(sorted, 99),
		mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
	};
};

const perVerify = (
	counts: Record<string, number>,
	n: number,
): Record<string, number> =>
	Object.fromEntries(
		Object.entries(counts).map(([key, value]) => [
			key,
			Math.round((value / n) * 100) / 100,
		]),
	);

const sum = (counts: Record<string, number>): number =>
	Math.round(Object.values(counts).reduce((a, b) => a + b, 0) * 100) / 100;

const mintMany = async (
	env: ProviderEnvironment,
	providerUrl: string,
	site: BenchSite,
	count: number,
): Promise<MintedToken[]> => {
	const tokens: MintedToken[] = [];
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < count) {
			next++;
			tokens.push(await mintToken(env, providerUrl, site));
		}
	};
	await Promise.all(Array.from({ length: MINT_CONCURRENCY }, worker));
	return tokens;
};

type Measurement = {
	latencies: number[];
	ops?: {
		mongo: Record<string, number>;
		redis: Record<string, number>;
		ipapi: number;
	};
};

const measure = async (
	env: ProviderEnvironment,
	providerUrl: string,
	ipapi: IpapiStub,
	site: BenchSite,
	scenario: Scenario,
	samples: number,
	injectedMs: number,
	latencyTargets: readonly ProxyName[],
	countOps: boolean,
): Promise<Measurement> => {
	await setRoundTripLatency(0);
	const tokens = await mintMany(env, providerUrl, site, samples + WARMUP);
	if (scenario.replay) {
		for (const token of tokens) {
			await verifyToken(providerUrl, site, token, scenario.verify);
		}
	}
	await sleep(Math.max(SETTLE_MS, scenario.waitBeforeVerifyMs ?? 0));
	await setRoundTripLatency(injectedMs, latencyTargets);

	for (const token of tokens.slice(0, WARMUP)) {
		await verifyToken(providerUrl, site, token, scenario.verify);
	}
	await sleep(SETTLE_MS);

	const mongoBefore = countOps ? readMongoOps(BENCH_DATABASE) : {};
	const redisBefore = countOps ? readRedisOps() : {};
	const ipapiBefore = ipapi.lookups;

	const latencies: number[] = [];
	for (const token of tokens.slice(WARMUP)) {
		const outcome = await verifyToken(
			providerUrl,
			site,
			token,
			scenario.verify,
		);
		if (
			outcome.status !== 200 ||
			outcome.verified !== scenario.expectVerified
		) {
			throw new Error(
				`${scenario.name}: expected verified=${scenario.expectVerified}, got ${outcome.status} ${outcome.body}`,
			);
		}
		latencies.push(outcome.ms);
	}

	if (!countOps) return { latencies };
	await sleep(SETTLE_MS);
	return {
		latencies,
		ops: {
			mongo: diffOps(mongoBefore, readMongoOps(BENCH_DATABASE)),
			redis: diffOps(redisBefore, readRedisOps(), BENCH_REDIS_COMMANDS),
			ipapi: ipapi.lookups - ipapiBefore,
		},
	};
};

export const runScenario = async (
	env: ProviderEnvironment,
	providerUrl: string,
	ipapi: IpapiStub,
	scenario: Scenario,
	samples: number,
	injectedLatencies: number[],
	latencyTargets: readonly ProxyName[],
): Promise<ScenarioResult> => {
	const site = await registerBenchSite(env, scenario.settings);
	const latencyByInjectedMs: Record<string, LatencyStats> = {};
	let ops: OpsPerVerify | undefined;

	for (const injectedMs of injectedLatencies) {
		const result = await measure(
			env,
			providerUrl,
			ipapi,
			site,
			scenario,
			samples,
			injectedMs,
			latencyTargets,
			ops === undefined,
		);
		latencyByInjectedMs[String(injectedMs)] = stats(result.latencies);
		if (result.ops) {
			const mongoByCollection = perVerify(result.ops.mongo, samples);
			const redisByCommand = perVerify(result.ops.redis, samples);
			ops = {
				mongo: sum(mongoByCollection),
				redis: sum(redisByCommand),
				ipapi: Math.round((result.ops.ipapi / samples) * 100) / 100,
				mongoByCollection,
				redisByCommand,
			};
		}
	}

	const lowest = Math.min(...injectedLatencies);
	const highest = Math.max(...injectedLatencies);
	const low = latencyByInjectedMs[String(lowest)];
	const high = latencyByInjectedMs[String(highest)];
	const roundTrips =
		low && high && highest > lowest
			? Math.round(((high.p50 - low.p50) / (highest - lowest)) * 10) / 10
			: Number.NaN;

	return {
		scenario: scenario.name,
		samples,
		latencyByInjectedMs,
		roundTrips,
		ops: ops ?? {
			mongo: 0,
			redis: 0,
			ipapi: 0,
			mongoByCollection: {},
			redisByCommand: {},
		},
	};
};

/**
 * Fires `parallel` verifies of one token at once. Exactly one may pass: this
 * is the single-use guarantee every latency change on the verify path must keep.
 */
export const checkSingleUse = async (
	env: ProviderEnvironment,
	providerUrl: string,
	parallel: number,
): Promise<void> => {
	await setRoundTripLatency(0);
	const site = await registerBenchSite(env, {});
	const [token] = await mintMany(env, providerUrl, site, 1);
	if (!token)
		throw new Error("failed to mint a token for the single-use check");
	const outcomes = await Promise.all(
		Array.from({ length: parallel }, () =>
			verifyToken(providerUrl, site, token, {}),
		),
	);
	const passed = outcomes.filter((outcome) => outcome.verified).length;
	if (passed !== 1) {
		throw new Error(
			`single-use violated: ${passed} of ${parallel} concurrent verifies of one token passed`,
		);
	}
};
