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

// Runs the TypeScript error handling on cases described as JSON and records what it
// produces: the error's own state, every log line, the line the logger writes for the error
// as `err`, and what unwrapError returns. equivalence.rs builds the same cases in Rust from the
// same JSON and compares.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	type I18nLookup,
	type Ti18n,
	loadI18next,
	translationKeys,
} from "@prosopo/locale";
import { type LogLevel, getLogger } from "@prosopo/logger";
import {
	ProsopoApiError,
	type ProsopoBaseError,
	ProsopoCliError,
	ProsopoContractError,
	ProsopoDBError,
	ProsopoDatasetError,
	ProsopoEnvError,
	ProsopoError,
	ProsopoTxQueueError,
	unwrapError,
} from "../../src/error.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

const FIXED_NOW = 1_700_000_000_123;
const LOGGER_SCOPE = "common-equivalence";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type ClassName =
	| "ProsopoError"
	| "ProsopoEnvError"
	| "ProsopoContractError"
	| "ProsopoTxQueueError"
	| "ProsopoDBError"
	| "ProsopoCliError"
	| "ProsopoDatasetError"
	| "ProsopoApiError";

type SourceSpec = { key: string } | { message: string } | { wrap: ErrorSpec };

type ValueSpec = { json: Json } | { thrown: ThrownSpec };

type OptionsSpec = {
	name?: string;
	translationKey?: string;
	logLevel?: LogLevel;
	silent?: boolean;
	i18n?: boolean;
	context?: [string, ValueSpec][];
};

type ErrorSpec = { class: ClassName; source: SourceSpec; options?: OptionsSpec };

type OtherSpec = {
	name: string;
	message: string;
	props: [string, Json][];
};

type ThrownSpec =
	| { prosopo: ErrorSpec }
	| { zod: { count: number } }
	| { other: OtherSpec };

type I18nSpec = null | { lang: string } | { map: Record<string, string> };

type Unwrapped = {
	code: number;
	statusMessage: string;
	jsonError: string;
};

type ErrorState = {
	message: string;
	translationKey: string | null;
	code: number | null;
	json: string;
	asErr: string;
};

type CaseVector = {
	label: string;
	i18n: I18nSpec;
	thrown: ThrownSpec;
	logs: string[];
	state: ErrorState | null;
	unwrapped: Unwrapped;
	unwrappedWithoutI18n: Unwrapped;
};

type ErrorConstructor = new (
	error: Error | string,
	options?: ConstructorParameters<typeof ProsopoError>[1],
) => ProsopoBaseError;

const CLASSES: Record<ClassName, ErrorConstructor> = {
	ProsopoError,
	ProsopoEnvError,
	ProsopoContractError,
	ProsopoTxQueueError,
	ProsopoDBError,
	ProsopoCliError,
	ProsopoDatasetError,
	ProsopoApiError,
};

const CLASS_NAMES: ClassName[] = Object.keys(CLASSES) as ClassName[];

class FakeZodError extends Error {
	issues: { path: (string | number)[]; message: string }[];
	constructor(issueCount: number) {
		const issues = Array.from({ length: issueCount }, (_, i) => ({
			path: ["items", i],
			message: "Expected object, received null",
		}));
		super(JSON.stringify(issues, null, 2));
		this.name = "ZodError";
		this.issues = issues;
	}
}

const mapLookup = (translations: Record<string, string>): I18nLookup => ({
	t: (key: string): string => translations[key] ?? key,
	exists: (key: string): boolean => key in translations,
});

const lines: string[] = [];

const capturedConsole = (line: unknown): void => {
	lines.push(String(line));
};

const STACK_PLACEHOLDER = "<stack>";

// The stack is a JS stack in TS and a Rust backtrace in Rust; only its presence is compared.
const withoutStack = (line: string): string => {
	const record = JSON.parse(line) as { data?: { stack?: unknown } };
	if (typeof record.data?.stack !== "string") return line;
	record.data.stack = STACK_PLACEHOLDER;
	return JSON.stringify(record);
};

const takeLines = (): string[] => lines.splice(0).map(withoutStack);

const logger = getLogger("debug", LOGGER_SCOPE);

const buildThrown = (spec: ThrownSpec, i18n: I18nLookup | undefined): Error => {
	if ("prosopo" in spec) return buildError(spec.prosopo, i18n);
	if ("zod" in spec) return new FakeZodError(spec.zod.count);
	const prototype = Object.create(Error.prototype, {
		name: { value: spec.other.name },
	}) as Error;
	const error = new Error(spec.other.message);
	Object.setPrototypeOf(error, prototype);
	const props = error as unknown as Record<string, Json>;
	for (const [key, value] of spec.other.props) {
		props[key] = value;
	}
	return error;
};

const buildValue = (spec: ValueSpec, i18n: I18nLookup | undefined): unknown =>
	"json" in spec ? spec.json : buildThrown(spec.thrown, i18n);

const buildError = (
	spec: ErrorSpec,
	i18n: I18nLookup | undefined,
): ProsopoBaseError => {
	const source: Error | string =
		"key" in spec.source
			? spec.source.key
			: "message" in spec.source
				? new Error(spec.source.message)
				: buildError(spec.source.wrap, i18n);
	const options = spec.options ?? {};
	const context: Record<string, unknown> | undefined = options.context
		? Object.fromEntries(
				options.context.map(([key, value]: [string, ValueSpec]) => [
					key,
					buildValue(value, i18n),
				]),
			)
		: undefined;
	const Class = CLASSES[spec.class];
	return new Class(source, {
		...(options.name !== undefined ? { name: options.name } : {}),
		...(options.translationKey !== undefined
			? { translationKey: options.translationKey as never }
			: {}),
		...(options.logLevel !== undefined ? { logLevel: options.logLevel } : {}),
		...(options.silent !== undefined ? { silent: options.silent } : {}),
		...(options.i18n && i18n ? { i18n } : {}),
		...(context !== undefined ? { context } : {}),
		logger,
	});
};

const unwrapped = (
	error: Error,
	i18n: I18nLookup | undefined,
): Unwrapped => {
	const result = unwrapError(error as ProsopoBaseError, i18n);
	return {
		code: result.code,
		statusMessage: result.statusMessage,
		jsonError: JSON.stringify(result.jsonError),
	};
};

const errorState = (error: ProsopoBaseError): ErrorState => {
	const errLine: string[] = lines.splice(0);
	logger.error(() => ({ err: error }));
	const asErr = takeLines()[0] ?? "";
	lines.push(...errLine);
	return {
		message: error.message,
		translationKey: error.translationKey ?? null,
		code: error instanceof ProsopoApiError ? error.code : null,
		json: JSON.stringify(error),
		asErr,
	};
};

const zod = (count: number): ValueSpec => ({ thrown: { zod: { count } } });

const prosopo = (spec: ErrorSpec): ValueSpec => ({ thrown: { prosopo: spec } });

const other = (otherSpec: OtherSpec): ValueSpec => ({ thrown: { other: otherSpec } });

const MONGO_ERROR: OtherSpec = {
	name: "MongoServerError",
	message: "E11000 duplicate key error collection: test.users",
	props: [
		["code", 11000],
		["codeName", "DuplicateKey"],
		["keyValue", { email: "a@b.c" }],
	],
};

const BODY_PARSER_ERROR: OtherSpec = {
	name: "SyntaxError",
	message: "Unexpected token } in JSON at position 4",
	props: [
		["expose", true],
		["statusCode", 400],
		["status", 400],
		["body", "{bad}"],
		["type", "entity.parse.failed"],
	],
};

const sampledKeys = (): string[] => {
	const keys: readonly string[] = translationKeys;
	const step = Math.max(1, Math.floor(keys.length / 24));
	return keys.filter((_: string, index: number) => index % step === 0);
};

const HAND_KEYS: string[] = [
	"CAPTCHA.NO_SESSION_FOUND",
	"API.INVALID_SITE_KEY",
	"API.UNKNOWN",
	"API.INCORRECT_CAPTCHA_TYPE",
	"CAPTCHA.PARSE_ERROR",
	"DATABASE.CAPTCHA_GET_FAILED",
	"DATABASE.DATABASE_IMPORT_FAILED",
	"DATABASE.DATABASE_IMPORT_ERROR",
	"WIDGET.NEXT",
	"not.a.key",
	"",
];

const KEYS: string[] = [...new Set([...HAND_KEYS, ...sampledKeys()])];

const MESSAGES: string[] = [
	"upstream: timed out",
	"DATABASE.CAPTCHA_GET_FAILED",
	"CAPTCHA.NO_SESSION_FOUND",
	"",
	"Überschrift <b>&amp;</b> \"quoted\"",
];

const CONTEXTS: (OptionsSpec["context"] | undefined)[] = [
	undefined,
	[],
	[["code", { json: 400 }]],
	[
		["code", { json: 401 }],
		["siteKey", { json: "abc" }],
	],
	[
		["translationKey", { json: "API.INVALID_SITE_KEY" }],
		["data", { json: { a: 1, nested: [true, null] } }],
	],
	[["code", { json: 0 }]],
	[
		["code", { json: 599 }],
		["error", zod(3)],
	],
	[
		["error", zod(25)],
		["code", { json: 400 }],
	],
	[
		["failedFuncName", { json: "getCaptcha" }],
		["error", prosopo({ class: "ProsopoDBError", source: { key: "DATABASE.CAPTCHA_GET_FAILED" } })],
	],
	[
		["data", { json: null }],
		["error", other(MONGO_ERROR)],
	],
	[
		["translationKey", { json: "" }],
		["code", { json: 403 }],
	],
	[["missingEnvVars", { json: ["A", "B"] }]],
	[
		["captchaId", { json: ["x", "y"] }],
		["translationKey", { json: "not.a.key" }],
		["code", { json: 418 }],
	],
	[
		[
			"error",
			prosopo({
				class: "ProsopoApiError",
				source: { key: "CAPTCHA.PARSE_ERROR" },
				options: {
					i18n: true,
					context: [
						["code", { json: 422 }],
						["data", { json: { field: "token" } }],
						["error", zod(12)],
					],
				},
			}),
		],
	],
	[
		["code", { json: 502 }],
		[
			"error",
			prosopo({
				class: "ProsopoEnvError",
				source: { message: "inner free text" },
				options: {
					translationKey: "API.UNKNOWN",
					context: [["error", other(BODY_PARSER_ERROR)]],
				},
			}),
		],
	],
	[
		["10", { json: "integer-like key" }],
		["b", { json: 1 }],
		["2", { json: "second" }],
	],
	[
		["5", { json: "five" }],
		["01", { json: "not an index" }],
		["1", { json: "one" }],
		["code", { json: 404 }],
		["30", { json: "thirty" }],
		["0", { json: "zero" }],
	],
	[["data", { thrown: { other: MONGO_ERROR } }]],
];

const OPTION_VARIANTS: Omit<OptionsSpec, "context">[] = [
	{},
	{ i18n: true },
	{ name: "CustomName", i18n: true },
	{ name: "" },
	{ translationKey: "API.UNKNOWN", i18n: true },
	{ translationKey: "" },
	{ logLevel: "debug", i18n: true },
	{ logLevel: "warn" },
	{ silent: true, i18n: true },
];

const I18N_SPECS: I18nSpec[] = [
	null,
	{ lang: "en" },
	{ lang: "de" },
	{ lang: "tr" },
	{ lang: "fr" },
	{
		map: {
			"CAPTCHA.NO_SESSION_FOUND": "No session found",
			"API.INVALID_SITE_KEY": "Invalid site key",
			"API.UNKNOWN": "Unknown error",
		},
	},
	{
		map: {
			"CAPTCHA.NO_SESSION_FOUND": "Aucune session trouvée",
			"API.INVALID_SITE_KEY": "Clé de site invalide",
		},
	},
	{ map: { "DATABASE.CAPTCHA_GET_FAILED": "Captcha alınamadı" } },
];

type CaseSpec = { label: string; i18n: I18nSpec; thrown: ThrownSpec };

const sources = (): SourceSpec[] => [
	...KEYS.map((key: string): SourceSpec => ({ key })),
	...MESSAGES.map((message: string): SourceSpec => ({ message })),
	{ wrap: { class: "ProsopoDBError", source: { key: "DATABASE.CAPTCHA_GET_FAILED" } } },
	{ wrap: { class: "ProsopoError", source: { message: "wrapped free text" } } },
	{ wrap: { class: "ProsopoContractError", source: { key: "" } } },
	{
		wrap: {
			class: "ProsopoApiError",
			source: { key: "CAPTCHA.NO_SESSION_FOUND" },
			options: { i18n: true, context: [["code", { json: 401 }]] },
		},
	},
];

const constructedCases = (): CaseSpec[] => {
	const cases: CaseSpec[] = [];
	const allSources: SourceSpec[] = sources();
	let counter = 0;
	for (const className of CLASS_NAMES) {
		for (const [sourceIndex, source] of allSources.entries()) {
			const contextIndex = (sourceIndex + counter) % CONTEXTS.length;
			const variant = OPTION_VARIANTS[(sourceIndex * 7 + counter) % OPTION_VARIANTS.length] ?? {};
			const context = CONTEXTS[contextIndex];
			const i18n = I18N_SPECS[(sourceIndex * 3 + counter) % I18N_SPECS.length] ?? null;
			cases.push({
				label: `${className} source ${sourceIndex} context ${contextIndex}`,
				i18n,
				thrown: {
					prosopo: {
						class: className,
						source,
						options: { ...variant, ...(context !== undefined ? { context } : {}) },
					},
				},
			});
			counter++;
		}
		for (const [contextIndex, context] of CONTEXTS.entries()) {
			for (const [i18nIndex, i18n] of I18N_SPECS.entries()) {
				if ((contextIndex + i18nIndex) % 3 !== 0) continue;
				cases.push({
					label: `${className} every context ${contextIndex} i18n ${i18nIndex}`,
					i18n,
					thrown: {
						prosopo: {
							class: className,
							source: { key: "CAPTCHA.NO_SESSION_FOUND" },
							options: { i18n: true, ...(context !== undefined ? { context } : {}) },
						},
					},
				});
			}
		}
	}
	return cases;
};

const STATUS_CODES: number[] = [
	0, 100, 200, 301, 400, 401, 402, 403, 404, 405, 406, 408, 409, 410, 413, 415, 418, 422,
	429, 451, 499, 500, 501, 502, 503, 504, 505, 599, 600, 999, 65535,
];

const statusCases = (): CaseSpec[] =>
	STATUS_CODES.map(
		(code: number): CaseSpec => ({
			label: `status ${code}`,
			i18n: { lang: "en" },
			thrown: {
				prosopo: {
					class: "ProsopoApiError",
					source: { key: "CAPTCHA.NO_SESSION_FOUND" },
					options: { i18n: true, silent: true, context: [["code", { json: code }]] },
				},
			},
		}),
	);

const directCases = (): CaseSpec[] => {
	const cases: CaseSpec[] = [];
	for (const [i18nIndex, i18n] of I18N_SPECS.entries()) {
		for (const count of [0, 1, 2, 10, 11, 5000]) {
			cases.push({ label: `zod ${count} i18n ${i18nIndex}`, i18n, thrown: { zod: { count } } });
		}
		for (const otherSpec of [
			MONGO_ERROR,
			BODY_PARSER_ERROR,
			{ name: "Error", message: "CAPTCHA.NO_SESSION_FOUND", props: [] },
			{ name: "Error", message: "", props: [] },
			{ name: "TypeError", message: "x is not a function", props: [["code", 503]] },
			{ name: "Error", message: "keyed", props: [["translationKey", "API.INVALID_SITE_KEY"]] },
		] satisfies OtherSpec[]) {
			cases.push({
				label: `${otherSpec.name} ${otherSpec.message} i18n ${i18nIndex}`,
				i18n,
				thrown: { other: otherSpec },
			});
		}
	}
	return cases;
};

const main = async (): Promise<void> => {
	const RealDate = Date;
	class FixedDate extends RealDate {
		constructor(...args: ConstructorParameters<typeof Date>) {
			if (args.length === 0) {
				super(FIXED_NOW);
			} else {
				super(...args);
			}
		}
		static override now(): number {
			return FIXED_NOW;
		}
	}
	globalThis.Date = FixedDate as DateConstructor;
	console.error = capturedConsole;
	console.debug = capturedConsole;
	console.info = capturedConsole;
	console.warn = capturedConsole;

	const instance: Ti18n = await loadI18next(true);

	const cases: CaseSpec[] = [...constructedCases(), ...statusCases(), ...directCases()];
	const vectors: CaseVector[] = [];
	for (const spec of cases) {
		let i18n: I18nLookup | undefined;
		if (spec.i18n === null) {
			i18n = undefined;
		} else if ("lang" in spec.i18n) {
			await instance.changeLanguage(spec.i18n.lang);
			i18n = instance;
		} else {
			i18n = mapLookup(spec.i18n.map);
		}
		lines.length = 0;
		const thrown: Error = buildThrown(spec.thrown, i18n);
		const state: ErrorState | null =
			"prosopo" in spec.thrown ? errorState(thrown as ProsopoBaseError) : null;
		vectors.push({
			label: spec.label,
			i18n: spec.i18n,
			thrown: spec.thrown,
			logs: takeLines(),
			state,
			unwrapped: unwrapped(thrown, i18n),
			unwrappedWithoutI18n: unwrapped(thrown, undefined),
		});
	}

	const output = fileURLToPath(new URL("./vectors.json", import.meta.url));
	writeFileSync(
		output,
		`${JSON.stringify({ fixedNow: FIXED_NOW, scope: LOGGER_SCOPE, keys: KEYS, cases: vectors }, null, "\t")}\n`,
	);
	process.stdout.write(`wrote ${vectors.length} cases to ${output}\n`);
};

void main();
