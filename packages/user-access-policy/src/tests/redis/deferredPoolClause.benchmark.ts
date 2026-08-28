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

// Standalone benchmark for the hard-block candidate-pool clauses.
//
// Compares the previous single-field clause against the two new
// two-field clauses on the shapes they actually run in:
//
//   baseline   @type:{block}                                (old, both callers)
//   middleware @type:{block} -@deferToVerify:{true}         (new, request time)
//   verify     (@type:{block} | @deferToVerify:{true})      (new, verify)
//
// Also runs the MISGROUPED union as a control. `|` binds looser than the
// implicit AND, so `(@a)|(@b) scope ip` lets the left operand escape the
// scope/IP filters — it matches every Block rule in the index. That
// misgrouping is both wrong and ~7x slower, and it is invisible on a
// toy dataset; it only shows up at population scale, which is why this
// benchmark exists.
//
// Population mirrors redisRulesReaderLoad.benchmark.integration.test.ts
// (the 17k bulk-ban incident shape) plus a deferred-rule cohort.
//
// Run: npx tsx <this file>   (needs redis-stack on localhost:6379)

import { createClient } from "redis";

const IP_RULE_COUNT = 17_000;
const CIDR_RULE_COUNT = 1_300;
const MIXED_RULE_COUNT = 1_000;
// Deferred rules as a share of the population. Production currently has
// ~380 deferred against ~4k live rules; 2_000 here is a deliberate
// over-weight so the union has real work to merge.
const DEFERRED_RULE_COUNT = 2_000;

const WARMUP = 50;
const ITERATIONS = 500;

const INDEX = "bench:idx";
const PREFIX = "bench:";

type Clause = { name: string; clause: string };

const CLAUSES: Clause[] = [
	{ name: "baseline   @type:{block}", clause: "@type:{block}" },
	{
		name: "middleware @type:{block} -@deferToVerify:{true}",
		clause: "@type:{block} -@deferToVerify:{true}",
	},
	{
		name: "verify  (@type:{block} | @deferToVerify:{true})",
		clause: "(@type:{block} | @deferToVerify:{true})",
	},
	{
		name: "MISGROUPED (@type:{block})|(@deferToVerify:{true})",
		clause: "(@type:{block})|(@deferToVerify:{true})",
	},
];

const ipv4 = (i: number): bigint => (10n << 24n) + BigInt(i);

const ipv4CidrRange = (i: number): { min: bigint; max: bigint } => {
	const octet = i % 256;
	const base = (192n << 24n) + (168n << 16n) + (BigInt(octet) << 8n);
	return { min: base, max: base + 255n };
};

const percentile = (sorted: number[], p: number): number => {
	const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
	return sorted[idx] ?? 0;
};

const main = async (): Promise<void> => {
	const client = createClient({
		url: "redis://localhost:6379",
		password: "root",
	});
	await client.connect();

	await client.flushAll();

	// Real index schema shape: type + deferToVerify as TAG INDEXMISSING,
	// IP fields NUMERIC INDEXMISSING.
	await client.sendCommand([
		"FT.CREATE",
		INDEX,
		"ON",
		"HASH",
		"PREFIX",
		"1",
		PREFIX,
		"SCHEMA",
		"type",
		"TAG",
		"INDEXMISSING",
		"deferToVerify",
		"TAG",
		"INDEXMISSING",
		"clientId",
		"TAG",
		"INDEXMISSING",
		"numericIp",
		"NUMERIC",
		"INDEXMISSING",
		"numericIpMaskMin",
		"NUMERIC",
		"INDEXMISSING",
		"numericIpMaskMax",
		"NUMERIC",
		"INDEXMISSING",
	]);

	let n = 0;
	const write = async (fields: Record<string, string>): Promise<void> => {
		await client.hSet(`${PREFIX}${n++}`, fields);
	};

	for (let i = 0; i < IP_RULE_COUNT; i++) {
		await write({
			type: "block",
			description: `bulk-ban-ip-${i}`,
			numericIp: ipv4(i).toString(),
			clientId: "global",
		});
	}
	for (let i = 0; i < CIDR_RULE_COUNT; i++) {
		const { min, max } = ipv4CidrRange(i);
		await write({
			type: "block",
			description: `bulk-ban-cidr-${i}`,
			numericIpMaskMin: min.toString(),
			numericIpMaskMax: max.toString(),
			clientId: "global",
		});
	}
	for (let i = 0; i < MIXED_RULE_COUNT; i++) {
		await write({
			type: i % 2 === 0 ? "restrict" : "block",
			description: `mixed-${i}`,
			numericIp: ipv4(IP_RULE_COUNT + i).toString(),
			clientId: `client-${i % 20}`,
		});
	}
	// Deferred cohort — the shape this change is about. Restrict, so the
	// baseline clause would miss them entirely.
	for (let i = 0; i < DEFERRED_RULE_COUNT; i++) {
		await write({
			type: "restrict",
			description: `deferred-${i}`,
			deferToVerify: "true",
			numericIp: ipv4(IP_RULE_COUNT + MIXED_RULE_COUNT + i).toString(),
			clientId: `client-${i % 20}`,
		});
	}

	const total = n;
	// Let RediSearch finish indexing.
	for (;;) {
		const info = (await client.sendCommand([
			"FT.INFO",
			INDEX,
		])) as unknown[];
		const idx = info.findIndex((v) => String(v) === "indexing");
		if (idx === -1 || String(info[idx + 1]) === "0") break;
		await new Promise((r) => setTimeout(r, 200));
	}

	console.log(`population: ${total} rules`);
	console.log(
		`  ${IP_RULE_COUNT} ip-block, ${CIDR_RULE_COUNT} cidr-block, ${MIXED_RULE_COUNT} mixed, ${DEFERRED_RULE_COUNT} deferred-restrict\n`,
	);

	// The two probe shapes that dominate the split query: an exact-IP hit
	// (the common ban case) and the CIDR mask-range probe (the expensive
	// one — it walks two numeric ranges).
	const hitIp = ipv4(1234).toString();
	const cidrIp = ((192n << 24n) + (168n << 16n) + (7n << 8n) + 9n).toString();
	const scope = "( @clientId:{client-3} | @clientId:{global} )";

	const probes: Array<{ label: string; suffix: string }> = [
		{ label: "ip:exact", suffix: `${scope} @numericIp:[${hitIp} ${hitIp}]` },
		{
			label: "ip:mask ",
			suffix: `${scope} @numericIpMaskMin:[-inf ${cidrIp}] @numericIpMaskMax:[${cidrIp} +inf]`,
		},
	];

	for (const probe of probes) {
		console.log(`--- probe: ${probe.label} ---`);
		for (const { name, clause } of CLAUSES) {
			const query = `${clause} ${probe.suffix}`;

			for (let i = 0; i < WARMUP; i++) {
				await client.sendCommand([
					"FT.SEARCH",
					INDEX,
					query,
					"NOCONTENT",
					"DIALECT",
					"2",
				]);
			}

			const samples: number[] = [];
			let hits = 0;
			for (let i = 0; i < ITERATIONS; i++) {
				const t0 = process.hrtime.bigint();
				const res = (await client.sendCommand([
					"FT.SEARCH",
					INDEX,
					query,
					"NOCONTENT",
					"DIALECT",
					"2",
				])) as unknown[];
				const t1 = process.hrtime.bigint();
				samples.push(Number(t1 - t0) / 1e6);
				hits = Number(res[0]);
			}
			samples.sort((a, b) => a - b);
			const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
			console.log(
				`  ${name.padEnd(52)} hits=${String(hits).padStart(5)}  ` +
					`mean=${mean.toFixed(3)}ms  p50=${percentile(samples, 50).toFixed(3)}ms  ` +
					`p95=${percentile(samples, 95).toFixed(3)}ms  p99=${percentile(samples, 99).toFixed(3)}ms`,
			);
		}
		console.log();
	}

	await client.sendCommand(["FT.DROPINDEX", INDEX]);
	await client.flushAll();
	await client.quit();
};

main().catch((e: unknown) => {
	console.error(e);
	process.exit(1);
});
