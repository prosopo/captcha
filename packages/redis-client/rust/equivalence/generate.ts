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

import crypto from "node:crypto";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
	type CreateOptions,
	type RediSearchSchema,
	SCHEMA_FIELD_TYPE,
} from "@redis/search";
import type CreateCommand from "@redis/search/dist/lib/commands/CREATE.js";
import { createClient } from "redis";
import { accessRulesRedisIndex } from "../../../user-access-policy/src/redis/redisRuleIndex.js";
import { redactRedisUrl } from "../../src/redisClient.js";
import type { RedisIndex } from "../../src/redisIndex.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type CommandParser = Parameters<typeof CreateCommand.parseCommand>[0];
type ArgsParser = CommandParser & { redisArgs: ReadonlyArray<string | Buffer> };
type ArgsParserConstructor = new () => ArgsParser;

const requireHere = createRequire(import.meta.url);
const { default: CREATE } = requireHere(
	"@redis/search/dist/lib/commands/CREATE.js",
) as { default: typeof CreateCommand };

// @redis/client is only a transitive dependency here, so it is resolved from
// @redis/search, the package that actually builds FT.CREATE with it.
const requireFromSearch = createRequire(requireHere.resolve("@redis/search"));
const { BasicCommandParser } = requireFromSearch(
	"@redis/client/dist/lib/client/parser.js",
) as { BasicCommandParser: ArgsParserConstructor };

const createArgs = (index: RedisIndex): string[] => {
	const parser = new BasicCommandParser();
	CREATE.parseCommand(parser, index.name, index.schema, index.options);
	return parser.redisArgs.map((arg: string | Buffer): string =>
		typeof arg === "string" ? arg : arg.toString("utf8"),
	);
};

const sha256Hex = (input: string): string =>
	crypto.createHash("sha256").update(input).digest("hex");

type IndexVector = {
	label: string;
	json: string;
	hash: string;
	createArgs: string[];
};

const indexVector = (label: string, index: RedisIndex): IndexVector => {
	const json = JSON.stringify(index);
	return { label, json, hash: sha256Hex(json), createArgs: createArgs(index) };
};

const options = (createOptions: CreateOptions): CreateOptions => createOptions;

const tag = SCHEMA_FIELD_TYPE.TAG;
const numeric = SCHEMA_FIELD_TYPE.NUMERIC;
const text = SCHEMA_FIELD_TYPE.TEXT;
const geo = SCHEMA_FIELD_TYPE.GEO;
const geoShape = SCHEMA_FIELD_TYPE.GEOSHAPE;

const syntheticIndexes: [string, RedisIndex][] = [
	["empty", { name: "probe", schema: {}, options: {} }],
	[
		"shorthand tag (TS integration test)",
		{ name: "test-index:0", schema: { tagField: tag }, options: {} },
	],
	[
		"shorthand tag plus a second tag",
		{
			name: "test-index:2",
			schema: { tagField: tag, newField: tag },
			options: {},
		},
	],
	[
		"shorthand tag ON HASH",
		{
			name: "test-index:3",
			schema: { tagField: tag },
			options: options({ ON: "HASH" }),
		},
	],
	[
		"every shorthand type",
		{
			name: "idx:shorthand",
			schema: {
				t: text,
				n: numeric,
				g: geo,
				tg: tag,
				gs: geoShape,
			},
			options: {},
		},
	],
	[
		"tag options",
		{
			name: "idx:tag",
			schema: {
				plain: { type: tag },
				missing: { type: tag, INDEXMISSING: true },
				sep: { type: tag, INDEXMISSING: true, SEPARATOR: "|" },
				emptySep: { type: tag, SEPARATOR: "" },
				all: {
					type: tag,
					AS: "allAlias",
					INDEXMISSING: true,
					SEPARATOR: ";",
					CASESENSITIVE: true,
					WITHSUFFIXTRIE: true,
					INDEXEMPTY: true,
					SORTABLE: true,
					NOINDEX: true,
				},
				unf: { type: tag, SORTABLE: "UNF" },
				falses: {
					type: tag,
					INDEXMISSING: false,
					CASESENSITIVE: false,
					WITHSUFFIXTRIE: false,
					INDEXEMPTY: false,
					SORTABLE: false,
					NOINDEX: false,
				},
				emptyAlias: { type: tag, AS: "" },
			},
			options: {},
		},
	],
	[
		"numeric and geo options",
		{
			name: "idx:numeric",
			schema: {
				n: { type: numeric },
				nMissing: { type: numeric, INDEXMISSING: true },
				nAll: {
					type: numeric,
					AS: "nAlias",
					INDEXMISSING: true,
					SORTABLE: true,
					NOINDEX: true,
				},
				nUnf: { type: numeric, SORTABLE: "UNF" },
				g: { type: geo, INDEXMISSING: true, SORTABLE: true },
				gFalse: { type: geo, INDEXMISSING: false, NOINDEX: false },
			},
			options: {},
		},
	],
	[
		"text options",
		{
			name: "idx:text",
			schema: {
				t: { type: text },
				tAll: {
					type: text,
					AS: "tAlias",
					INDEXMISSING: true,
					NOSTEM: true,
					WEIGHT: 2,
					PHONETIC: "dm:en",
					WITHSUFFIXTRIE: true,
					INDEXEMPTY: true,
					SORTABLE: "UNF",
					NOINDEX: true,
				},
				w0: { type: text, WEIGHT: 0 },
				w15: { type: text, WEIGHT: 1.5 },
				wTenth: { type: text, WEIGHT: 0.1 },
				wSmall: { type: text, WEIGHT: 0.000001 },
				wTiny: { type: text, WEIGHT: 1e-7 },
				wBig: { type: text, WEIGHT: 1e21 },
				wBigInt: { type: text, WEIGHT: 123456789012345680000 },
				wNeg: { type: text, WEIGHT: -2.5 },
				wNegZero: { type: text, WEIGHT: -0 },
				wMin: { type: text, WEIGHT: 5e-324 },
				wMax: { type: text, WEIGHT: Number.MAX_VALUE },
				wThird: { type: text, WEIGHT: 1 / 3 },
				fr: { type: text, PHONETIC: "dm:fr", NOSTEM: false },
				pt: { type: text, PHONETIC: "dm:pt" },
				es: { type: text, PHONETIC: "dm:es" },
			},
			options: {},
		},
	],
	[
		"geoshape options",
		{
			name: "idx:geoshape",
			schema: {
				a: { type: geoShape },
				b: { type: geoShape, AS: "bAlias", COORD_SYSTEM: "SPHERICAL" },
				c: { type: geoShape, COORD_SYSTEM: "FLAT", INDEXMISSING: true },
			},
			options: {},
		},
	],
	[
		"multiple definitions per field",
		{
			name: "idx:multi",
			schema: {
				sku: [
					{ type: text, AS: "sku_text" },
					{ type: tag, AS: "sku_tag", SORTABLE: true },
				],
				one: [tag],
				none: [],
			},
			options: {},
		},
	],
	[
		"integer-like keys are ordered first by JS",
		{
			name: "idx:keys",
			schema: {
				b: tag,
				"10": tag,
				a: numeric,
				"2": tag,
				"01": tag,
				"4294967295": tag,
				"4294967294": tag,
				"-1": tag,
				"1.5": tag,
			},
			options: {},
		},
	],
	[
		"strings needing JSON escapes",
		{
			name: 'idx:"quoted"\\back\nline\ttab\u0001\u001f\u007f é ✓ 😀 \u2028',
			schema: {
				'f"q': { type: tag, SEPARATOR: "\\", AS: "a\u0000b" },
				"ü-ñ": { type: tag, SEPARATOR: "\n" },
			},
			options: options({ FILTER: '@x=="\\"y\\""' }),
		},
	],
	[
		"every create option",
		{
			name: "idx:options",
			schema: { f: tag },
			options: options({
				ON: "JSON",
				PREFIX: ["a:", "b:"],
				FILTER: "@f!=''",
				LANGUAGE: "German",
				LANGUAGE_FIELD: "@lang",
				SCORE: 0.5,
				SCORE_FIELD: "@score",
				MAXTEXTFIELDS: true,
				TEMPORARY: 300,
				NOOFFSETS: true,
				NOHL: true,
				NOFIELDS: true,
				NOFREQS: true,
				SKIPINITIALSCAN: true,
				STOPWORDS: ["a", "the"],
			}),
		},
	],
	[
		"falsy create options",
		{
			name: "idx:options-falsy",
			schema: { f: tag },
			options: options({
				FILTER: "",
				LANGUAGE_FIELD: "",
				SCORE: 0,
				SCORE_FIELD: "",
				MAXTEXTFIELDS: false,
				TEMPORARY: 0,
				NOOFFSETS: false,
				NOHL: false,
				NOFIELDS: false,
				NOFREQS: false,
				SKIPINITIALSCAN: false,
				STOPWORDS: [],
			}),
		},
	],
	[
		"single-string prefix and stopwords",
		{
			name: "idx:variadic",
			schema: { f: tag },
			options: options({
				ON: "HASH",
				PREFIX: "only:",
				STOPWORDS: "stop",
				SCORE: 1,
				TEMPORARY: 1.5,
			}),
		},
	],
	[
		"empty prefix list and empty prefix string",
		{
			name: "idx:empty-prefix",
			schema: { f: tag },
			options: options({ PREFIX: [], STOPWORDS: "" }),
		},
	],
	[
		"prefix list with an empty entry",
		{
			name: "idx:prefix-entry",
			schema: { f: tag },
			options: options({ PREFIX: ["", "x:"] }),
		},
	],
];

const realIndexes: [string, RedisIndex][] = [
	["user-access-policy accessRulesRedisIndex", accessRulesRedisIndex],
	[
		"user-access-policy index renamed like database/provider.ts",
		{ ...accessRulesRedisIndex, name: "index:custom-access-rules" },
	],
];

const schemaOnly = (schema: RediSearchSchema): RediSearchSchema => schema;

const indexes: IndexVector[] = [...realIndexes, ...syntheticIndexes].map(
	([label, index]: [string, RedisIndex]): IndexVector =>
		indexVector(label, { ...index, schema: schemaOnly(index.schema) }),
);

type RedactVector = { input: string | null; output: string | null };

const redactInputs: (string | undefined)[] = [
	"redis://default:hunter2@redis.internal:6379",
	"rediss://:hunter2@redis.internal:6380/2",
	"redis://redis.internal:6379",
	"redis://localhost",
	"not a url with hunter2",
	undefined,
	"",
	"redis://user@host",
	"redis://:@host",
	"redis://user:@host:1",
	"REDIS://User:Pass@HOST:6379/0",
	"redis://us%20er:p%40ss@host",
	"redis://user:pa ss@host",
	"redis://user:p@ss@host",
	"redis://[::1]:6379",
	"redis://u:p@[2001:db8::1]:6379/3",
	"redis://host:6379/2?x=1#frag",
	"redis://host/",
	"redis://host:99999",
	"redis://ho st",
	"redis://hôst.example",
	"redis://u:p@host?protocol=3",
	"unix:///tmp/redis.sock",
	"unix://user:secret@/tmp/redis.sock?db=2",
	"http://user:secret@example.com",
	"https://example.com",
	"redis:host",
	"redis:/host",
	"redis:///path",
	"redis://@host",
	"   redis://u:p@host   ",
	"redis://u:p@host:0",
	"redis://u:p@host:00006379",
	"redis://u:%zz@host",
];

const redact: RedactVector[] = redactInputs.map(
	(input: string | undefined): RedactVector => ({
		input: input ?? null,
		output: redactRedisUrl(input) ?? null,
	}),
);

type ResolvedClientOptions = {
	host: string | null;
	port: number | null;
	path: string | null;
	tls: boolean | null;
	database: number | string | null;
	username: string | null;
	password: string | null;
};

type ClientOptionsVector = {
	url: string | null;
	password: string | null;
	result: ResolvedClientOptions | { error: string };
};

type SocketView = {
	host?: string;
	port?: number;
	path?: string;
	tls?: boolean;
};

type Credentials = { username?: string; password?: string };

type OptionsView = {
	socket?: SocketView;
	database?: number;
	credentialsProvider?: {
		type: string;
		credentials?: () => Promise<Credentials>;
	};
};

// JSON would turn a non-finite database number into null.
const encodeDatabase = (database: number | undefined): number | string | null =>
	database === undefined
		? null
		: Number.isFinite(database)
			? database
			: String(database);

const resolveClientOptions = async (
	url: string | undefined,
	password: string | undefined,
): Promise<ResolvedClientOptions | { error: string }> => {
	try {
		const client = createClient({
			url,
			password,
			socket: { keepAliveInitialDelay: 5000 },
			commandOptions: { timeout: undefined },
		});
		const view = client.options as OptionsView | undefined;
		const credentials: Credentials =
			view?.credentialsProvider?.type === "async-credentials-provider" &&
			view.credentialsProvider.credentials
				? await view.credentialsProvider.credentials()
				: {};
		return {
			host: view?.socket?.host ?? null,
			port: view?.socket?.port ?? null,
			path: view?.socket?.path ?? null,
			tls: view?.socket?.tls ?? null,
			database: encodeDatabase(view?.database),
			username: credentials.username ?? null,
			password: credentials.password ?? null,
		};
	} catch (error: unknown) {
		return {
			error: error instanceof Error ? `${error.name}: ${error.message}` : "",
		};
	}
};

const clientOptionInputs: [string | undefined, string | undefined][] = [
	[undefined, undefined],
	[undefined, "root"],
	["", "root"],
	["", undefined],
	["redis://localhost:6379", "root"],
	["redis://localhost:6379", undefined],
	["redis://localhost:6379", ""],
	["redis://:root@localhost:6379", undefined],
	["redis://:fromurl@localhost:6379", "fromoption"],
	["redis://user@localhost:6379", "fromoption"],
	["redis://user:pass@localhost", "fromoption"],
	["redis://us%20er:p%40ss%2Fw@localhost", undefined],
	["redis://user:pa ss@localhost", undefined],
	["redis://u:%E2%9C%93@localhost", undefined],
	["redis://u:%zz@localhost", undefined],
	["redis://u:%E0%A4%A@localhost", undefined],
	["redis://u:%FF@localhost", undefined],
	["rediss://:secret@redis.internal:6380/2", undefined],
	["redis://redis.internal", undefined],
	["REDIS://HOST.Example:1/1", undefined],
	["redis://[::1]:6380", undefined],
	["redis://[2001:DB8::1]", undefined],
	["redis://[::ffff:1.2.3.4]", undefined],
	["redis://127.0.0.1:6379/0", undefined],
	["redis://host/15", undefined],
	["redis://host/02", undefined],
	["redis://host/2.5", undefined],
	["redis://host/-1", undefined],
	["redis://host/1e1", undefined],
	["redis://host/0x10", undefined],
	["redis://host/0b11", undefined],
	["redis://host/0o17", undefined],
	["redis://host/Infinity", undefined],
	["redis://host/abc", undefined],
	["redis://host/1/2", undefined],
	["redis://host/", undefined],
	["redis://host?db=3", undefined],
	["redis://host:0", undefined],
	["redis://host:00006379", undefined],
	["redis://host:65535", undefined],
	["redis://host:65536", undefined],
	["redis://hôst", undefined],
	["redis://ho%20st", undefined],
	["redis:host", undefined],
	["redis:///nohost", undefined],
	["http://localhost:6379", undefined],
	["not a url", undefined],
	["unix:///tmp/redis.sock", undefined],
	["unix:///tmp/redis.sock", "fromoption"],
	["unix://user:secret@/tmp/redis.sock?db=2", undefined],
	["unix://:secret@/var/run/redis%20x.sock", undefined],
	["unix:///tmp/redis.sock?db=", undefined],
	["unix:///tmp/redis.sock?db=+4", undefined],
	["unix:///tmp/redis.sock?db=x", undefined],
	["unix:///tmp/redis.sock?a=1&db=5&db=6", undefined],
	["unix:///tmp/redis.sock?db=%33", undefined],
	["unix:///tmp/redis.sock#frag", undefined],
	["unix:///", undefined],
	["unix://relative.sock", undefined],
	["unix://u@/tmp/s.sock", undefined],
];

const main = async (): Promise<void> => {
	const clientOptions: ClientOptionsVector[] = [];
	for (const [url, password] of clientOptionInputs) {
		clientOptions.push({
			url: url ?? null,
			password: password ?? null,
			result: await resolveClientOptions(url, password),
		});
	}

	const vectors = { indexes, redact, clientOptions };
	const out = fileURLToPath(new URL("./vectors.json", import.meta.url));
	writeFileSync(out, `${JSON.stringify(vectors, null, "\t")}\n`);
};

await main();
