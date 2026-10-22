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

// Records the user-access-policy package's behaviour into vectors.json, which
// equivalence.rs replays against the Rust. Inputs are fixed or drawn from a seeded
// generator. The `redis` section is recorded against a live Redis Stack at
// redis://localhost:6379 (password root): the raw hashes the TS writer stores, and what
// the TS reader returns for them.
//
// JSON cannot carry a bigint, NaN or an infinity, so they are written as
// {"$bigint": "123"} and {"$number": "Infinity"}.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getLogger } from "@prosopo/logger";
import { connectToRedis, setupRedisIndex } from "@prosopo/redis-client";
import type { z } from "zod";
import {
	HEADER_OPERATORS,
	type HeaderOperator,
	accessRuleHeaderMatches,
	classifyBrowser,
	classifyOs,
	decodeHeaderValueList,
	describeMatchedRule,
	encodeHeaderValueList,
	evaluateHeaderCondition,
	getUserScopeRecordFromAccessRuleRecord,
	makeAccessRuleHash,
	transformAccessRuleIntoRecord,
	transformAccessRuleRecordIntoRule,
	userScopeRecordFields,
} from "../../src/.export.js";
import { DeleteRuleGroupsEndpoint } from "../../src/api/delete/deleteRuleGroups.js";
import { FetchRulesEndpoint } from "../../src/api/read/fetchRules.js";
import { FindRuleIdsEndpoint } from "../../src/api/read/findRuleIds.js";
import { GetMissingIdsEndpoint } from "../../src/api/read/getMissingIds.js";
import { getExpressApiRuleRateLimits } from "../../src/api/ruleApiRoutes.js";
import { InsertRulesEndpoint } from "../../src/api/write/insertRules.js";
import {
	getBlockPoolClause,
	getRulesRedisQuery,
} from "../../src/redis/reader/redisRulesQuery.js";
import { RedisRulesReader } from "../../src/redis/reader/redisRulesReader.js";
import { buildScopedRulesSubQueries } from "../../src/redis/reader/redisRulesSplitQuery.js";
import { accessRulesRedisIndex } from "../../src/redis/redisRuleIndex.js";
import {
	RedisRulesWriter,
	getRedisRuleValue,
} from "../../src/redis/redisRulesWriter.js";
import type { AccessRule, UserScope } from "../../src/rule.js";
import {
	accessPolicyInput,
	policyScopeExclusionsInput,
	policyScopeInput,
	sanitizeAccessPolicy,
} from "../../src/ruleInput/policyInput.js";
import {
	accessRuleInput,
	accessRulesFilterInput,
	getAccessRuleFiltersFromInput,
	ruleEntryInput,
} from "../../src/ruleInput/ruleInput.js";
import { userScopeInput } from "../../src/ruleInput/userScopeInput.js";
import {
	type AccessRuleEntry,
	type AccessRulesFilter,
	FilterScopeMatch,
} from "../../src/rulesStorage.js";
import { getCidrFromNumericIpRange } from "../../src/transformRule.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(
		`this generator must run on Node 24 (the production runtime), not ${process.version}`,
	);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

let prngState = 0x75617031;
const next = (): number => {
	prngState ^= prngState << 13;
	prngState ^= prngState >>> 17;
	prngState ^= prngState << 5;
	return (prngState >>> 0) / 0x1_0000_0000;
};
const int = (n: number): number => Math.floor(next() * n);
const pick = <T>(items: readonly T[]): T => {
	const item: T | undefined = items[int(items.length)];
	if (item === undefined) throw new Error("empty");
	return item;
};
const chance = (p: number): boolean => next() < p;

/** JSON with bigints, NaN and infinities spelled out (see the header comment). */
const encode = (value: unknown): Json => {
	if (typeof value === "bigint") return { $bigint: value.toString() };
	if (typeof value === "number" && !Number.isFinite(value))
		return { $number: String(value) };
	if (Array.isArray(value))
		return value.map(
			(item: unknown): Json => (item === undefined ? null : encode(item)),
		);
	if (value !== null && typeof value === "object") {
		const out: { [key: string]: Json } = {};
		for (const [key, item] of Object.entries(value)) {
			if (item !== undefined) out[key] = encode(item);
		}
		return out;
	}
	return value === undefined ? null : (value as Json);
};

/** The inverse of `encode`, for the inputs this generator builds. */
const decode = (value: Json): unknown => {
	if (Array.isArray(value)) return value.map(decode);
	if (value !== null && typeof value === "object") {
		if (typeof value.$bigint === "string") return BigInt(value.$bigint);
		if (typeof value.$number === "string") return Number(value.$number);
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, decode(item)]),
		);
	}
	return value;
};

const describeError = (e: unknown): Json => ({
	class: (e as Error).constructor?.name ?? "unknown",
	message: (e as Error).message,
});

type Outcome = { result: Json } | { error: Json } | { issues: Json };
const outcome = (fn: () => unknown): Outcome => {
	try {
		return { result: encode(fn()) };
	} catch (e) {
		return { error: describeError(e) };
	}
};
const parsed = (schema: z.ZodTypeAny, input: unknown): Outcome => {
	try {
		const result = schema.safeParse(input);
		return result.success
			? { result: encode(result.data) }
			: { issues: encode(result.error.issues) };
	} catch (e) {
		return { error: describeError(e) };
	}
};

// ---------------------------------------------------------------- value pools

const STRINGS: string[] = [
	"a",
	"abc",
	"",
	" ",
	"client-1",
	"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
	"t13d1516h2_8daaf6152771_02713d6af862",
	"GB",
	"windows",
	"chrome",
	'quo"te',
	"back\\slash",
	"new\nline",
	"tab\there",
	"\u0001ctl",
	"é",
	"\u{1f600}",
	" ",
	"[[1.5,2.5],[3.5,4.5]]",
	"{a:b}",
	"a,b",
	"x|y",
	"global",
	"1",
];
const NUMBERS: number[] = [
	0,
	-0,
	1,
	2,
	3,
	32,
	0.5,
	1.5,
	-3,
	1e21,
	1.5e-7,
	123456789,
	2 ** 53,
];
const BIGINTS: bigint[] = [
	0n,
	1n,
	3232235777n,
	(1n << 32n) - 1n,
	1n << 32n,
	42540766411282592856903984951653826560n,
	(1n << 128n) - 1n,
	-1n,
	1n << 130n,
];
const POLICY_TYPES: string[] = ["block", "restrict", "allow"];
const CAPTCHA_TYPES: string[] = [
	"image",
	"pow",
	"frictionless",
	"puzzle",
	"audio",
	"iconOrder",
	"authenticated",
];
const RESULT_REASONS: string[] = [
	"API.ACCESS_POLICY_BLOCK",
	"API.VPN_BLOCKED",
	"CAPTCHA.INVALID_TIMESTAMP",
];
const STRING_FIELDS: string[] = [
	"description",
	"clientId",
	"groupId",
	"userId",
	"ja4Hash",
	"headersHash",
	"userAgentHash",
	"headHash",
	"coords",
	"countryCode",
	"os",
	"browser",
	"headerMatch",
	"headerName",
	"headerValue",
	"headerOperator",
	"webBotAuthAgent",
];
const NUMBER_FIELDS: string[] = [
	"solvedImagesCount",
	"imageThreshold",
	"powDifficulty",
	"unsolvedImagesCount",
	"frictionlessScore",
	"asn",
];
const BIGINT_FIELDS: string[] = [
	"numericIp",
	"numericIpMaskMin",
	"numericIpMaskMax",
];

const shuffle = <T>(items: T[]): T[] => {
	const out: T[] = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j: number = int(i + 1);
		[out[i], out[j]] = [out[j] as T, out[i] as T];
	}
	return out;
};

/** A rule as code builds one: any subset of fields, in any order, with any value of its type. */
const randomRule = (): AccessRule => {
	const entries: [string, unknown][] = [["type", pick(POLICY_TYPES)]];
	if (chance(0.3)) entries.push(["captchaType", pick(CAPTCHA_TYPES)]);
	if (chance(0.2)) entries.push(["messageKey", pick(RESULT_REASONS)]);
	if (chance(0.3)) entries.push(["deferToVerify", chance(0.5)]);
	if (chance(0.2))
		entries.push(["excludedClientIds", pick([["c1"], ["c1", "c2"], []])]);
	for (const field of STRING_FIELDS)
		if (chance(0.15)) entries.push([field, pick(STRINGS)]);
	for (const field of NUMBER_FIELDS)
		if (chance(0.15)) entries.push([field, pick(NUMBERS)]);
	for (const field of BIGINT_FIELDS)
		if (chance(0.15)) entries.push([field, pick(BIGINTS)]);
	return Object.fromEntries(shuffle(entries)) as AccessRule;
};

// ---------------------------------------------------------------- hashing and records

const RULES: AccessRule[] = [
	{ type: "block" } as AccessRule,
	{ type: "block", clientId: "c" } as AccessRule,
	{ type: "block", clientId: "c", excludedClientIds: ["x"] } as AccessRule,
	{
		type: "restrict",
		captchaType: "image",
		solvedImagesCount: 3,
		numericIp: 3232235777n,
	} as AccessRule,
	{
		type: "restrict",
		numericIpMaskMin: 3232235776n,
		numericIpMaskMax: 3232236031n,
	} as AccessRule,
	{
		type: "restrict",
		numericIpMaskMin: 42540766411282592856903984951653826560n,
		numericIpMaskMax: 42540766490510755371168322545197776895n,
	} as AccessRule,
	{
		type: "block",
		numericIpMaskMin: 3232235777n,
		numericIpMaskMax: 3232235778n,
	} as AccessRule,
	{ type: "block", numericIpMaskMin: 5n, numericIpMaskMax: 4n } as AccessRule,
	{
		type: "block",
		numericIpMaskMin: 5n,
		numericIpMaskMax: 1n << 40n,
	} as AccessRule,
	{ type: "block", numericIp: -1n } as AccessRule,
	{ type: "block", numericIp: 1n << 130n } as AccessRule,
	{
		type: "block",
		userAgentHash: "abc",
		groupId: "g",
		coords: "[[1,2]]",
	} as AccessRule,
	{
		type: "allow",
		webBotAuthAgent: "https://signatures.openai.com",
		deferToVerify: false,
	} as AccessRule,
	...Array.from({ length: 600 }, randomRule),
];

// Rules holding a non-finite number, which JSON cannot carry: the Rust builds each from its
// field and value.
const infiniteRules: Json[] = [
	["solvedImagesCount", Number.POSITIVE_INFINITY],
	["frictionlessScore", Number.NEGATIVE_INFINITY],
	["asn", Number.POSITIVE_INFINITY],
	["powDifficulty", Number.NaN],
].map(([field, value]: (string | number)[]): Json => {
	const rule = {
		type: "restrict",
		[field as string]: value,
	} as unknown as AccessRule;
	return {
		field: field as string,
		value: String(value),
		hash: makeAccessRuleHash(rule),
		redisValue: encode(getRedisRuleValue(rule)),
		record: outcome(() => transformAccessRuleIntoRecord(rule)),
	};
});

const ruleHashes: Json[] = RULES.map(
	(rule: AccessRule): Json => ({
		rule: encode(rule),
		hash: makeAccessRuleHash(rule),
	}),
);
const ruleRecords: Json[] = RULES.map(
	(rule: AccessRule): Json => ({
		rule: encode(rule),
		record: outcome(() => transformAccessRuleIntoRecord(rule)),
	}),
);
const redisValues: Json[] = RULES.map(
	(rule: AccessRule): Json => ({
		rule: encode(rule),
		value: encode(getRedisRuleValue(rule)),
	}),
);
const matchedRules: Json[] = RULES.map(
	(rule: AccessRule): Json => ({
		rule: encode(rule),
		matched: encode(describeMatchedRule(rule)),
	}),
);
const userScopeRecords: Json[] = RULES.slice(0, 200).map(
	(rule: AccessRule): Json => {
		const record: Outcome = outcome(() => transformAccessRuleIntoRecord(rule));
		return {
			rule: encode(rule),
			scope:
				"result" in record
					? encode(
							getUserScopeRecordFromAccessRuleRecord(
								decode(record.result) as Parameters<
									typeof getUserScopeRecordFromAccessRuleRecord
								>[0],
							),
						)
					: null,
		};
	},
);

const IP_RANGES: [bigint, bigint][] = [
	[0n, 0n],
	[0n, (1n << 32n) - 1n],
	[3232235776n, 3232236031n],
	[3232235777n, 3232236031n],
	[3232235776n, 3232235776n],
	[10n, 200n],
	[(1n << 32n) - 2n, (1n << 32n) - 1n],
	[1n << 32n, (1n << 33n) - 1n],
	[
		42540766411282592856903984951653826560n,
		42540766490510755371168322545197776895n,
	],
	[
		42540766411282592856903984951653826561n,
		42540766411282592856903984951653826562n,
	],
	[(1n << 128n) - 1n, (1n << 128n) - 1n],
	[(1n << 128n) - 256n, (1n << 128n) - 1n],
	[5n, 4n],
	[5n, 1n << 40n],
	[-1n, 5n],
	...Array.from({ length: 80 }, (): [bigint, bigint] => {
		const v6: boolean = chance(0.4);
		const span: bigint = v6 ? 1n << 128n : 1n << 32n;
		const a: bigint =
			(BigInt(Math.floor(next() * 2 ** 31)) * (v6 ? 1n << 97n : 2n)) % span;
		const b: bigint = a + BigInt(int(5000));
		return [a, b < span ? b : span - 1n];
	}),
];
const cidrs: Json[] = IP_RANGES.map(
	([start, end]: [bigint, bigint]): Json => ({
		start: start.toString(),
		end: end.toString(),
		cidr: outcome(() => getCidrFromNumericIpRange(start, end) ?? null),
	}),
);

// ---------------------------------------------------------------- inputs

/** A rule as Redis hands it back: every value a string. */
const asRedisRecord = (rule: AccessRule): Record<string, string> =>
	getRedisRuleValue(rule);

const RECORD_INPUTS: unknown[] = [
	...RULES.slice(0, 300).map(asRedisRecord),
	{
		type: "block",
		ruleGroupId: "g",
		userAgent: "Mozilla/5.0",
		ip: "192.168.1.1",
		ipMask: "10.0.0.0/8",
	},
	{
		type: "restrict",
		ip: "2001:db8::1",
		ipMask: "2001:db8::/32",
		asn: "13335",
	},
	{ type: "restrict", ipMask: "192.168.1.7/24" },
	{ type: "block", ip: "not-an-ip" },
	{ type: "block", ipMask: "nonsense" },
	{ type: "block", groupId: "a", ruleGroupId: "b" },
	{ type: "block", groupId: 5 },
	{ type: "block", asn: "-1" },
	{ type: "block", asn: "1.5" },
	{ type: "block", asn: "" },
	{ type: "block", deferToVerify: "true" },
	{ type: "block", deferToVerify: "yes" },
	{ type: "block", deferToVerify: 1 },
	{ type: "block", clientId: "global" },
	{ type: "block", clientId: 7 },
	{ type: "block", excludedClientIds: "a,,b" },
	{ type: "block", excludedClientIds: "" },
	{ type: "block", excludedClientIds: [] },
	{ type: "block", excludedClientIds: ["a,b"] },
	{ type: "block", excludedClientIds: [""] },
	{ type: "block", numericIp: "1e3" },
	{ type: "block", numericIp: "0x10" },
	{ type: "block", numericIp: " 42 " },
	{ type: "block", numericIp: "5.59112965392e+37" },
	{ type: "block", numericIp: 1.5 },
	{ type: "block", numericIp: null },
	{ type: "block", webBotAuthAgent: "HTTPS://Signatures.OpenAI.com/" },
	{ type: "block", webBotAuthAgent: "https://x.example/path/" },
	{ type: "block", webBotAuthAgent: "not a url" },
	{ type: "block", captchaType: "frictionless" },
	{ type: "block", captchaType: "image", solvedImagesCount: "5" },
	{
		type: "restrict",
		solvedImagesCount: "Infinity",
		imageThreshold: "",
		powDifficulty: "abc",
	},
	{ type: "unknown" },
	{ messageKey: "CAPTCHA.ACCESS_POLICY_BLOCK" },
	{ type: "block", messageKey: "NOT.A.REASON" },
	{ type: "block", description: 12, userId: true, countryCode: null },
	{
		type: "block",
		headerMatch: "1",
		headerName: "X-Test",
		headerValue: '["a","b"]',
		headerOperator: "notEqualsAny",
	},
	{ type: "block", extra: "stripped" },
	null,
	[],
	"block",
];
const ruleInputs: Json[] = RECORD_INPUTS.map(
	(input: unknown): Json => ({
		input: encode(input),
		output: parsed(accessRuleInput, input),
	}),
);

const POLICY_INPUTS: unknown[] = [
	{ type: "block" },
	{ type: "block", captchaType: "image" },
	{ type: "block", solvedImagesCount: 3 },
	{ type: "block", captchaType: "pow", solvedImagesCount: 3 },
	{ type: "restrict", captchaType: "image", solvedImagesCount: 3 },
	{ type: "restrict", captchaType: "frictionless" },
	{ type: "restrict", deferToVerify: "false" },
	{ type: "allow", frictionlessScore: "0.5" },
	{ type: "nope" },
	{},
];
const policyInputs: Json[] = POLICY_INPUTS.map(
	(input: unknown): Json => ({
		input: encode(input),
		output: parsed(accessPolicyInput, input),
		sanitized: (() => {
			const result = accessPolicyInput.safeParse(input);
			return result.success ? encode(sanitizeAccessPolicy(result.data)) : null;
		})(),
	}),
);
const sanitizedPolicies: Json[] = [
	{
		type: "block",
		captchaType: "image",
		solvedImagesCount: 4,
		description: "d",
	},
	{ type: "restrict", captchaType: "image", solvedImagesCount: 4 },
	{ type: "allow", solvedImagesCount: 1 },
].map(
	(policy: Json): Json => ({
		policy,
		sanitized: encode(
			sanitizeAccessPolicy(
				decode(policy) as Parameters<typeof sanitizeAccessPolicy>[0],
			),
		),
	}),
);

const SCOPE_INPUTS: unknown[] = [
	{},
	{ userAgent: "Mozilla/5.0 (Windows NT 10.0)", ip: "1.2.3.4" },
	{ userAgent: "", userAgentHash: "kept?" },
	{ ip: "::ffff:1.2.3.4" },
	{ ip: "2001:db8::1", ipMask: "2001:db8::/32" },
	{ ipMask: "1.2.3.4/32" },
	{ ipMask: "1.2.3.4" },
	{ numericIp: "123", numericIpMaskMin: 5, numericIpMaskMax: "7" },
	{ asn: 3.5 },
	{ asn: "7" },
	{ os: 5, browser: null },
	{ ip: 5 },
	{ webBotAuthAgent: "https://A.example" },
];
const scopeInputs: Json[] = SCOPE_INPUTS.map(
	(input: unknown): Json => ({
		input: encode(input),
		output: parsed(userScopeInput, input),
	}),
);

const policyScopeInputs: Json[] = [
	{},
	{ clientId: "c" },
	{ clientId: "global" },
	{ clientId: 9 },
	{ clientId: null },
].map(
	(input: unknown): Json => ({
		input: encode(input),
		output: parsed(policyScopeInput, input),
	}),
);
const exclusionInputs: Json[] = [
	{},
	{ excludedClientIds: "a,b" },
	{ excludedClientIds: ",," },
	{ excludedClientIds: ["a"] },
	{ excludedClientIds: ["a", ""] },
	{ excludedClientIds: 5 },
].map(
	(input: unknown): Json => ({
		input: encode(input),
		output: parsed(policyScopeExclusionsInput, input),
	}),
);
const entryInputs: Json[] = [
	{ rule: { type: "block" } },
	{ rule: { type: "block" }, expiresUnixTimestamp: "1700000000" },
	{ rule: { type: "block" }, expiresUnixTimestamp: "soon" },
	{ rule: { type: "nope" } },
	{},
].map(
	(input: unknown): Json => ({
		input: encode(input),
		output: parsed(ruleEntryInput, input),
	}),
);

const FILTER_INPUTS: unknown[] = [
	{},
	{ policyScope: { clientId: "c" } },
	{
		policyScopes: [{ clientId: "a" }, { clientId: "b" }],
		policyScope: { clientId: "c" },
	},
	{
		policyScopeMatch: "greedy",
		userScopeMatch: "greedy",
		userScope: { ip: "1.2.3.4", ja4Hash: "j" },
	},
	{
		userScope: { userAgent: "UA" },
		groupId: "g",
		blockOnly: true,
		includeDeferred: false,
	},
	{ policyScopeMatch: "fuzzy" },
	{ blockOnly: "yes" },
];
const filterInputs: Json[] = FILTER_INPUTS.map((input: unknown): Json => {
	const output: Outcome = parsed(accessRulesFilterInput, input);
	const result = accessRulesFilterInput.safeParse(input);
	return {
		input: encode(input),
		output,
		filters: result.success
			? encode(getAccessRuleFiltersFromInput(result.data))
			: null,
	};
});

const logger = getLogger("fatal", "uap-equivalence");
const noWriter = {
	insertRules: async () => [],
	deleteRules: async () => {},
	deleteAllRules: async () => 0,
};
const noStorage = {
	...noWriter,
	fetchRules: async () => [],
	getMissingRuleIds: async () => [],
	findRules: async () => [],
	findRuleIds: async () => [],
	fetchAllRuleIds: async () => {},
};
const ENDPOINT_SCHEMAS: [string, z.ZodTypeAny][] = [
	[
		"insertRules",
		new InsertRulesEndpoint(noWriter, logger).getRequestArgsSchema(),
	],
	[
		"fetchRules",
		new FetchRulesEndpoint(noStorage, logger).getRequestArgsSchema(),
	],
	[
		"findRuleIds",
		new FindRuleIdsEndpoint(noStorage, logger).getRequestArgsSchema(),
	],
	[
		"getMissingIds",
		new GetMissingIdsEndpoint(noStorage, logger).getRequestArgsSchema(),
	],
	[
		"deleteRuleGroups",
		new DeleteRuleGroupsEndpoint(noStorage, logger).getRequestArgsSchema(),
	],
];
const ENDPOINT_INPUTS: unknown[] = [
	[],
	[{ accessPolicy: { type: "block" }, userScopes: [{ ip: "1.2.3.4" }] }],
	[{ accessPolicy: { type: "block", captchaType: "image" }, userScopes: [] }],
	[
		{
			accessPolicy: { type: "restrict", captchaType: "pow", powDifficulty: 5 },
			policyScopes: [{ clientId: "c" }],
			excludedClientIds: ["x"],
			groupId: "g",
			userScopes: [{ userAgent: "UA" }, { ja4Hash: "j" }],
			expiresUnixTimestamp: 1900000000,
		},
	],
	[
		{
			accessPolicy: { type: "block" },
			userScopes: [{}],
			expiresUnixTimestamp: "1900000000",
		},
	],
	{ ids: ["a", "b"] },
	{ ids: [1] },
	["a", "b"],
	[{ clientIds: ["c"], groupId: "g" }],
	[{ clientIds: "c", groupId: "g" }],
	[{ userScope: { ip: "1.2.3.4" } }],
	null,
];
const endpointInputs: Json[] = ENDPOINT_SCHEMAS.flatMap(
	([name, schema]: [string, z.ZodTypeAny]): Json[] =>
		ENDPOINT_INPUTS.map(
			(input: unknown): Json => ({
				endpoint: name,
				input: encode(input),
				output: parsed(schema, input),
			}),
		),
);

// ---------------------------------------------------------------- matching

const HEADER_VALUES: string[] = [
	"ios",
	"android",
	"",
	"a",
	'["ios","android"]',
	'  ["x"]',
	"[]",
	"[1]",
	"[bad",
	'{"a":1}',
	'["", "y"]',
];
const HEADER_BAGS: Record<string, string>[] = [
	{},
	{ "x-app": "ios" },
	{ "x-app": "android" },
	{ "x-app": "ios 17" },
	{ "x-app": "" },
	{ "X-App": "ios" },
	{ "x-app": "x" },
];
const headerConditions: Json[] = [];
for (const operator of HEADER_OPERATORS) {
	for (const value of HEADER_VALUES) {
		for (const headers of HEADER_BAGS) {
			for (const name of ["x-app", "X-APP"]) {
				headerConditions.push({
					name,
					operator,
					value,
					headers,
					result: evaluateHeaderCondition(
						name,
						operator as HeaderOperator,
						value,
						headers,
					),
				});
			}
		}
	}
}
const ruleHeaderMatches: Json[] = [
	{},
	{ headerName: "x-app" },
	{ headerName: "x-app", headerOperator: "equals" },
	{ headerName: "x-app", headerOperator: "equals", headerValue: "ios" },
	{ headerName: "x-app", headerOperator: "bogus", headerValue: "ios" },
	{ headerOperator: "equals", headerValue: "ios" },
].flatMap((rule: Record<string, string>): Json[] =>
	HEADER_BAGS.map(
		(headers: Record<string, string>): Json => ({
			rule,
			headers,
			result: accessRuleHeaderMatches(rule, headers),
		}),
	),
);
const headerLists: Json[] = HEADER_VALUES.map(
	(value: string): Json => ({
		value,
		decoded: encode(decodeHeaderValueList(value)),
	}),
);
const headerEncodings: Json[] = [[], ["a"], ["a", 'b"c'], ["é", " "]].map(
	(values: string[]): Json => ({
		values,
		encoded: encodeHeaderValueList(values),
	}),
);

const USER_AGENTS: (string | undefined)[] = [
	undefined,
	"",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.51",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/124.0 Mobile/15E148 Safari/605.1.15",
	"Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
	"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EdgA/124.0",
	"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 OPR/80.0",
	"Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.18",
	"Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0 Mobile Safari/537.36 MicroMessenger/8.0.47",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0",
	"Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
	"Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko",
	"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)",
	"Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"curl/8.4.0",
	"python-requests/2.31.0",
	"WINDOWS ANDROID",
	"xedg/1 medgx/ zedge/ edge/",
	"Mozilla/5.0 (Macintosh) Safari/ KHTML",
	"İOS iphone",
	"ǅ ANDROID",
	"K chrome/1",
	"aİchrome/",
	"MAC OS X",
	"Linux",
	"opr/ wechat",
];
const classifications: Json[] = USER_AGENTS.map(
	(userAgent: string | undefined): Json => ({
		userAgent: userAgent ?? null,
		os: classifyOs(userAgent),
		browser: classifyBrowser(userAgent),
	}),
);

// ---------------------------------------------------------------- queries

const randomScope = (): UserScope => {
	const scope: Record<string, unknown> = {};
	if (chance(0.4))
		scope.numericIp = pick(BIGINTS.filter((b: bigint): boolean => b >= 0n));
	if (chance(0.15)) scope.numericIpMaskMin = pick(BIGINTS.slice(0, 4));
	if (chance(0.15)) scope.numericIpMaskMax = pick(BIGINTS.slice(2, 7));
	for (const field of [
		"userId",
		"ja4Hash",
		"headersHash",
		"userAgentHash",
		"headHash",
		"coords",
		"countryCode",
	]) {
		if (chance(0.3)) scope[field] = pick(STRINGS.slice(0, 22));
	}
	if (chance(0.3)) scope.asn = pick([13335, 0, 7]);
	for (const field of [
		"os",
		"browser",
		"headerMatch",
		"headerName",
		"headerValue",
		"headerOperator",
		"webBotAuthAgent",
	]) {
		if (chance(0.3)) scope[field] = pick(STRINGS.slice(0, 10));
	}
	return scope as UserScope;
};
const randomFilter = (): AccessRulesFilter => {
	const filter: AccessRulesFilter = {};
	if (chance(0.6))
		filter.policyScope = chance(0.8)
			? { clientId: pick(["c", "client-1", "x y"]) }
			: {};
	if (chance(0.6))
		filter.policyScopeMatch = pick([
			FilterScopeMatch.Exact,
			FilterScopeMatch.Greedy,
		]);
	if (chance(0.7)) filter.userScope = randomScope();
	if (chance(0.6))
		filter.userScopeMatch = pick([
			FilterScopeMatch.Exact,
			FilterScopeMatch.Greedy,
		]);
	if (chance(0.3)) filter.groupId = pick(["g", ""]);
	if (chance(0.3)) filter.blockOnly = chance(0.7);
	if (chance(0.3)) filter.includeDeferred = chance(0.5);
	return filter;
};
const FILTERS: AccessRulesFilter[] = [
	{},
	{ policyScopeMatch: FilterScopeMatch.Exact },
	{ policyScope: {}, policyScopeMatch: FilterScopeMatch.Exact },
	{ userScope: {} },
	{ userScope: { numericIp: 5n }, userScopeMatch: FilterScopeMatch.Exact },
	{ userScope: { numericIpMaskMin: 5n } },
	{ userScope: { numericIpMaskMin: 5n, numericIpMaskMax: 9n } },
	{ userScope: { coords: "[[1,2],[3,4]]", asn: 5 } },
	...Array.from({ length: 300 }, randomFilter),
];
const queries: Json[] = FILTERS.flatMap((filter: AccessRulesFilter): Json[] =>
	[false, true].map(
		(matchingFieldsOnly: boolean): Json => ({
			filter: encode(filter),
			matchingFieldsOnly,
			query: getRulesRedisQuery(filter, matchingFieldsOnly),
		}),
	),
);
const blockPoolClauses: Json = {
	deferred: getBlockPoolClause(true),
	plain: getBlockPoolClause(false),
};
const subQueries: Json[] = FILTERS.slice(0, 200).flatMap(
	(filter: AccessRulesFilter): Json[] =>
		[
			{},
			{ blockOnly: true },
			{ blockOnly: true, includeDeferred: true },
			{ includeDeferred: true },
		].map(
			(options: { blockOnly?: boolean; includeDeferred?: boolean }): Json => ({
				userScope: encode(filter.userScope ?? {}),
				clientId: filter.policyScope?.clientId ?? null,
				options,
				subQueries: encode(
					buildScopedRulesSubQueries(
						filter.userScope ?? {},
						filter.policyScope?.clientId,
						options,
					),
				),
			}),
		),
);

// ---------------------------------------------------------------- rate limits

const RATE_LIMIT_ENVS: Record<string, string>[] = [
	{},
	{
		PROSOPO_USER_ACCESS_POLICY_RULE_FETCH_MANY_LIMIT: "50",
		PROSOPO_USER_ACCESS_POLICY_RULE_FETCH_MANY_WINDOW: "60000",
	},
	{
		PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_LIMIT: "0",
		PROSOPO_USER_ACCESS_POLICY_RULE_INSERT_MANY_LIMIT: "7.9",
	},
	{
		PROSOPO_USER_ACCESS_POLICY_RULE_REHASH_ALL_WINDOW: "abc",
		PROSOPO_USER_ACCESS_POLICY_RULE_FIND_IDS_LIMIT: " 12x",
	},
	{
		PROSOPO_USER_ACCESS_POLICY_RULE_GET_MISSING_IDS_LIMIT: "-3",
		PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_GROUPS_WINDOW: "",
	},
	{
		PROSOPO_USER_ACCESS_POLICY_RULE_FETCH_MANY_LIMIT: "0x10",
		PROSOPO_USER_ACCESS_POLICY_RULE_FETCH_MANY_WINDOW: " 0XfF",
		PROSOPO_USER_ACCESS_POLICY_RULE_DELETE_ALL_LIMIT: "0x",
	},
];
const rateLimits: Json[] = RATE_LIMIT_ENVS.map(
	(env: Record<string, string>): Json => {
		const saved: NodeJS.ProcessEnv = { ...process.env };
		for (const [key, value] of Object.entries(env)) process.env[key] = value;
		const limits = getExpressApiRuleRateLimits();
		process.env = saved;
		return { env, limits: encode(limits) };
	},
);

// ---------------------------------------------------------------- redis

const EXPIRES = 4102444800;
const CLIENT_A = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const CLIENT_B = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
const CLIENT_C = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const redisCorpus: AccessRuleEntry[] = [
	{ rule: { type: "block" } as AccessRule },
	{
		rule: { type: "block", clientId: CLIENT_A } as AccessRule,
		expiresUnixTimestamp: EXPIRES,
	},
	{
		rule: {
			type: "block",
			clientId: CLIENT_A,
			numericIp: 3232235777n,
		} as AccessRule,
	},
	{
		rule: {
			type: "restrict",
			captchaType: "image",
			solvedImagesCount: 4,
			numericIpMaskMin: 3232235776n,
			numericIpMaskMax: 3232236031n,
		} as AccessRule,
	},
	{
		rule: {
			type: "block",
			numericIp: 42540766411282592856903984951653826561n,
		} as AccessRule,
	},
	{
		rule: {
			type: "block",
			ja4Hash: "t13d1516h2",
			deferToVerify: true,
		} as AccessRule,
	},
	{
		rule: {
			type: "restrict",
			ja4Hash: "t13d1516h2",
			captchaType: "pow",
			powDifficulty: 5,
		} as AccessRule,
	},
	{
		rule: {
			type: "block",
			userAgentHash: "e3b0c442",
			groupId: "group1",
			clientId: CLIENT_B,
		} as AccessRule,
	},
	{ rule: { type: "block", coords: "[[1.5,2.5],[3,4]]" } as AccessRule },
	{
		rule: {
			type: "block",
			countryCode: "GB",
			asn: 13335,
			excludedClientIds: [CLIENT_A, CLIENT_C],
		} as AccessRule,
	},
	{
		rule: {
			type: "block",
			os: "linux",
			browser: "firefox",
			messageKey: "API.ACCESS_POLICY_BLOCK",
		} as AccessRule,
	},
	{
		rule: {
			type: "block",
			headerMatch: "1",
			headerName: "x-app",
			headerValue: '["ios","android"]',
			headerOperator: "notEqualsAny",
		} as AccessRule,
	},
	{
		rule: {
			type: "allow",
			webBotAuthAgent: "https://signatures.openai.com",
			description: "OpenAI",
		} as AccessRule,
	},
	{
		rule: {
			type: "restrict",
			clientId: CLIENT_A,
			frictionlessScore: 0.5,
			imageThreshold: 0.8,
			unsolvedImagesCount: 2,
		} as AccessRule,
	},
];
const REDIS_FILTERS: [AccessRulesFilter, boolean][] = [
	[
		{
			policyScope: { clientId: CLIENT_A },
			policyScopeMatch: FilterScopeMatch.Greedy,
			userScope: {
				numericIp: 3232235777n,
				os: "linux",
				browser: "firefox",
				headerMatch: "1",
			},
			userScopeMatch: FilterScopeMatch.Greedy,
		},
		true,
	],
	[
		{
			policyScope: { clientId: CLIENT_A },
			policyScopeMatch: FilterScopeMatch.Greedy,
			userScope: {
				numericIp: 3232235777n,
				os: "linux",
				browser: "firefox",
				headerMatch: "1",
			},
			userScopeMatch: FilterScopeMatch.Greedy,
			blockOnly: true,
		},
		true,
	],
	[
		{
			policyScope: { clientId: CLIENT_A },
			policyScopeMatch: FilterScopeMatch.Greedy,
			userScope: { ja4Hash: "t13d1516h2" },
			userScopeMatch: FilterScopeMatch.Greedy,
			blockOnly: true,
			includeDeferred: true,
		},
		true,
	],
	[
		{
			userScope: {
				numericIp: 42540766411282592856903984951653826561n,
				countryCode: "GB",
				asn: 13335,
			},
			userScopeMatch: FilterScopeMatch.Greedy,
		},
		true,
	],
	[
		{
			policyScope: { clientId: CLIENT_B },
			policyScopeMatch: FilterScopeMatch.Exact,
			groupId: "group1",
		},
		false,
	],
	[{ policyScopeMatch: FilterScopeMatch.Exact }, false],
	[{ policyScopeMatch: FilterScopeMatch.Greedy }, false],
	[
		{
			userScope: { coords: "[[1.5,2.5],[3,4]]" },
			userScopeMatch: FilterScopeMatch.Greedy,
		},
		false,
	],
	[{}, false],
	[{}, true],
	[
		{
			policyScope: { clientId: "with-hyphen" },
			policyScopeMatch: FilterScopeMatch.Greedy,
			userScope: { countryCode: "GB" },
			userScopeMatch: FilterScopeMatch.Greedy,
		},
		true,
	],
	[
		{
			policyScope: { clientId: "with-hyphen" },
			policyScopeMatch: FilterScopeMatch.Exact,
		},
		false,
	],
];

const redisSection = async (): Promise<Json> => {
	const connection = connectToRedis({
		url: "redis://localhost:6379",
		password: "root",
		logger,
	});
	const indexed = setupRedisIndex(connection, accessRulesRedisIndex, logger);
	const client = await indexed.getClient();
	const writer = new RedisRulesWriter(client, logger);
	const reader = new RedisRulesReader(client, logger);
	await writer.deleteAllRules();

	const indexHash: string | null =
		(await client.hGet("_index_hashes", accessRulesRedisIndex.name)) ?? null;
	const insertedIds: string[] = await writer.insertRules(redisCorpus);
	const ids: string[] = redisCorpus.map((entry: AccessRuleEntry): string =>
		makeAccessRuleHash(entry.rule),
	);
	const stored: Json[] = [];
	for (const id of ids) {
		stored.push({
			id,
			hash: (await client.hGetAll(`uar:${id}`)) as Json,
			expireTime: Number(await client.expireTime(`uar:${id}`)),
		});
	}
	const fetched: Json = encode(await reader.fetchRules([...ids, "missing-id"]));
	const missing: Json = encode(
		await reader.getMissingRuleIds([...ids.slice(0, 3), "missing-id", "other"]),
	);
	const found: Json[] = [];
	for (const [filter, matchingFieldsOnly] of REDIS_FILTERS) {
		found.push({
			filter: encode(filter),
			matchingFieldsOnly,
			rules: encode(await reader.findRules(filter, matchingFieldsOnly)),
			ruleIds: encode(
				(await reader.findRuleIds(filter, matchingFieldsOnly)).sort(),
			),
		});
	}
	const allIds: string[] = [];
	await reader.fetchAllRuleIds(async (batch: string[]): Promise<void> => {
		allIds.push(...batch);
	});
	await writer.deleteRules(ids.slice(0, 2));
	const afterDelete: Json = encode(await reader.getMissingRuleIds(ids));
	const deletedCount: number = await writer.deleteAllRules();
	await client.quit();
	return {
		corpus: encode(redisCorpus),
		indexHash,
		insertedIds,
		ids,
		stored,
		fetched,
		missing,
		found,
		allIds: allIds.sort(),
		afterDelete,
		deletedCount,
	};
};

const vectors: Json = {
	node: process.version,
	userScopeRecordFields: [...userScopeRecordFields],
	ruleHashes,
	infiniteRules,
	ruleRecords,
	redisValues,
	matchedRules,
	userScopeRecords,
	cidrs,
	ruleInputs,
	policyInputs,
	sanitizedPolicies,
	scopeInputs,
	policyScopeInputs,
	exclusionInputs,
	entryInputs,
	filterInputs,
	endpointInputs,
	headerConditions,
	ruleHeaderMatches,
	headerLists,
	headerEncodings,
	classifications,
	queries,
	blockPoolClauses,
	subQueries,
	rateLimits,
	redis: await redisSection(),
	recordRoundTrips: RULES.slice(0, 100).map((rule: AccessRule): Json => {
		const record: Outcome = outcome(() => transformAccessRuleIntoRecord(rule));
		return {
			rule: encode(rule),
			back:
				"result" in record
					? outcome(() =>
							transformAccessRuleRecordIntoRule(
								decode(record.result) as Parameters<
									typeof transformAccessRuleRecordIntoRule
								>[0],
							),
						)
					: null,
		};
	}),
};

writeFileSync(
	fileURLToPath(new URL("./vectors.json", import.meta.url)),
	`${JSON.stringify(vectors)}\n`,
);
process.exit(0);
