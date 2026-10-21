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

// Records the TypeScript wire constants, enums and schemas (ApiParams, INPUT_LIMITS, the
// sanitisers, the stored enums, timeouts, counter keys, isBlockingCaptchaResult) into
// wire-vectors.json, which wire_equivalence.rs replays against the Rust.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type ZodTypeAny, number, object } from "zod";
import { INPUT_LIMITS } from "../../src/api/inputLimits.js";
import { ApiParams } from "../../src/api/params.js";
import { boundedArray, boundedString, safeLine, safeText } from "../../src/api/sanitise.js";
import {
	CaptchaType,
	CaptchaTypeSchema,
	DecisionMachineCaptchaTypeSchema,
	SelectableCaptchaTypeSchema,
} from "../../src/client/captchaType/captchaType.js";
import * as testSiteKeys from "../../src/client/testSiteKeys.js";
import { Tier, TierSchema } from "../../src/client/user.js";
import { Mode, ModeEnum } from "../../src/config/mode.js";
import * as timeouts from "../../src/config/timeouts.js";
import {
	CaptchaItemTypes,
	CaptchaStates,
	CaptchaStatus,
	CaptchaTypes,
	DappPayee,
	GovernanceStatus,
	InputMethod,
	InputMethodSchema,
	POW_SEPARATOR,
	PowChallengeIdSchema,
	StoredStatusNames,
} from "../../src/datasets/captcha.js";
import {
	COUNTER_CAPTCHA_ANY,
	COUNTER_DIMENSIONS,
	COUNTER_KINDS,
	COUNTER_WINDOWS,
	COUNTER_WINDOW_SECONDS,
	type CounterSpec,
	CounterSpecSchema,
	DecisionMachineConfigSchema,
	DecisionMachineDecision,
	DecisionMachineKind,
	DecisionMachineLanguage,
	DecisionMachineOutputSchema,
	DecisionMachineRuntime,
	DecisionMachineScope,
	encodeCounterKey,
} from "../../src/decisionMachine/index.js";
import { BlockRuleType } from "../../src/provider/api.js";
import { isBlockingCaptchaResult } from "../../src/provider/isBlockingCaptchaResult.js";
import {
	FrictionlessReason,
	NO_MEASUREMENT_REASONS,
	ResultReason,
} from "../../src/provider/reasons.js";
import { ScheduledTaskNames, ScheduledTaskStatus } from "../../src/provider/scheduler.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type Repeat = { unit: string; count: number; tail: string };

/// A string over LONG_STRING is stored as a repeat, so token-sized limits stay small on disk.
type Input = { value?: Json } | { repeat: Repeat };

type Result =
	| { ok: Json }
	| { okEcho: true }
	| { okUndefined: true }
	| { issues: Json }
	| { throws: string };

const LONG_STRING = 1000;

const encodeInput = (value: Json): Input => {
	if (typeof value !== "string" || value.length <= LONG_STRING) return { value };
	const unit = [...value][0] ?? "";
	const units = [...value];
	let count = 0;
	while (units[count] === unit) count++;
	return { repeat: { unit, count, tail: units.slice(count).join("") } };
};

const decodeInput = (input: Input): unknown => {
	if ("repeat" in input) return `${input.repeat.unit.repeat(input.repeat.count)}${input.repeat.tail}`;
	return "value" in input ? input.value : undefined;
};

type SchemaVector = { schema: string; input: Input; result: Result };

const ENUMS: Record<string, Record<string, string>> = {
	CaptchaType,
	Tier,
	ModeEnum,
	ScheduledTaskNames,
	ScheduledTaskStatus,
	TestSiteKeyMode: testSiteKeys.TestSiteKeyMode,
	BlockRuleType,
	CaptchaTypes,
	CaptchaItemTypes,
	CaptchaStates,
	InputMethod,
	CaptchaStatus,
	StoredStatusNames,
	GovernanceStatus,
	DappPayee,
	FrictionlessReason,
	ResultReason,
	DecisionMachineRuntime,
	DecisionMachineKind,
	DecisionMachineScope,
	DecisionMachineLanguage,
	DecisionMachineDecision,
};

const repeat = (unit: string, count: number): string => unit.repeat(count);

/// Strings at and around a UTF-16 limit, built from one- and two-unit characters.
const aroundLimit = (limit: number): Json[] => [
	repeat("a", limit - 1),
	repeat("a", limit),
	repeat("a", limit + 1),
	`${repeat("😀", Math.floor(limit / 2))}${limit % 2 === 1 ? "a" : ""}`,
	`${repeat("😀", Math.floor(limit / 2))}${limit % 2 === 1 ? "a" : ""}x`,
	`${repeat("é", limit)}`,
	`${repeat("é", limit)}é`,
];

const CHARACTERS: Json[] = [
	...Array.from({ length: 0x20 }, (_: unknown, code: number) => `a${String.fromCharCode(code)}b`),
	"a\u007fb",
	"a\u0080b",
	"a\u0085b",
	"a b",
	"a b",
	"a b",
	"a﻿b",
	"日本語 — ok ✅",
	"",
];

const GENERIC: Json[] = [
	null,
	true,
	0,
	1,
	-1,
	1.5,
	"",
	"x",
	"pow",
	"audio",
	"image",
	"free",
	"Pending",
	"pending",
	"pointer",
	"visible",
	[],
	["a"],
	[1, 2, 3],
	{},
	{ $gt: "" },
];

const spec: CounterSpec = {
	kind: "served",
	captchaType: CaptchaType.pow,
	dimension: "ip",
	window: "1h",
};

const objectVariants = (base: { [key: string]: Json }): Json[] => {
	const variants: Json[] = [base];
	for (const key of Object.keys(base)) {
		const { [key]: _removed, ...rest } = base;
		variants.push(rest);
		for (const replacement of [null, 1, "", "zzz", [], {}, true] as Json[]) {
			variants.push({ ...base, [key]: replacement });
		}
	}
	variants.push({ ...base, extra: "stripped" });
	return variants;
};

const SCHEMAS: [string, ZodTypeAny, Json[]][] = [
	["boundedString4", boundedString(4), [...aroundLimit(4), ...CHARACTERS]],
	["boundedStringId", boundedString(INPUT_LIMITS.ID), aroundLimit(INPUT_LIMITS.ID)],
	["boundedStringToken", boundedString(INPUT_LIMITS.TOKEN), aroundLimit(INPUT_LIMITS.TOKEN)],
	["boundedStringDefault", boundedString(), aroundLimit(INPUT_LIMITS.TEXT)],
	["safeText3", safeText(3), [...aroundLimit(3), ...CHARACTERS]],
	["safeTextLong", safeText(INPUT_LIMITS.LONG_TEXT), [...aroundLimit(INPUT_LIMITS.LONG_TEXT), ...CHARACTERS]],
	["safeLine", safeLine(), [...aroundLimit(INPUT_LIMITS.NAME), ...CHARACTERS]],
	["safeLine5", safeLine(5), [...aroundLimit(5), ...CHARACTERS]],
	[
		"boundedArrayNumbers",
		boundedArray(number(), 3),
		[[1, 2, 3], [], [1, "b"], ["a", "b", "c", "d", "e"], "nope", [1, 2, 3, 4], [null], { length: 1 }],
	],
	[
		"boundedArrayObjects",
		boundedArray(object({ x: number(), y: number() }), 2),
		[[{ x: 1, y: 2 }], [{ x: 1 }], [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }], [{ x: "a", y: 1 }, null]],
	],
	["captchaType", CaptchaTypeSchema, Object.values(CaptchaType)],
	["selectableCaptchaType", SelectableCaptchaTypeSchema, Object.values(CaptchaType)],
	["decisionMachineCaptchaType", DecisionMachineCaptchaTypeSchema, Object.values(CaptchaType)],
	["tier", TierSchema, Object.values(Tier)],
	["mode", Mode, Object.values(ModeEnum)],
	["inputMethod", InputMethodSchema, Object.values(InputMethod)],
	[
		"powChallengeId",
		PowChallengeIdSchema,
		[
			"1700000000000___user___dapp___42",
			"1700000000000___user___dapp",
			"a___b___c___d___e",
			"______",
			"_________",
			"x___y___z___",
			"___",
			"notanumber___u___d___n",
		],
	],
	[
		"counterSpec",
		CounterSpecSchema,
		[
			...objectVariants({ ...spec }),
			...COUNTER_WINDOWS.map((window): Json => ({ ...spec, window })),
			...[...Object.values(CaptchaType), COUNTER_CAPTCHA_ANY].map(
				(captchaType): Json => ({ ...spec, captchaType }),
			),
			{ ...spec, window: "2h" },
			{ ...spec, kind: "SERVED" },
		],
	],
	[
		"decisionMachineOutput",
		DecisionMachineOutputSchema,
		[
			...objectVariants({ decision: "allow", reason: "r", score: 0.5, tags: ["a"] }),
			{ decision: "deny" },
			{ decision: "maybe" },
			{ decision: "allow", tags: ["a", 1] },
		],
	],
	[
		"decisionMachineConfig",
		DecisionMachineConfigSchema,
		[
			...objectVariants({
				runtime: "node",
				source: "export default () => ({decision:'allow'})",
				language: "ts",
				name: "n",
				version: "1",
				createdAt: "2026-01-01T00:00:00.000Z",
				captchaType: "puzzle",
			}),
			{ runtime: "deno", source: "", createdAt: "" },
			{ runtime: "node", source: "", createdAt: "", captchaType: "frictionless" },
		],
	],
];

const result = (schema: ZodTypeAny, input: Input): Result => {
	try {
		const value = decodeInput(input);
		const parsed = schema.safeParse(value);
		if (!parsed.success) {
			return { issues: JSON.parse(JSON.stringify(parsed.error.issues)) as Json };
		}
		if (parsed.data === undefined) return { okUndefined: true };
		if ("repeat" in input && parsed.data === value) return { okEcho: true };
		return { ok: JSON.parse(JSON.stringify(parsed.data)) as Json };
	} catch (error) {
		return { throws: error instanceof Error ? error.name : String(error) };
	}
};

const schemaVectors: SchemaVector[] = [];
for (const [name, schema, specific] of SCHEMAS) {
	const inputs: Input[] = [{}, ...[...GENERIC, ...specific].map(encodeInput)];
	for (const input of inputs) {
		schemaVectors.push({ schema: name, input, result: result(schema, input) });
	}
}

const COUNTER_VALUES: string[] = ["1.2.3.4", "", "::1", "2001:db8::1", "user", "日本", "a:b:c"];
const counterKeys: { dapp: string; spec: CounterSpec; value: string; key: string }[] = [];
for (const kind of COUNTER_KINDS) {
	for (const dimension of COUNTER_DIMENSIONS) {
		for (const window of COUNTER_WINDOWS) {
			for (const captchaType of [CaptchaType.pow, CaptchaType.iconOrder, COUNTER_CAPTCHA_ANY] as const) {
				const counterSpec: CounterSpec = { kind, dimension, window, captchaType };
				const value = COUNTER_VALUES[counterKeys.length % COUNTER_VALUES.length] ?? "";
				const dapp = counterKeys.length % 5 === 0 ? "" : "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";
				counterKeys.push({ dapp, spec: counterSpec, value, key: encodeCounterKey(dapp, counterSpec, value) });
			}
		}
	}
}

const blocking: { captchaType: string; status: string; reason: string | null; blocked: boolean }[] = [];
for (const captchaType of Object.values(CaptchaType)) {
	for (const status of Object.values(CaptchaStatus)) {
		for (const reason of [undefined, ...Object.values(ResultReason)]) {
			blocking.push({
				captchaType,
				status,
				reason: reason ?? null,
				blocked: isBlockingCaptchaResult(captchaType, { status, ...(reason ? { reason } : {}) }),
			});
		}
	}
}

const siteKeyInputs: string[] = [
	testSiteKeys.ALWAYS_PASS_SITE_KEY,
	testSiteKeys.ALWAYS_FAIL_SITE_KEY,
	testSiteKeys.ALWAYS_PASS_SITE_KEY.slice(0, 47),
	`${testSiteKeys.ALWAYS_PASS_SITE_KEY}x`,
	testSiteKeys.ALWAYS_PASS_SITE_KEY.toLowerCase(),
	"",
	"5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw",
];

const vectors = {
	enums: Object.fromEntries(
		Object.entries(ENUMS).map(([name, values]) => [name, Object.entries(values)]),
	),
	apiParams: Object.entries(ApiParams),
	inputLimits: Object.entries(INPUT_LIMITS),
	timeouts: Object.entries(timeouts),
	powSeparator: POW_SEPARATOR,
	noMeasurementReasons: [...NO_MEASUREMENT_REASONS],
	counterWindowSeconds: Object.entries(COUNTER_WINDOW_SECONDS),
	counterCaptchaAny: COUNTER_CAPTCHA_ANY,
	testSiteKeys: {
		pass: testSiteKeys.ALWAYS_PASS_SITE_KEY,
		fail: testSiteKeys.ALWAYS_FAIL_SITE_KEY,
		modes: siteKeyInputs.map((siteKey: string) => ({
			siteKey,
			mode: testSiteKeys.getTestSiteKeyMode(siteKey),
		})),
	},
	counterKeys,
	blocking,
	schemas: SCHEMAS.map(([name]) => name),
	schemaVectors,
};

const output = fileURLToPath(new URL("./wire-vectors.json", import.meta.url));
writeFileSync(output, `${JSON.stringify(vectors, null, "\t")}\n`);
process.stdout.write(`wrote ${schemaVectors.length} schema vectors and ${counterKeys.length + blocking.length} others\n`);
