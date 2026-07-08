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
import type { BunnyDnsClient } from "./bunny.js";
import type { Config } from "./config.js";
import {
	type MetricsFetchOptions,
	fetchNodeMetric,
} from "./metrics.js";
import { findLoadBalancerPools } from "./pools.js";
import type { BunnyRecord, WeightUpdate } from "./types.js";
import {
	DEFAULT_WEIGHT,
	changedUpdates,
	equalWeights,
	inverseWeights,
} from "./weights.js";

type MetricFetcher = (
	ip: string,
	metricName: string,
	options: MetricsFetchOptions,
) => Promise<number | null>;

export interface BalancerDeps {
	client: BunnyDnsClient;
	config: Config;
	logger: Logger;
	// injectable for testing; defaults to a real Prometheus HTTP fetch
	fetchMetric?: MetricFetcher;
}

// A member paired with the metric value we successfully read for it.
interface MeasuredMember {
	record: BunnyRecord;
	metric: number;
}

function metricsOptions(config: Config): MetricsFetchOptions {
	return {
		scheme: config.LB_METRICS_SCHEME,
		port: config.LB_METRICS_PORT,
		path: config.LB_METRICS_PATH,
	};
}

/**
 * Run a single balancing cycle: read zones, find managed load-balancer pools,
 * scrape each node's metric, compute inverse weights and (unless dry-run) push
 * them to Bunny. Logs structured records throughout.
 */
export async function runCycle(deps: BalancerDeps): Promise<void> {
	const { client, config, logger } = deps;
	const fetchMetric = deps.fetchMetric ?? fetchNodeMetric;
	const options = metricsOptions(config);

	const zones = await client.listZones();
	const pools = findLoadBalancerPools(zones, config.LB_SUBDOMAINS);

	logger.info(() => ({
		msg: "Starting balancing cycle",
		data: {
			dryRun: config.LB_DRY_RUN,
			metric: config.LB_METRIC_NAME,
			subdomains: config.LB_SUBDOMAINS,
			poolsFound: pools.length,
		},
	}));

	for (const pool of pools) {
		const measured: MeasuredMember[] = [];
		const unreachable: BunnyRecord[] = [];
		for (const record of pool.members) {
			const metric = await fetchMetric(
				record.Value,
				config.LB_METRIC_NAME,
				options,
			);
			if (metric === null) {
				unreachable.push(record);
				continue;
			}
			measured.push({ record, metric });
		}

		// Build the weight map. Fallback rules:
		//  - a node with no reachable /metrics gets the pool's max weight, so an
		//    unmonitored node still receives (the most) traffic rather than none;
		//  - if EVERY node is unreachable, fall back to equal weighting.
		const weightByRecordId = new Map<number, number>();
		let mode: "metrics" | "all-unreachable-equal";
		if (measured.length === 0) {
			mode = "all-unreachable-equal";
			for (const update of equalWeights(pool.members, DEFAULT_WEIGHT)) {
				weightByRecordId.set(update.recordId, update.weight);
			}
			logger.warn(() => ({
				msg: "All nodes unreachable, using equal weighting",
				data: {
					domain: pool.domain,
					subdomain: pool.name,
					weight: DEFAULT_WEIGHT,
				},
			}));
		} else {
			mode = "metrics";
			const weights = inverseWeights(measured.map((m) => m.metric));
			measured.forEach((m, index) => {
				// index is always in range: one weight per measured member
				weightByRecordId.set(m.record.Id, weights[index] ?? 1);
			});
			const maxWeight = Math.max(...weights);
			for (const record of unreachable) {
				weightByRecordId.set(record.Id, maxWeight);
			}
		}

		const updates: WeightUpdate[] = pool.members.map((record) => ({
			recordId: record.Id,
			weight: weightByRecordId.get(record.Id) ?? DEFAULT_WEIGHT,
		}));
		const toApply = changedUpdates(pool.members, updates);
		const metricByRecordId = new Map<number, number>(
			measured.map((m) => [m.record.Id, m.metric]),
		);

		logger.info(() => ({
			msg: "Computed weights for pool",
			data: {
				domain: pool.domain,
				subdomain: pool.name,
				type: pool.type,
				dryRun: config.LB_DRY_RUN,
				mode,
				unreachable: unreachable.length,
				nodes: pool.members.map((record) => ({
					ip: record.Value,
					recordId: record.Id,
					metric: metricByRecordId.get(record.Id) ?? null,
					reachable: metricByRecordId.has(record.Id),
					currentWeight: record.Weight,
					newWeight: weightByRecordId.get(record.Id),
				})),
				changed: toApply.length,
			},
		}));

		if (config.LB_DRY_RUN) {
			logger.info(() => ({
				msg: "Dry run: not applying weights",
				data: { domain: pool.domain, subdomain: pool.name },
			}));
			continue;
		}

		if (toApply.length === 0) {
			continue;
		}
		await client.setWeights(pool.zoneId, toApply);
		logger.info(() => ({
			msg: "Applied weights",
			data: {
				domain: pool.domain,
				subdomain: pool.name,
				applied: toApply.length,
			},
		}));
	}
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
	new Promise((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});

/**
 * Run balancing cycles forever at the configured interval. A cycle that throws
 * is logged and the loop continues. Pass an AbortSignal to stop the loop.
 */
export async function startBalancerLoop(
	deps: BalancerDeps,
	signal?: AbortSignal,
): Promise<void> {
	const intervalMs = deps.config.LB_INTERVAL_SECONDS * 1000;
	while (!signal?.aborted) {
		try {
			await runCycle(deps);
		} catch (error) {
			deps.logger.error(() => ({
				msg: "Balancing cycle failed",
				data: { error: error instanceof Error ? error.message : error },
			}));
		}
		if (signal?.aborted) {
			break;
		}
		await sleep(intervalMs, signal);
	}
}
