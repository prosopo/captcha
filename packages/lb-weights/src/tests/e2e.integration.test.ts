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
//
// End-to-end test of the full balancing cycle. Everything external is mocked:
// the Bunny API (via an injected fetchFn) and the node /metrics scrape (via an
// injected metric fetcher). No real network calls are made.
import { LogLevel, getLogger } from "@prosopo/logger";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCycle, startBalancerLoop } from "../balancer.js";
import { BunnyDnsClient } from "../bunny.js";
import { type Config, loadConfig } from "../config.js";
import type { MetricsFetchOptions } from "../metrics.js";
import {
	type BunnyRecord,
	BunnyRecordType,
	type BunnyZone,
	SmartRoutingType,
} from "../types.js";
import { MAX_WEIGHT } from "../weights.js";

const logger = getLogger(LogLevel.enum.error, "e2e");

const rec = (
	Id: number,
	Name: string,
	Type: BunnyRecordType,
	Value: string,
	Weight = 100,
): BunnyRecord => ({
	Id,
	Name,
	Type,
	Value,
	Weight,
	Ttl: 15,
	SmartRoutingType: SmartRoutingType.Latency,
});

// A realistic zone: pronode (A + AAAA) and staging.pronode (A), plus an
// unmanaged subdomain and a non-address record that must be ignored.
const ZONE: BunnyZone = {
	Id: 7,
	Domain: "prosopo.io",
	Records: [
		rec(1, "pronode", BunnyRecordType.A, "10.0.0.1", 50),
		rec(2, "pronode", BunnyRecordType.A, "10.0.0.2", 50),
		rec(3, "pronode", BunnyRecordType.A, "10.0.0.3", 50),
		rec(4, "pronode", BunnyRecordType.AAAA, "2001:db8::1", 50),
		rec(5, "pronode", BunnyRecordType.AAAA, "2001:db8::2", 50),
		rec(6, "staging.pronode", BunnyRecordType.A, "10.1.0.1", 50),
		rec(7, "staging.pronode", BunnyRecordType.A, "10.1.0.2", 50),
		rec(8, "unmanaged", BunnyRecordType.A, "10.9.0.1", 50),
		rec(9, "unmanaged", BunnyRecordType.A, "10.9.0.2", 50),
		rec(10, "pronode", BunnyRecordType.CNAME, "ignore.me", 50),
	],
};

// Per-IP metric values; any IP absent from the map simulates an unreachable
// /metrics endpoint.
function metricFetcher(values: Record<string, number>) {
	return async (
		ip: string,
		_metricName: string,
		_options: MetricsFetchOptions,
	): Promise<number | null> => (ip in values ? values[ip] ?? null : null);
}

// Build a client whose listZones returns ZONE and whose writes are captured.
function makeClient(): {
	client: BunnyDnsClient;
	writes: Array<{ zoneId: number; recordId: number; weight: number }>;
	listCalls: () => number;
} {
	let listCalls = 0;
	const fetchFn = vi.fn<typeof fetch>(async (input) => {
		const url = typeof input === "string" ? input : input.toString();
		if (url.includes("/dnszone") && !url.includes("/records/")) {
			listCalls += 1;
			return new Response(JSON.stringify({ Items: [ZONE] }), {
				status: 200,
			});
		}
		// record write endpoint
		return new Response("{}", { status: 200 });
	});
	const client = new BunnyDnsClient({ accessKey: "token", logger, fetchFn });
	const writes: Array<{
		zoneId: number;
		recordId: number;
		weight: number;
	}> = [];
	vi.spyOn(client, "setWeights").mockImplementation(async (zoneId, updates) => {
		for (const u of updates) {
			writes.push({ zoneId, recordId: u.recordId, weight: u.weight });
		}
	});
	return { client, writes, listCalls: () => listCalls };
}

function config(overrides: Partial<NodeJS.ProcessEnv> = {}): Config {
	return loadConfig({
		BUNNY_API_KEY: "token",
		LB_SUBDOMAINS: "pronode, staging.pronode",
		LB_DRY_RUN: "false",
		LB_INTERVAL_SECONDS: "1",
		...overrides,
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("e2e balancing cycle", () => {
	it("computes and applies weights across all managed pools", async () => {
		const { client, writes } = makeClient();
		await runCycle({
			client,
			config: config(),
			logger,
			fetchMetric: metricFetcher({
				"10.0.0.1": 0.1,
				"10.0.0.2": 0.5,
				"10.0.0.3": 0.9,
				"2001:db8::1": 0.2,
				"2001:db8::2": 0.8,
				"10.1.0.1": 0.3,
				"10.1.0.2": 0.7,
			}),
		});

		// three managed pools (pronode A, pronode AAAA, staging.pronode A);
		// the unmanaged subdomain and CNAME are never written.
		const writtenIds = new Set(writes.map((w) => w.recordId));
		expect(writtenIds.has(8)).toBe(false);
		expect(writtenIds.has(9)).toBe(false);
		expect(writtenIds.has(10)).toBe(false);

		// within pronode A, the lowest-usage node (id 1) gets the highest weight
		const w1 = writes.find((w) => w.recordId === 1)?.weight ?? 0;
		const w3 = writes.find((w) => w.recordId === 3)?.weight ?? 0;
		expect(w1).toBeGreaterThan(w3);

		// all applied weights are Bunny-legal integers in [1, 100]
		for (const w of writes) {
			expect(Number.isInteger(w.weight)).toBe(true);
			expect(w.weight).toBeGreaterThanOrEqual(1);
			expect(w.weight).toBeLessThanOrEqual(MAX_WEIGHT);
		}
	});

	it("gives an unreachable node the pool's max weight", async () => {
		const { client, writes } = makeClient();
		await runCycle({
			client,
			config: config({ LB_SUBDOMAINS: "pronode" }),
			logger,
			// node id 3 (10.0.0.3) and the AAAA pool are unreachable
			fetchMetric: metricFetcher({
				"10.0.0.1": 0.2,
				"10.0.0.2": 0.8,
			}),
		});
		const aPoolWrites = writes.filter((w) => [1, 2, 3].includes(w.recordId));
		const maxWeight = Math.max(...aPoolWrites.map((w) => w.weight));
		expect(writes.find((w) => w.recordId === 3)?.weight).toBe(maxWeight);
	});

	it("uses equal weighting when a whole pool is unreachable", async () => {
		const { client, writes } = makeClient();
		await runCycle({
			client,
			config: config({ LB_SUBDOMAINS: "pronode" }),
			logger,
			// only the AAAA pool is reachable; the A pool is fully unreachable
			fetchMetric: metricFetcher({
				"2001:db8::1": 0.2,
				"2001:db8::2": 0.8,
			}),
		});
		const aPoolWrites = writes.filter((w) => [1, 2, 3].includes(w.recordId));
		expect(aPoolWrites.map((w) => w.weight)).toEqual([100, 100, 100]);
	});

	it("writes nothing in dry-run mode", async () => {
		const { client, writes } = makeClient();
		await runCycle({
			client,
			config: config({ LB_DRY_RUN: "true" }),
			logger,
			fetchMetric: metricFetcher({ "10.0.0.1": 0.1, "10.0.0.2": 0.9 }),
		});
		expect(writes).toEqual([]);
	});

	it("loops until aborted, running at least one cycle", async () => {
		const { client, listCalls } = makeClient();
		const controller = new AbortController();
		const loop = startBalancerLoop(
			{
				client,
				config: config(),
				logger,
				fetchMetric: metricFetcher({ "10.0.0.1": 0.1 }),
			},
			controller.signal,
		);
		// let the first cycle complete, then stop the loop
		await vi.waitFor(() => expect(listCalls()).toBeGreaterThanOrEqual(1));
		controller.abort();
		await loop;
		expect(listCalls()).toBeGreaterThanOrEqual(1);
	});
});
