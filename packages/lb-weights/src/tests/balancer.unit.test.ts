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
import { LogLevel, getLogger } from "@prosopo/logger";
import { type MockInstance, describe, expect, it, vi } from "vitest";
import { runCycle } from "../balancer.js";
import { BunnyDnsClient } from "../bunny.js";
import { type Config, loadConfig } from "../config.js";
import type { MetricsFetchOptions } from "../metrics.js";
import {
	type BunnyRecord,
	BunnyRecordType,
	type BunnyZone,
	SmartRoutingType,
	type WeightUpdate,
} from "../types.js";

const logger = getLogger(LogLevel.enum.error, "test");

const member = (Id: number, Value: string, Weight: number): BunnyRecord => ({
	Id,
	Name: "pronode",
	Type: BunnyRecordType.A,
	Value,
	Weight,
	Ttl: 15,
	SmartRoutingType: SmartRoutingType.Latency,
});

const zone = (members: BunnyRecord[]): BunnyZone => ({
	Id: 42,
	Domain: "prosopo.io",
	Records: members,
});

// A client whose listZones returns the given zone and whose setWeights is a spy.
function makeClient(zoneValue: BunnyZone): {
	client: BunnyDnsClient;
	setWeights: MockInstance<BunnyDnsClient["setWeights"]>;
} {
	const fetchFn = vi.fn<typeof fetch>(
		async () => new Response(JSON.stringify({ Items: [zoneValue] }), { status: 200 }),
	);
	const client = new BunnyDnsClient({
		accessKey: "token",
		logger,
		fetchFn,
	});
	const setWeights = vi
		.spyOn(client, "setWeights")
		.mockResolvedValue(undefined);
	return { client, setWeights };
}

function config(overrides: Partial<NodeJS.ProcessEnv> = {}): Config {
	return loadConfig({
		BUNNY_API_KEY: "token",
		LB_SUBDOMAINS: "pronode",
		LB_DRY_RUN: "false",
		...overrides,
	});
}

// Fixed metric map keyed by IP; missing keys simulate an unreachable endpoint.
function metricFetcher(
	values: Record<string, number>,
): (
	ip: string,
	metricName: string,
	options: MetricsFetchOptions,
) => Promise<number | null> {
	return async (ip) => (ip in values ? values[ip] ?? null : null);
}

const weightFor = (
	updates: readonly WeightUpdate[],
	recordId: number,
): number | undefined =>
	updates.find((u) => u.recordId === recordId)?.weight;

describe("runCycle", () => {
	it("gives the lowest-metric node the highest weight and applies it", async () => {
		const { client, setWeights } = makeClient(
			zone([member(1, "10.0.0.1", 50), member(2, "10.0.0.2", 50)]),
		);
		await runCycle({
			client,
			config: config(),
			logger,
			fetchMetric: metricFetcher({ "10.0.0.1": 0.2, "10.0.0.2": 0.8 }),
		});
		expect(setWeights).toHaveBeenCalledTimes(1);
		const [, updates] = setWeights.mock.calls[0] ?? [];
		expect(weightFor(updates ?? [], 1)).toBeGreaterThan(
			weightFor(updates ?? [], 2) ?? 0,
		);
	});

	it("defaults an unreachable node to the pool's max weight", async () => {
		const { client, setWeights } = makeClient(
			zone([
				member(1, "10.0.0.1", 50),
				member(2, "10.0.0.2", 50),
				member(3, "10.0.0.3", 50),
			]),
		);
		await runCycle({
			client,
			config: config(),
			logger,
			// node 3 has no metrics
			fetchMetric: metricFetcher({ "10.0.0.1": 0.2, "10.0.0.2": 0.8 }),
		});
		const [, updates] = setWeights.mock.calls[0] ?? [];
		const applied = updates ?? [];
		const maxWeight = Math.max(...applied.map((u) => u.weight));
		expect(weightFor(applied, 3)).toBe(maxWeight);
	});

	it("uses equal weighting when all nodes are unreachable", async () => {
		const { client, setWeights } = makeClient(
			zone([member(1, "10.0.0.1", 50), member(2, "10.0.0.2", 50)]),
		);
		await runCycle({
			client,
			config: config(),
			logger,
			fetchMetric: metricFetcher({}),
		});
		const [, updates] = setWeights.mock.calls[0] ?? [];
		const applied = updates ?? [];
		expect(applied.map((u) => u.weight)).toEqual([100, 100]);
	});

	it("does not apply weights in dry-run mode", async () => {
		const { client, setWeights } = makeClient(
			zone([member(1, "10.0.0.1", 50), member(2, "10.0.0.2", 50)]),
		);
		await runCycle({
			client,
			config: config({ LB_DRY_RUN: "true" }),
			logger,
			fetchMetric: metricFetcher({ "10.0.0.1": 0.2, "10.0.0.2": 0.8 }),
		});
		expect(setWeights).not.toHaveBeenCalled();
	});
});
