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

// Benchmarks the provider's PoW verify route, the call siteverify makes.
// Needs the provider built (packages/cli/dist) and docker; from the repo root:
//
//   pnpm bench:verify                          one run, checked against budget.json
//   pnpm bench:verify --label main             save a run under a name...
//   pnpm bench:verify --baseline main          ...and compare a later run with it
//   pnpm bench:verify --watch                  rebuild and rerun on every source change
//   pnpm bench:verify --latency-on mongo       add latency to one store only

import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	watch,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultConfig } from "@prosopo/cli";
import { ProviderEnvironment } from "@prosopo/env";
import { getPair } from "@prosopo/keyring";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { IpapiStub } from "./ipapiStub.js";
import { BENCH_DATABASE, BenchProvider, benchEnv } from "./provider.js";
import { type ScenarioResult, checkSingleUse, runScenario } from "./run.js";
import { SCENARIOS } from "./scenarios.js";
import {
	BENCH_PORTS,
	PROXY_NAMES,
	type ProxyName,
	composeUp,
	flushBenchData,
	resetProxies,
} from "./stack.js";

const benchDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(benchDir, "..", "..", "..", "..", "..");
const resultsDir = path.join(repoRoot, "dev", "scripts", "bench-results");
const budgetFile = path.join(benchDir, "budget.json");

// Packages whose source sits on the verify path; a change to any of them
// triggers a rebuild and rerun in --watch mode.
const WATCHED_PACKAGES = [
	"provider",
	"database",
	"ipinfo",
	"user-access-policy",
	"types",
	"types-database",
];

type Budget = Record<
	string,
	{ roundTrips: number; mongo: number; redis: number; ipapi: number }
>;

type BenchReport = {
	label: string;
	createdAt: string;
	gitHead: string;
	results: ScenarioResult[];
};

const ROUND_TRIP_TOLERANCE = 0.5;
const OPS_TOLERANCE = 0.05;

const gitHead = (): string => {
	try {
		return execFileSync("git", ["-C", repoRoot, "rev-parse", "--short", "HEAD"])
			.toString()
			.trim();
	} catch {
		return "unknown";
	}
};

const seedingEnvironment = async (): Promise<ProviderEnvironment> => {
	Object.assign(process.env, benchEnv(repoRoot, "direct"));
	const config = defaultConfig();
	const env = new ProviderEnvironment(
		config,
		getPair(config.account.secret),
		getPair(config.authAccount.secret),
	);
	await env.isReady();
	return env;
};

const formatTable = (
	results: ScenarioResult[],
	baseline: BenchReport | undefined,
): string => {
	const delta = (value: number, before: number | undefined): string =>
		before === undefined || Number.isNaN(before)
			? ""
			: ` (${value - before >= 0 ? "+" : ""}${(value - before).toFixed(1)})`;
	const rows = results.map((result) => {
		const before = baseline?.results.find(
			(r) => r.scenario === result.scenario,
		);
		const latencies = Object.entries(result.latencyByInjectedMs)
			.map(([injected, latency]) => {
				const beforeP50 = before?.latencyByInjectedMs[injected]?.p50;
				return `+${injected}ms p50 ${latency.p50.toFixed(1)}${delta(latency.p50, beforeP50)} p95 ${latency.p95.toFixed(1)}`;
			})
			.join(" | ");
		return [
			result.scenario.padEnd(20),
			`round trips ${result.roundTrips}${delta(result.roundTrips, before?.roundTrips)}`.padEnd(
				26,
			),
			`mongo ${result.ops.mongo}${delta(result.ops.mongo, before?.ops.mongo)}`.padEnd(
				18,
			),
			`redis ${result.ops.redis}${delta(result.ops.redis, before?.ops.redis)}`.padEnd(
				18,
			),
			`ipapi ${result.ops.ipapi}${delta(result.ops.ipapi, before?.ops.ipapi)}`.padEnd(
				18,
			),
			latencies,
		].join(" ");
	});
	const detail = results.map(
		(result) =>
			`  ${result.scenario}: mongo ${JSON.stringify(result.ops.mongoByCollection)} redis ${JSON.stringify(result.ops.redisByCommand)}`,
	);
	return [...rows, "", "per verify:", ...detail].join("\n");
};

const checkBudget = (results: ScenarioResult[]): string[] => {
	if (!existsSync(budgetFile)) return [];
	const budget = JSON.parse(readFileSync(budgetFile, "utf8")) as Budget;
	const failures: string[] = [];
	for (const result of results) {
		const limit = budget[result.scenario];
		if (!limit) continue;
		const over = (
			name: string,
			value: number,
			max: number,
			tolerance: number,
		) => {
			if (value > max + tolerance) {
				failures.push(`${result.scenario}: ${name} ${value} > budget ${max}`);
			} else if (value < max - tolerance - 0.5) {
				console.log(
					`  ${result.scenario}: ${name} ${value} is well under budget ${max}; lower it in budget.json`,
				);
			}
		};
		over(
			"round trips",
			result.roundTrips,
			limit.roundTrips,
			ROUND_TRIP_TOLERANCE,
		);
		over("mongo ops", result.ops.mongo, limit.mongo, OPS_TOLERANCE);
		over("redis ops", result.ops.redis, limit.redis, OPS_TOLERANCE);
		over("ipapi lookups", result.ops.ipapi, limit.ipapi, OPS_TOLERANCE);
	}
	return failures;
};

type BenchOptions = {
	samples: number;
	latencies: number[];
	latencyTargets: ProxyName[];
	scenarios: string[];
	label: string;
	baseline?: string;
};

const runBench = async (options: BenchOptions): Promise<boolean> => {
	mkdirSync(resultsDir, { recursive: true });
	flushBenchData(BENCH_DATABASE);
	await resetProxies();

	const ipapi = new IpapiStub(BENCH_PORTS.ipapiStub);
	await ipapi.start();
	const provider = new BenchProvider(
		repoRoot,
		path.join(resultsDir, "provider.log"),
	);
	const env = await seedingEnvironment();

	try {
		await provider.start();
		await checkSingleUse(env, provider.url, 20);
		console.log(
			"single-use check passed: 1 of 20 concurrent verifies of one token",
		);

		const results: ScenarioResult[] = [];
		for (const scenario of SCENARIOS) {
			if (
				options.scenarios.length &&
				!options.scenarios.includes(scenario.name)
			) {
				continue;
			}
			console.log(`running ${scenario.name}: ${scenario.description}`);
			results.push(
				await runScenario(
					env,
					provider.url,
					ipapi,
					scenario,
					options.samples,
					options.latencies,
					options.latencyTargets,
				),
			);
		}

		const baselineFile = options.baseline
			? path.join(resultsDir, `${options.baseline}.json`)
			: undefined;
		const baseline =
			baselineFile && existsSync(baselineFile)
				? (JSON.parse(readFileSync(baselineFile, "utf8")) as BenchReport)
				: undefined;
		const report: BenchReport = {
			label: options.label,
			createdAt: new Date().toISOString(),
			gitHead: gitHead(),
			results,
		};
		writeFileSync(
			path.join(resultsDir, `${options.label}.json`),
			`${JSON.stringify(report, null, 2)}\n`,
		);

		console.log(
			`\n${options.label} @ ${report.gitHead}${baseline ? ` vs ${baseline.label} @ ${baseline.gitHead}` : ""}`,
		);
		console.log(formatTable(results, baseline));
		const failures = checkBudget(results);
		for (const failure of failures) console.error(`OVER BUDGET ${failure}`);
		return failures.length === 0;
	} finally {
		await provider.stop();
		await ipapi.stop();
		await env.getDb().close();
	}
};

const rebuild = (packages: Set<string>): void => {
	for (const name of packages) {
		console.log(`rebuilding @prosopo/${name}`);
		execFileSync("pnpm", ["--filter", `@prosopo/${name}`, "run", "build"], {
			cwd: repoRoot,
			stdio: "inherit",
			env: { ...process.env, NODE_ENV: "test" },
		});
	}
};

const watchAndRerun = (options: BenchOptions): void => {
	let pending = new Set<string>();
	let timer: NodeJS.Timeout | undefined;
	let running = false;
	const trigger = async (): Promise<void> => {
		if (running || pending.size === 0) return;
		running = true;
		const packages = pending;
		pending = new Set();
		try {
			rebuild(packages);
			await runBench(options);
		} catch (error) {
			console.error(error);
		} finally {
			running = false;
			console.log("\nwatching for changes...");
			void trigger();
		}
	};
	for (const name of WATCHED_PACKAGES) {
		watch(
			path.join(repoRoot, "packages", name, "src"),
			{ recursive: true },
			(_event, file) => {
				if (!file || file.includes(".test.")) return;
				pending.add(name);
				clearTimeout(timer);
				timer = setTimeout(() => void trigger(), 500);
			},
		);
	}
	console.log("\nwatching for changes...");
};

const main = async (): Promise<void> => {
	const argv = await yargs(hideBin(process.argv))
		.option("samples", { type: "number", default: 200 })
		.option("latencies", {
			type: "string",
			default: "0,5",
			describe:
				"comma-separated ms added to every Mongo, Redis and ipapi round trip",
		})
		.option("latency-on", {
			type: "array",
			choices: PROXY_NAMES,
			default: [...PROXY_NAMES],
			describe:
				"stores that get the added latency, to see which one a path waits on",
		})
		.option("scenario", { type: "array", string: true, default: [] })
		.option("label", { type: "string", default: "latest" })
		.option("baseline", {
			type: "string",
			describe: "label of an earlier run to compare against",
		})
		.option("watch", { type: "boolean", default: false })
		.option("compose", {
			type: "boolean",
			default: true,
			describe: "start docker/docker-compose.bench.yml first",
		})
		.strict()
		.parse();

	if (argv.compose) composeUp(repoRoot);
	const options: BenchOptions = {
		samples: argv.samples,
		latencies: argv.latencies.split(",").map(Number),
		latencyTargets: argv.latencyOn,
		scenarios: argv.scenario,
		label: argv.label,
		baseline: argv.baseline,
	};
	const withinBudget = await runBench(options);
	if (argv.watch) {
		watchAndRerun(options);
		return;
	}
	process.exit(withinBudget ? 0 : 1);
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
