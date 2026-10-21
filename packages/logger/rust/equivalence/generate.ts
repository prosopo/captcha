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

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	type Format,
	type LogLevel,
	type LogRecord,
	type Logger,
	NativeLogger,
	getLogger,
	parseDirectives,
	parseLogLevel,
	resolveLevel,
	setGlobalDirectives,
} from "../../src/index.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

// JSON cannot carry bigint, -0 or a key order JS would not preserve, so those
// travel as tagged objects that both sides decode.
type Encoded =
	| null
	| boolean
	| number
	| string
	| Encoded[]
	| { [key: string]: Encoded };

type ErrorCtor = "Error" | "TypeError" | "RangeError" | "SyntaxError";

type ErrSpec =
	| { kind: "value"; value: Encoded }
	| {
			kind: "error";
			ctor: ErrorCtor;
			message?: string;
			stack?: string;
			cause?: ErrSpec;
			props?: [string, ErrSpec][];
	  };

type RecordSpec = { msg?: string; data?: Encoded; err?: ErrSpec };

type Method = LogLevel | "log";

type Step =
	| { op: "directives"; raw: string }
	| { op: "now"; ms: number }
	| { op: "getLogger"; id: string; level: LogLevel; scope: string }
	| { op: "new"; id: string; scope: string }
	| {
			op: "with";
			id: string;
			parent: string;
			data: Encoded;
			subscope?: string;
	  }
	| { op: "setLevel"; id: string; level: LogLevel }
	| { op: "setPretty"; id: string; value: boolean }
	| { op: "setPrintStack"; id: string; value: boolean }
	| { op: "setFormat"; id: string; format: Format }
	| { op: "inspect"; id: string }
	| {
			op: "emit";
			id: string;
			method: Method;
			level?: LogLevel;
			record: RecordSpec;
	  };

type Event =
	| { console: string; line: string }
	| { setFormatError: string | null }
	| {
			inspect: {
				level: LogLevel;
				scope: string;
				pretty: boolean;
				printStack: boolean;
				format: Format;
			};
	  };

type Scenario = { name: string; steps: Step[]; events: Event[] };

const isRecord = (value: Encoded): value is { [key: string]: Encoded } =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const decode = (value: Encoded): unknown => {
	if (Array.isArray(value)) return value.map(decode);
	if (!isRecord(value)) return value;
	const bigint = value.$bigint;
	if (typeof bigint === "string") return BigInt(bigint);
	if (value.$negzero === true) return -0;
	const entries = value.$entries;
	const out: Record<string, unknown> = {};
	if (Array.isArray(entries)) {
		for (const entry of entries) {
			if (Array.isArray(entry) && typeof entry[0] === "string") {
				out[entry[0]] = decode(entry[1] ?? null);
			}
		}
		return out;
	}
	for (const [key, inner] of Object.entries(value)) out[key] = decode(inner);
	return out;
};

const ctors: Record<ErrorCtor, ErrorConstructor> = {
	Error,
	TypeError,
	RangeError,
	SyntaxError,
};

const buildErr = (spec: ErrSpec): unknown => {
	if (spec.kind === "value") return decode(spec.value);
	const Ctor = ctors[spec.ctor];
	const options = spec.cause ? { cause: buildErr(spec.cause) } : undefined;
	const err: Error = new Ctor(spec.message, options);
	if (spec.stack === undefined) {
		Reflect.deleteProperty(err, "stack");
	} else {
		err.stack = spec.stack;
	}
	for (const [key, value] of spec.props ?? []) {
		Reflect.set(err, key, buildErr(value));
	}
	return err;
};

const buildRecord = (spec: RecordSpec): LogRecord => {
	const record: LogRecord = {};
	if (spec.msg !== undefined) record.msg = spec.msg;
	if (spec.data !== undefined) record.data = decode(spec.data) as object;
	if (spec.err !== undefined) record.err = buildErr(spec.err);
	return record;
};

let currentNow = 0;
const RealDate = Date;
class FixedDate extends RealDate {
	constructor(value?: number | string | Date) {
		if (value === undefined) super(currentNow);
		else super(value);
	}
}
globalThis.Date = FixedDate as DateConstructor;

let events: Event[] = [];
const consoleMethods = [
	"log",
	"info",
	"debug",
	"trace",
	"warn",
	"error",
] as const;
for (const name of consoleMethods) {
	console[name] = (...args: unknown[]): void => {
		const [line] = args;
		if (args.length !== 1 || typeof line !== "string") {
			throw new Error(`unexpected console.${name} call shape`);
		}
		events.push({ console: name, line });
	};
}

const run = (name: string, steps: Step[]): Scenario => {
	setGlobalDirectives("");
	currentNow = 0;
	events = [];
	const loggers = new Map<string, Logger>();
	const get = (id: string): Logger => {
		const logger = loggers.get(id);
		if (!logger) throw new Error(`no logger ${id}`);
		return logger;
	};
	for (const step of steps) {
		switch (step.op) {
			case "directives":
				setGlobalDirectives(step.raw);
				break;
			case "now":
				currentNow = step.ms;
				break;
			case "getLogger":
				loggers.set(step.id, getLogger(step.level, step.scope));
				break;
			case "new":
				loggers.set(step.id, new NativeLogger(step.scope));
				break;
			case "with":
				loggers.set(
					step.id,
					get(step.parent).with(decode(step.data) as object, step.subscope),
				);
				break;
			case "setLevel":
				get(step.id).setLogLevel(step.level);
				break;
			case "setPretty":
				get(step.id).setPretty(step.value);
				break;
			case "setPrintStack":
				get(step.id).setPrintStack(step.value);
				break;
			case "setFormat": {
				let error: string | null = null;
				try {
					get(step.id).setFormat(step.format);
				} catch (e) {
					error = e instanceof Error ? e.message : String(e);
				}
				events.push({ setFormatError: error });
				break;
			}
			case "inspect": {
				const logger = get(step.id);
				events.push({
					inspect: {
						level: logger.getLogLevel(),
						scope: logger.getScope(),
						pretty: logger.getPretty(),
						printStack: logger.getPrintStack(),
						format: logger.getFormat(),
					},
				});
				break;
			}
			case "emit": {
				const logger = get(step.id);
				const fn = (): LogRecord => buildRecord(step.record);
				if (step.method === "log") logger.log(step.level ?? "info", fn);
				else logger[step.method](fn);
				break;
			}
		}
	}
	return { name, steps, events };
};

const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
const NOW = 1_767_225_600_123;

const scenarios: Scenario[] = [];
const add = (name: string, steps: Step[]): void => {
	scenarios.push(run(name, steps));
};
const single = (
	name: string,
	record: RecordSpec,
	opts: { pretty?: boolean; printStack?: boolean; scope?: string } = {},
): void => {
	const steps: Step[] = [
		{ op: "now", ms: NOW },
		{ op: "getLogger", id: "l", level: "trace", scope: opts.scope ?? "test" },
	];
	if (opts.pretty) steps.push({ op: "setPretty", id: "l", value: true });
	if (opts.printStack)
		steps.push({ op: "setPrintStack", id: "l", value: true });
	steps.push({ op: "emit", id: "l", method: "error", record });
	add(name, steps);
};

const directiveStrings: string[] = [
	"",
	"warn",
	"trace",
	"fatal",
	"warn,svc=trace",
	"svc=debug",
	"svc:db=error,svc=trace",
	"debug,svc:db:query=fatal",
	"=trace",
	" , bogus=nope , svc = warn ",
	"WARN",
	"﻿trace",
	"\u0085trace",
	"svc =debug",
];
const scopes: string[] = ["svc", "svc:db", "svc:db:query", "other", ""];

type FilterVector = {
	directives: string;
	scope: string;
	level: LogLevel;
	emitted: [string, string][];
};

// Every filter vector logs one record per level, then one via log("warn"), so
// only the inputs and what reached the console need recording.
const filterVectors: FilterVector[] = [];
for (const directives of directiveStrings) {
	for (const scope of scopes) {
		for (const level of ["trace", "info", "fatal"] as LogLevel[]) {
			setGlobalDirectives(directives);
			currentNow = NOW;
			events = [];
			const logger = getLogger(level, scope);
			for (const method of levels) {
				logger[method]((): LogRecord => ({ msg: method }));
			}
			logger.log("warn", (): LogRecord => ({ msg: "log" }));
			const emitted: [string, string][] = [];
			for (const event of events) {
				if ("console" in event) emitted.push([event.console, event.line]);
			}
			filterVectors.push({ directives, scope, level, emitted });
		}
	}
}

const timestamps: number[] = [
	0,
	-1,
	951_782_400_000,
	NOW,
	253_402_300_799_999,
	253_402_300_800_000,
	-62_167_219_200_001,
	-62_198_755_200_000,
	8.64e15,
	-8.64e15,
];
for (const ms of timestamps) {
	add(`timestamp ${ms}`, [
		{ op: "now", ms },
		{ op: "getLogger", id: "l", level: "info", scope: "ts" },
		{ op: "emit", id: "l", method: "info", record: { msg: "tick" } },
	]);
}

const dataCases: [string, Encoded][] = [
	["empty object", {}],
	["flat", { a: 1, b: "two", c: true, d: null }],
	[
		"numbers",
		{
			int: 42,
			neg: -7,
			frac: 0.1,
			sum: 0.30000000000000004,
			big: 1e21,
			justUnder: 1e20,
			small: 1.5e-7,
			micro: 0.000001,
			tiny: 5e-324,
			max: Number.MAX_VALUE,
			unsafe: 12345678901234567000,
			safe: 9007199254740991,
			negzero: { $negzero: true },
			expNeg: -1.23e-18,
		},
	],
	[
		"strings",
		{
			quote: 'say "hi"',
			backslash: "a\\b",
			controls: "\u0000\u0001\u0008\t\n\u000b\u000c\r\u001f",
			del: "\u007f",
			unicode: "héllo 世界 🦀",
			separators: "  ",
			slash: "</script>",
			empty: "",
		},
	],
	[
		"nested",
		{
			arr: [1, [2, [3, []]], {}, { x: [null, false] }],
			obj: { inner: { deeper: { deepest: "y" } } },
		},
	],
	[
		"bigint",
		{ amount: { $bigint: "12345678901234567890" }, list: [{ $bigint: "-5" }] },
	],
	[
		"integer-like keys",
		{
			$entries: [
				["b", 1],
				["2", 2],
				["1", 3],
				["a", 4],
				["01", 5],
				["4294967295", 6],
				["4294967294", 7],
				["-1", 8],
				["0", 9],
				["1.5", 10],
			],
		},
	],
	["requestId string", { requestId: "req-1", other: 1 }],
	["requestId empty", { requestId: "" }],
	["requestId number", { requestId: 12 }],
	["requestId nested only", { inner: { requestId: "nope" } }],
];
for (const [name, data] of dataCases) {
	for (const pretty of [false, true]) {
		add(`data ${name} pretty=${pretty}`, [
			{ op: "now", ms: NOW },
			{ op: "getLogger", id: "l", level: "info", scope: "data" },
			{ op: "setPretty", id: "l", value: pretty },
			{ op: "emit", id: "l", method: "info", record: { data, msg: "m" } },
		]);
	}
}

const msgCases: string[] = ["", "plain", 'q"uote\n', "🦀"];
for (const msg of msgCases) {
	single(`msg ${JSON.stringify(msg)}`, { msg });
}
single("empty record", {});

const errCases: [string, ErrSpec][] = [
	["primitive number", { kind: "value", value: 42 }],
	["primitive zero", { kind: "value", value: 0 }],
	["primitive float", { kind: "value", value: 1.5e-7 }],
	["primitive string", { kind: "value", value: "plain failure" }],
	["primitive empty string", { kind: "value", value: "" }],
	["primitive true", { kind: "value", value: true }],
	["primitive false", { kind: "value", value: false }],
	["primitive null", { kind: "value", value: null }],
	["primitive bigint", { kind: "value", value: { $bigint: "99" } }],
	["plain object", { kind: "value", value: { code: 1, message: "objmsg" } }],
	["plain object msg", { kind: "value", value: { msg: "via msg" } }],
	[
		"plain object translationKey",
		{
			kind: "value",
			value: { translationKey: "API.KEY", message: "m", name: "Custom" },
		},
	],
	[
		"plain object null message",
		{ kind: "value", value: { message: null, msg: "fallback" } },
	],
	[
		"plain object nested msg object",
		{ kind: "value", value: { message: { a: 1 } } },
	],
	[
		"plain object array message",
		{ kind: "value", value: { message: [1, [2, null], "x"] } },
	],
	["plain object name empty", { kind: "value", value: { name: "" } }],
	["plain object name null", { kind: "value", value: { name: null } }],
	["plain object name zero", { kind: "value", value: { name: 0 } }],
	[
		"plain object with cause",
		{ kind: "value", value: { cause: { reason: "r" } } },
	],
	[
		"plain object with stack",
		{ kind: "value", value: { stack: "s", stacktrace: "t" } },
	],
	["empty object", { kind: "value", value: {} }],
	["array", { kind: "value", value: [1, "two"] }],
	["empty array", { kind: "value", value: [] }],
	[
		"object integer keys",
		{
			kind: "value",
			value: {
				$entries: [
					["z", 1],
					["3", 2],
					["1", 3],
				],
			},
		},
	],
	["Error", { kind: "error", ctor: "Error", message: "boom" }],
	["Error no message", { kind: "error", ctor: "Error" }],
	["Error empty message", { kind: "error", ctor: "Error", message: "" }],
	["TypeError", { kind: "error", ctor: "TypeError", message: "bad input" }],
	["RangeError", { kind: "error", ctor: "RangeError", message: "range" }],
	[
		"Error with stack",
		{
			kind: "error",
			ctor: "Error",
			message: "s",
			stack: "Error: s\n    at x (y.js:1:2)",
		},
	],
	[
		"Error custom props",
		{
			kind: "error",
			ctor: "Error",
			message: "custom",
			props: [
				["statusCode", { kind: "value", value: 404 }],
				["details", { kind: "value", value: { a: [1, 2] } }],
				["amount", { kind: "value", value: { $bigint: "7" } }],
			],
		},
	],
	[
		"Error translationKey",
		{
			kind: "error",
			ctor: "Error",
			message: "Translated text",
			props: [
				["translationKey", { kind: "value", value: "API.UNAUTHORIZED" }],
				["context", { kind: "value", value: { code: 401 } }],
			],
		},
	],
	[
		"Error own name",
		{
			kind: "error",
			ctor: "Error",
			message: "named",
			props: [["name", { kind: "value", value: "ProsopoApiError" }]],
		},
	],
	[
		"Error own empty name",
		{
			kind: "error",
			ctor: "TypeError",
			message: "x",
			props: [["name", { kind: "value", value: "" }]],
		},
	],
	[
		"Error own null name",
		{
			kind: "error",
			ctor: "TypeError",
			message: "x",
			props: [["name", { kind: "value", value: null }]],
		},
	],
	[
		"Error null message",
		{
			kind: "error",
			ctor: "Error",
			props: [
				["message", { kind: "value", value: null }],
				["msg", { kind: "value", value: "fallback msg" }],
			],
		},
	],
	[
		"Error option cause Error",
		{
			kind: "error",
			ctor: "Error",
			message: "outer",
			cause: { kind: "error", ctor: "TypeError", message: "inner" },
		},
	],
	[
		"Error assigned cause after props",
		{
			kind: "error",
			ctor: "Error",
			message: "outer",
			props: [
				["code", { kind: "value", value: "E1" }],
				["cause", { kind: "error", ctor: "Error", message: "root cause" }],
			],
		},
	],
	[
		"Error cause chain",
		{
			kind: "error",
			ctor: "Error",
			message: "l1",
			stack: "stack1",
			cause: {
				kind: "error",
				ctor: "RangeError",
				message: "l2",
				stack: "stack2",
				cause: {
					kind: "error",
					ctor: "Error",
					message: "l3",
					cause: { kind: "value", value: "l4 string" },
				},
			},
		},
	],
	[
		"Error primitive cause",
		{
			kind: "error",
			ctor: "Error",
			message: "boom",
			cause: { kind: "value", value: "a string cause" },
		},
	],
	[
		"Error null cause",
		{
			kind: "error",
			ctor: "Error",
			message: "boom",
			cause: { kind: "value", value: null },
		},
	],
	[
		"Error zero cause",
		{
			kind: "error",
			ctor: "Error",
			message: "boom",
			cause: { kind: "value", value: 0 },
		},
	],
	[
		"Error object cause",
		{
			kind: "error",
			ctor: "Error",
			message: "boom",
			cause: { kind: "value", value: { reason: "x", name: "R" } },
		},
	],
	[
		"Error array cause",
		{
			kind: "error",
			ctor: "Error",
			message: "boom",
			cause: { kind: "value", value: ["a", { b: 1 }] },
		},
	],
	[
		"Error nested error under other key",
		{
			kind: "error",
			ctor: "Error",
			message: "outer",
			props: [
				[
					"inner",
					{
						kind: "error",
						ctor: "Error",
						message: "hidden message",
						stack: "hidden stack",
						cause: { kind: "value", value: "hidden cause" },
						props: [["visible", { kind: "value", value: 1 }]],
					},
				],
			],
		},
	],
	[
		"Error translationKey is error",
		{
			kind: "error",
			ctor: "Error",
			message: "outer",
			props: [
				["translationKey", { kind: "error", ctor: "TypeError", message: "tk" }],
			],
		},
	],
	[
		"Error stacktrace prop",
		{
			kind: "error",
			ctor: "Error",
			message: "m",
			stack: "st",
			props: [["stacktrace", { kind: "value", value: "trace" }]],
		},
	],
];
for (const [name, err] of errCases) {
	for (const printStack of [false, true]) {
		single(`err ${name} printStack=${printStack}`, { err }, { printStack });
	}
}
single(
	"err with msg and data pretty",
	{
		msg: "both",
		data: { requestId: "r-9", n: 1 },
		err: {
			kind: "error",
			ctor: "Error",
			message: "e",
			cause: { kind: "value", value: 1 },
		},
	},
	{ pretty: true },
);
single("err msg empty but msg set", {
	msg: "has msg",
	err: { kind: "error", ctor: "Error" },
});

add("with merges and inherits", [
	{ op: "now", ms: NOW },
	{ op: "getLogger", id: "root", level: "debug", scope: "provider" },
	{ op: "setPretty", id: "root", value: true },
	{ op: "setPrintStack", id: "root", value: true },
	{
		op: "with",
		id: "a",
		parent: "root",
		data: { requestId: "abc", a: 1, b: 2 },
	},
	{
		op: "with",
		id: "b",
		parent: "a",
		data: { b: 3, c: 4 },
		subscope: "  request ",
	},
	{ op: "with", id: "c", parent: "b", data: {}, subscope: "   " },
	{ op: "with", id: "d", parent: "c", data: {}, subscope: "db:query" },
	{ op: "inspect", id: "a" },
	{ op: "inspect", id: "b" },
	{ op: "inspect", id: "c" },
	{ op: "inspect", id: "d" },
	{ op: "setPretty", id: "b", value: false },
	{ op: "emit", id: "b", method: "debug", record: { data: { b: 5, d: 6 } } },
	{ op: "emit", id: "c", method: "info", record: { msg: "c" } },
	{
		op: "emit",
		id: "d",
		method: "info",
		record: { data: { requestId: "override" } },
	},
	{ op: "emit", id: "a", method: "trace", record: { msg: "hidden" } },
	{
		op: "emit",
		id: "d",
		method: "error",
		record: { err: { kind: "error", ctor: "Error", message: "x", stack: "S" } },
	},
]);

add("with integer keys merge order", [
	{ op: "now", ms: NOW },
	{ op: "getLogger", id: "root", level: "info", scope: "" },
	{
		op: "with",
		id: "a",
		parent: "root",
		data: {
			$entries: [
				["z", 1],
				["5", 2],
				["y", 3],
			],
		},
		subscope: "admin",
	},
	{
		op: "emit",
		id: "a",
		method: "info",
		record: {
			data: {
				$entries: [
					["2", "x"],
					["z", "over"],
					["w", 0],
				],
			},
		},
	},
]);

add("with level snapshot and directives at emit time", [
	{ op: "now", ms: NOW },
	{ op: "directives", raw: "admin=debug" },
	{ op: "getLogger", id: "root", level: "info", scope: "" },
	{ op: "with", id: "child", parent: "root", data: {}, subscope: "admin" },
	{ op: "inspect", id: "child" },
	{ op: "emit", id: "child", method: "debug", record: { msg: "shown" } },
	{ op: "directives", raw: "" },
	{ op: "emit", id: "child", method: "debug", record: { msg: "suppressed" } },
	{ op: "setLevel", id: "root", level: "trace" },
	{
		op: "emit",
		id: "child",
		method: "debug",
		record: { msg: "still suppressed" },
	},
	{ op: "emit", id: "root", method: "debug", record: { msg: "root shown" } },
	{ op: "setLevel", id: "child", level: "error" },
	{ op: "emit", id: "child", method: "warn", record: { msg: "below" } },
	{ op: "directives", raw: "admin=trace" },
	{
		op: "emit",
		id: "child",
		method: "trace",
		record: { msg: "directive wins" },
	},
	{ op: "now", ms: NOW + 1 },
	{ op: "emit", id: "child", method: "fatal", record: { msg: "later" } },
]);

add("format setters", [
	{ op: "new", id: "l", scope: "fmt" },
	{ op: "inspect", id: "l" },
	{ op: "setFormat", id: "l", format: "json" },
	{ op: "inspect", id: "l" },
	{ op: "setFormat", id: "l", format: "plain" },
	{ op: "inspect", id: "l" },
	{ op: "emit", id: "l", method: "info", record: { msg: "still json" } },
	{ op: "with", id: "c", parent: "l", data: {} },
	{ op: "inspect", id: "c" },
	{
		op: "emit",
		id: "l",
		method: "debug",
		record: { msg: "default info level" },
	},
]);

const pureVectors = {
	parseLogLevel: (
		[
			[undefined, "info"],
			["", "warn"],
			["warn", "info"],
			["warn,database=trace", "info"],
			["database=trace", "info"],
			["database=trace", "fatal"],
			["  debug  ", "info"],
			["bogus,error", "info"],
			["WARN", "debug"],
			[",,", "trace"],
			["a=b=c,fatal", "info"],
			["﻿warn", "info"],
			["\u0085warn", "info"],
			[" warn　", "info"],
		] as [string | undefined, LogLevel][]
	).map(([input, or]) => ({
		input: input ?? null,
		or,
		output: parseLogLevel(input, or),
	})),
	parseDirectives: [
		"",
		"debug",
		"provider:db=debug,provider:api=trace",
		" , provider:db=debug , bogus=nope ",
		"=debug",
		"=debug,provider:db=warn",
		"warn,database=trace",
		"database=trace",
		"info,warn",
		"a=debug,a=error",
		"a = debug ",
		"a=b=c",
		"a=",
		"a:b:c=trace,a=info",
		"﻿a=debug",
		"\u0085a=debug",
		"a= trace",
	].map((raw) => ({
		raw,
		output: [...parseDirectives(raw).entries()].sort(([a], [b]) =>
			a < b ? -1 : a > b ? 1 : 0,
		),
	})),
	resolveLevel: (
		[
			["provider:db", "provider:db=debug", "info"],
			["provider:db:query", "provider=warn,provider:db=debug", "info"],
			["provider:db", "other=trace,error", "info"],
			["provider:db", "other=trace", "info"],
			["database:mongo", "warn,database:mongo=trace", "info"],
			["database:mongo:queries", "warn,database=debug", "info"],
			["provider:request", "warn,database=debug", "info"],
			["any:scope", "", "info"],
			["", "", "fatal"],
			["", "warn", "fatal"],
			["a::b", "a=debug", "info"],
			["a::b", "a:=error", "info"],
			[":a", "a=debug", "info"],
			["a:b", "a:b:c=trace", "warn"],
			["provider", "provider:db=trace", "error"],
		] as [string, string, LogLevel][]
	).map(([scope, raw, fallback]) => ({
		scope,
		raw,
		fallback,
		output: resolveLevel(scope, parseDirectives(raw), fallback),
	})),
};

const out = `${JSON.stringify({ scenarios, filterVectors, ...pureVectors }, null, "\t")}\n`;
writeFileSync(fileURLToPath(new URL("./vectors.json", import.meta.url)), out);
