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

// Records what mongoose 9.10.3 does with every schema in this package, into vectors.json, which
// equivalence.rs replays against the Rust: for seeded random inputs (shuffled key order,
// undeclared keys, every optional path present or absent, number edge cases, broken required,
// enum and bound constraints), either the validation errors `validateSync` reports, or the bytes
// mongoose hands the driver for `Model.create` and, for a schema with an `_id`, the bytes mongod
// then stores. Also each schema's declared indexes, and what `listIndexes` returns after
// mongoose's `ensureIndexes` on a real server.
//
// Needs a throwaway mongod: PROSOPO_EQUIVALENCE_MONGO_URL, e.g. mongodb://127.0.0.1:27999. The
// generator writes to, and then drops, the database `prosopo-equivalence-types-database`.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BSON, EJSON, Long, ObjectId } from "bson";
import mongoose, { type Schema, type SchemaType } from "mongoose";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}
const MONGO_URL = process.env.PROSOPO_EQUIVALENCE_MONGO_URL;
if (!MONGO_URL) {
	throw new Error("set PROSOPO_EQUIVALENCE_MONGO_URL to a throwaway mongod, e.g. mongodb://127.0.0.1:27999");
}
const DB_NAME = "prosopo-equivalence-types-database";

// Every id and time mongoose mints comes from these, so the Rust can mint the same ones.
const NOW_MS = 1_710_000_060_123;
const PROCESS_UNIQUE = Uint8Array.from([0xa1, 0xb2, 0xc3, 0xd4, 0xe5]);
Date.now = (): number => NOW_MS;
(mongoose as unknown as { now: () => Date }).now = (): Date => new Date(NOW_MS);
type ObjectIdStatics = { index: number; PROCESS_UNIQUE: Uint8Array | null };
const objectIdStatics = mongoose.mongo.ObjectId as unknown as ObjectIdStatics;
const resetIds = (): void => {
	objectIdStatics.index = 0;
	objectIdStatics.PROCESS_UNIQUE = PROCESS_UNIQUE;
};

// Imported after Date.now is pinned, so `default: Date.now` captures the pinned one.
const schemas = await import("../../src/index.js");

// The sub-schemas are compiled as models of their own from clones: compiling a model adds paths
// such as `__v` to its schema, and the originals are shared with the models above.
const MODELS: [string, Schema][] = [
	["Client", schemas.ClientRecordSchema],
	["Captcha", schemas.CaptchaRecordSchema],
	["PoWCaptcha", schemas.PoWCaptchaRecordSchema],
	["PuzzleCaptcha", schemas.PuzzleCaptchaRecordSchema],
	["IconOrderCaptcha", schemas.IconOrderCaptchaRecordSchema],
	["AudioCaptcha", schemas.AudioCaptchaRecordSchema],
	["UserCommitment", schemas.UserCommitmentRecordSchema],
	["Dataset", schemas.DatasetRecordSchema],
	["Solution", schemas.SolutionRecordSchema],
	["UserSolution", schemas.UserSolutionRecordSchema],
	["Scheduler", schemas.ScheduledTaskRecordSchema],
	["Session", schemas.SessionRecordSchema],
	["DecisionMachine", schemas.DecisionMachineArtifactRecordSchema],
	["ClientContextEntropy", schemas.ClientContextEntropyRecordSchema],
	["SpamEmailDomain", schemas.SpamEmailDomainRecordSchema],
	["BannedDomain", schemas.BannedDomainRecordSchema],
	["UserData", schemas.UserDataSchema],
	["Account", schemas.AccountSchema],
	["UserSettings", schemas.UserSettingsSchema.clone()],
	["IPValidationRules", schemas.IPValidationRulesSchema.clone()],
	["PuzzleRenderSettings", schemas.PuzzleRenderSettingsSchema.clone()],
	["AudioRenderSettings", schemas.AudioRenderSettingsSchema.clone()],
	["TrafficCategoryPolicy", schemas.TrafficCategoryPolicySchema.clone()],
	["StoredUserCommitment", schemas.StoredUserCommitmentRecordSchema],
	["StoredPoWCaptcha", schemas.StoredPoWCaptchaRecordSchema],
	["StoredPuzzleCaptcha", schemas.StoredPuzzleCaptchaRecordSchema],
	["StoredAudioCaptcha", schemas.StoredAudioCaptchaRecordSchema],
	["StoredIconOrderCaptcha", schemas.StoredIconOrderCaptchaRecordSchema],
];
const VECTORS_PER_MODEL = 120;

let seed = 0x9e3779b9;
const random = (): number => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const chance = (p: number): boolean => random() < p;
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
const shuffled = <T>(items: T[]): T[] => {
	const out: T[] = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j: number = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j] as T, out[i] as T];
	}
	return out;
};

const NUMBERS: number[] = [
	0, -0, 1, -1, 7, 0.5, -2.25, 255, 65535, 2147483647, 2147483648, -2147483648, -2147483649, 1.7e12,
	9007199254740993, 1e21, 1e300, 5e-324, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.1 + 0.2,
];
const STRINGS: string[] = ["", "a", "héllo wörld", "💥 emoji", "x".repeat(40), "1", "$dollar", "dot.ted", "null"];
const DATES: number[] = [0, 1, -1, 1_700_000_000_000, 8.64e15, -8.64e15, 1_234_567.891];
const OBJECT_IDS: string[] = ["65f0a1b2c3d4e5f601234567", "000000000000000000000000", "ffffffffffffffffffffffff"];
const MIXED_KEYS: string[] = ["a", "b", "1", "0", "z", "key with space", "_", "10", "isVPN", "countryCode"];
const IP_HALVES: bigint[] = [0n, 1n, 16909060n, 2n ** 32n - 1n, 2n ** 63n + 5n, 2n ** 64n - 1n];

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const mixed = (depth: number): unknown => {
	const roll: number = random();
	if (depth >= 3 || roll < 0.45) {
		return pick<unknown>([pick(NUMBERS), pick(STRINGS), true, false, null]);
	}
	if (roll < 0.75) {
		const out: Record<string, unknown> = {};
		const count: number = Math.floor(random() * 4);
		for (let i = 0; i < count; i++) {
			out[pick(MIXED_KEYS)] = mixed(depth + 1);
		}
		return out;
	}
	return Array.from({ length: Math.floor(random() * 3) }, () => mixed(depth + 1));
};

const boundsOf = (type: SchemaType): { min?: number; max?: number } => {
	const options = type.options as { min?: number; max?: number };
	return { min: options.min, max: options.max };
};

const numberFor = (type: SchemaType): number => {
	const { min, max } = boundsOf(type);
	if (min !== undefined || max !== undefined) {
		const low: number = min ?? (max as number) - 10;
		const high: number = max ?? low + 10;
		return pick([low, high, low + (high - low) * random(), Math.round(low + (high - low) * random())]);
	}
	return pick(NUMBERS);
};

const outOfBounds = (type: SchemaType): number => {
	const { min, max } = boundsOf(type);
	return min !== undefined && (max === undefined || chance(0.5)) ? (min as number) - pick([1e-9, 1, 1000]) : (max as number) + pick([1e-9, 1, 1000]);
};

const ipHalf = (): unknown => {
	const value: bigint = pick(IP_HALVES);
	const roll: number = random();
	if (roll < 0.5) return value;
	if (roll < 0.7) return Long.fromBigInt(value, true);
	if (roll < 0.85) return value.toString();
	return Number(value % 1000n);
};

type ArrayType = SchemaType & { embeddedSchemaType: SchemaType };
type NestedSchemaType = SchemaType & { schema: Schema };
type MapType = SchemaType & { $__schemaType: SchemaType };

const valueFor = (type: SchemaType, depth: number): unknown => {
	switch (type.instance) {
		case "String": {
			const values: string[] = (type as unknown as { enumValues: string[] }).enumValues ?? [];
			if (values.length > 0) return pick(values);
			return type.isRequired ? pick(STRINGS.filter((value) => value !== "")) : pick(STRINGS);
		}
		case "Number":
			return numberFor(type);
		case "Boolean":
			return chance(0.5);
		case "Date":
			return new Date(pick(DATES));
		case "ObjectId":
			return new ObjectId(pick(OBJECT_IDS));
		case "Mixed":
			return type.isRequired ? Object.fromEntries([[pick(MIXED_KEYS), mixed(1)]]) : mixed(0);
		case "Decimal128":
			return ipHalf();
		case "Embedded":
			return chance(0.04) ? {} : document((type as NestedSchemaType).schema, depth + 1);
		case "Map": {
			const out: Record<string, unknown> = {};
			const count: number = Math.floor(random() * 3);
			const valueType: SchemaType = (type as MapType).$__schemaType;
			for (let i = 0; i < count; i++) {
				out[pick(["GB", "US", "1", "fr"])] = valueFor(valueType, depth + 1);
			}
			return out;
		}
		case "Array": {
			const length: number = Math.floor(random() * 4);
			if ((type as unknown as { $isMongooseDocumentArray?: boolean }).$isMongooseDocumentArray) {
				const schema: Schema = (type as NestedSchemaType).schema;
				return Array.from({ length }, () => document(schema, depth + 1));
			}
			const element: SchemaType = (type as ArrayType).embeddedSchemaType;
			return Array.from({ length }, () => valueFor(element, depth + 1));
		}
		default:
			throw new Error(`unhandled schema type ${type.instance} at ${type.path}`);
	}
};

const setPath = (target: Record<string, unknown>, path: string, value: unknown): void => {
	const pieces: string[] = path.split(".");
	let cursor: Record<string, unknown> = target;
	for (const piece of pieces.slice(0, -1)) {
		if (typeof cursor[piece] !== "object" || cursor[piece] === null) cursor[piece] = {};
		cursor = cursor[piece] as Record<string, unknown>;
	}
	cursor[pieces[pieces.length - 1] as string] = value;
};

const shuffleKeys = (value: Record<string, unknown>): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const key of shuffled(Object.keys(value))) {
		const inner: unknown = value[key];
		const plain: boolean = typeof inner === "object" && inner !== null && Object.getPrototypeOf(inner) === Object.prototype;
		out[key] = plain ? shuffleKeys(inner as Record<string, unknown>) : inner;
	}
	return out;
};

// A random object for the schema: each path present or absent, nested paths sometimes given
// empty, undeclared keys sometimes added, and the keys sometimes shuffled.
function document(schema: Schema, depth: number): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [path, type] of Object.entries(schema.paths)) {
		if (path.includes("$*")) continue;
		if (path === "_id") {
			if (chance(0.4)) out._id = new ObjectId(pick(OBJECT_IDS));
			continue;
		}
		if (type.isRequired || chance(depth > 0 ? 0.4 : 0.55)) setPath(out, path, chance(0.03) ? undefined : valueFor(type, depth));
	}
	for (const nested of Object.keys((schema as unknown as { nested: Record<string, boolean> }).nested)) {
		const hasRequired: boolean = Object.entries(schema.paths).some(([path, type]) => path.startsWith(`${nested}.`) && type.isRequired);
		if (!hasRequired && chance(0.08)) setPath(out, nested, {});
	}
	if (chance(0.2)) out.undeclaredKey = pick(STRINGS);
	return chance(0.5) ? shuffleKeys(out) : out;
}

const deletePath = (target: Record<string, unknown>, path: string): void => {
	const pieces: string[] = path.split(".");
	let cursor: unknown = target;
	for (const piece of pieces.slice(0, -1)) {
		cursor = (cursor as Record<string, unknown> | undefined)?.[piece];
		if (typeof cursor !== "object" || cursor === null) return;
	}
	delete (cursor as Record<string, unknown>)[pieces[pieces.length - 1] as string];
};

const innermost = (type: SchemaType): SchemaType =>
	type.instance === "Array" ? innermost((type as ArrayType).embeddedSchemaType) : type;

// An array shaped like the path's, with one string outside the enum among valid ones.
const nestBadElement = (type: SchemaType): unknown => {
	const element: SchemaType = (type as ArrayType).embeddedSchemaType;
	if (element.instance === "Array") return [valueFor(element, 1), nestBadElement(element)];
	const values: string[] = (element as unknown as { enumValues: string[] }).enumValues;
	return [pick(values), "not-in-the-enum", pick(values)];
};

// Breaks one constraint at the top level of a valid input: a required path dropped, an enum
// given a value outside it (in an array of strings too), or a bounded number pushed past its
// bound.
const breakOne = (schema: Schema, input: Record<string, unknown>): void => {
	const candidates: [string, SchemaType, string][] = [];
	for (const [path, type] of Object.entries(schema.paths)) {
		if (path.includes("$*") || path === "_id") continue;
		if (type.isRequired) candidates.push([path, type, "required"]);
		if (((type as unknown as { enumValues?: string[] }).enumValues ?? []).length > 0) candidates.push([path, type, "enum"]);
		const { min, max } = boundsOf(type);
		if (type.instance === "Number" && (min !== undefined || max !== undefined)) candidates.push([path, type, "bound"]);
		if (type.instance === "Array" && (innermost(type) as unknown as { enumValues?: string[] }).enumValues?.length) {
			candidates.push([path, type, "elementEnum"]);
		}
	}
	if (candidates.length === 0) return;
	const kind: string = pick([...new Set(candidates.map(([, , how]) => how))]);
	const [path, type, how] = pick(candidates.filter(([, , candidate]) => candidate === kind));
	if (how === "required") {
		if (type.instance === "String" && chance(0.3)) setPath(input, path, "");
		else deletePath(input, path);
	}
	else if (how === "enum") setPath(input, path, "not-in-the-enum");
	else if (how === "elementEnum") setPath(input, path, nestBadElement(type));
	else setPath(input, path, outOfBounds(type));
};

// The input, as the Rust reads it: canonical extended JSON, with a bigint IP half (which the
// setter turns into its decimal string) written as that Decimal128, and an unsigned Long as the
// signed one with the same bits (canonical extended JSON has no unsigned Long; the setter reads
// the bits as unsigned either way). An undefined value, which mongoose treats unlike both null and
// a missing key, becomes BSON's own undefined (`{"$undefined": true}`); bson's extended JSON would
// otherwise write it as null.
const UNDEFINED_MARKER = Object.freeze({ undefinedMarker: true });

const toRustInput = (value: unknown): unknown => {
	if (value === undefined) return UNDEFINED_MARKER;
	if (typeof value === "bigint") return mongoose.mongo.BSON.Decimal128.fromString(value.toString());
	if (value instanceof Long) return Long.fromBits(value.low, value.high, false);
	if (Array.isArray(value)) return value.map(toRustInput);
	if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype) {
		return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, toRustInput(inner)]));
	}
	return value;
};

const toHex = (bytes: Uint8Array): string => Buffer.from(bytes).toString("hex");

const toJson = (value: unknown): Json =>
	JSON.parse(
		EJSON.stringify(value, { relaxed: false }).replaceAll('{"undefinedMarker":true}', '{"$undefined":true}'),
	) as Json;

const kindOf = (type: SchemaType): string => {
	if ((type as unknown as { $isMongooseDocumentArray?: boolean }).$isMongooseDocumentArray) return "DocumentArray";
	if (type.instance === "Array") return `Array<${kindOf((type as ArrayType).embeddedSchemaType)}>`;
	return type.instance;
};

// How mongoose itself sees a schema: its top-level keys, nested paths and every path with its
// kind, constraints, when its default applies and, for a subdocument, its own schema.
const describe = (schema: Schema): Json => {
	const paths: Json[] = Object.entries(schema.paths).map(([path, type]): Json => {
		const options = type.options as { min?: number; max?: number; expires?: number | string; unique?: boolean; index?: unknown };
		const defaultValue: unknown = (type as unknown as { defaultValue: unknown }).defaultValue;
		const timing: string =
			defaultValue === undefined
				? "none"
				: typeof defaultValue === "function"
					? (defaultValue as { $runBeforeSetters?: boolean }).$runBeforeSetters
						? "before"
						: "after"
					: "value";
		const element: SchemaType | undefined =
			type.instance === "Array" ? (type as ArrayType).embeddedSchemaType : type.instance === "Map" ? (type as MapType).$__schemaType : undefined;
		const enumValues: string[] =
			(type as unknown as { enumValues?: string[] }).enumValues ?? (element as unknown as { enumValues?: string[] } | undefined)?.enumValues ?? [];
		const subschema: Schema | undefined = (type as Partial<NestedSchemaType>).schema ?? (element as Partial<NestedSchemaType> | undefined)?.schema;
		return {
			path,
			kind: kindOf(type),
			required: type.isRequired,
			enumValues: enumValues.length > 0 ? enumValues : null,
			min: options.min ?? null,
			max: options.max ?? null,
			default: timing,
			expires: options.expires ?? null,
			unique: options.unique ?? null,
			schema: subschema ? describe(subschema) : null,
		};
	});
	return {
		tree: Object.keys(schema.tree),
		nested: Object.keys((schema as unknown as { nested: Record<string, boolean> }).nested),
		timestamps: Boolean(schema.options.timestamps),
		paths,
	};
};

const SAVE_TO_OBJECT = {
	transform: false,
	virtuals: false,
	getters: false,
	_skipDepopulateTopLevel: true,
	depopulate: true,
	flattenDecimals: false,
	useProjection: false,
	versionKey: true,
	flattenObjectIds: false,
	flattenUUIDs: false,
	bson: true,
};

type Outcome = { errors: [string, string][] } | { sent: string; stored?: string };
type Vector = { input: Json; outcome: Outcome };

const connection = await mongoose.createConnection(MONGO_URL, { dbName: DB_NAME, monitorCommands: true }).asPromise();
let lastCommand: { name: string; command: Record<string, unknown> } | null = null;
connection.getClient().on("commandStarted", (event) => {
	if (["update", "findAndModify"].includes(event.commandName)) {
		lastCommand = { name: event.commandName, command: event.command as Record<string, unknown> };
	}
});
const db = connection.db;
if (!db) throw new Error("no database handle");
await db.dropDatabase();
const buildInfo = (await db.admin().command({ buildInfo: 1 })) as { version: string };

const errorsOf = (error: mongoose.Error.ValidationError): [string, string][] =>
	Object.entries(error.errors)
		.map(([path, inner]): [string, string] => [path, (inner as { kind: string }).kind])
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

// A filter of one of the shapes the database code uses, on a random declared path.
const randomFilter = (schema: Schema): Record<string, unknown> => {
	const isPrimitiveArray = (type: SchemaType): boolean =>
		type.instance === "Array" && !(type as unknown as { $isMongooseDocumentArray?: boolean }).$isMongooseDocumentArray;
	const paths: [string, SchemaType][] = Object.entries(schema.paths).filter(
		([path, type]) =>
			!path.includes("$*") && path !== "__v" && (isPrimitiveArray(type) || !["Embedded", "Array", "Map", "Mixed"].includes(type.instance)),
	);
	const roll: number = random();
	if (roll < 0.15 || paths.length === 0) return {};
	const [path, type] = pick(paths);
	// An array path is queried by one of its elements, as `{ tags: "a" }` is.
	const valueType: SchemaType = isPrimitiveArray(type) ? innermost(type) : type;
	const value: unknown = path === "_id" ? pick(OBJECT_IDS) : valueFor(valueType, 1);
	if (roll < 0.55) return { [path]: value };
	if (roll < 0.65) return { [path]: { $ne: true } };
	if (roll < 0.75) return { [path]: { $in: [value, path === "_id" ? pick(OBJECT_IDS) : valueFor(valueType, 1)] } };
	if (roll < 0.85) return { [path]: { $exists: pick<unknown>([false, true, 0, 1, "", "yes"]) } };
	if (roll < 0.92) return { [path]: { $lte: value } };
	return { [path]: value, "not.declared": "x" };
};

// A partial record: some of a random document's top-level keys, sometimes one left undefined.
const partial = (schema: Schema): Record<string, unknown> => {
	const full: Record<string, unknown> = document(schema, 0);
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(full)) {
		if (key !== "_id" && chance(0.45)) out[key] = chance(0.05) ? undefined : value;
	}
	if (chance(0.15)) out.undeclaredKey = "x";
	return out;
};

const randomUpdate = (schema: Schema): Record<string, unknown> => {
	const set: Record<string, unknown> = partial(schema);
	const roll: number = random();
	if (roll < 0.5) return { $set: set };
	if (roll < 0.65) return set;
	const leaves: string[] = Object.keys(schema.paths).filter((path) => !path.includes("$*") && path !== "_id" && path !== "__v");
	if (roll < 0.82) {
		const path: string = pick(leaves);
		return { $set: set, $setOnInsert: { [path]: valueFor(schema.paths[path] as SchemaType, 1) } };
	}
	return { $set: set, $unset: { [pick(leaves)]: 1 } };
};

type UpdateVector = {
	method: string;
	upsert: boolean;
	filter: Json;
	update: Json;
	outcome: { sent: Json } | { notSent: true } | { error: string };
};

const runUpdate = async (Model: mongoose.Model<unknown>, method: string, filter: Record<string, unknown>, update: Record<string, unknown>, upsert: boolean): Promise<void> => {
	if (method === "updateOne") await Model.updateOne(filter, update, { upsert });
	else if (method === "updateMany") await Model.updateMany(filter, update, { upsert });
	else if (method === "bulkWrite") await Model.bulkWrite([{ updateOne: { filter, update, upsert } }]);
	else await Model.findOneAndUpdate(filter, update, { upsert }).lean();
};

const UPDATES_PER_MODEL = 80;

const models: Record<string, { schema: Json; vectors: Vector[]; updates: UpdateVector[]; declaredIndexes: Json; serverIndexes: Json }> = {};
for (const [name, schema] of MODELS) {
	const Model = connection.model(name, schema, `eq_${name.toLowerCase()}`);
	const hasId: boolean = schema.path("_id") !== undefined;
	const vectors: Vector[] = [];
	for (let i = 0; i < VECTORS_PER_MODEL; i++) {
		const input: Record<string, unknown> = document(schema, 0);
		if (chance(0.25)) breakOne(schema, input);
		resetIds();
		const doc = new Model(input);
		const invalid = await doc.validate().then(
			() => null,
			(error: unknown) => error as mongoose.Error.ValidationError,
		);
		const rustInput: Json = toJson(toRustInput(input));
		if (invalid) {
			vectors.push({ input: rustInput, outcome: { errors: errorsOf(invalid) } });
			continue;
		}
		if (!hasId) {
			const sent = doc.toObject(SAVE_TO_OBJECT) as Record<string, unknown>;
			sent.__v = 0;
			vectors.push({ input: rustInput, outcome: { sent: toHex(BSON.serialize(sent)) } });
			continue;
		}
		let sentBytes = "";
		const collection = Model.collection as unknown as { insertOne: (doc: object, options: object) => Promise<unknown> };
		const insertOne = collection.insertOne.bind(collection);
		collection.insertOne = (sent: object, options: object): Promise<unknown> => {
			sentBytes = toHex(mongoose.mongo.BSON.serialize(sent, { ignoreUndefined: false }));
			return insertOne(sent, options);
		};
		try {
			await doc.save();
		} finally {
			collection.insertOne = insertOne;
		}
		const stored = (await db.collection(Model.collection.name).findOne({ _id: doc._id }, { raw: true })) as unknown as Uint8Array;
		await db.collection(Model.collection.name).deleteMany({});
		vectors.push({ input: rustInput, outcome: { sent: sentBytes, stored: toHex(stored) } });
	}
	const updates: UpdateVector[] = [];
	if (hasId) {
		for (let i = 0; i < UPDATES_PER_MODEL; i++) {
			const filter: Record<string, unknown> = randomFilter(schema);
			const update: Record<string, unknown> = randomUpdate(schema);
			const method: string = pick(["updateOne", "updateMany", "bulkWrite", "findOneAndUpdate"]);
			const upsert: boolean = chance(0.5);
			const recorded = {
				method,
				upsert,
				filter: toJson(toRustInput(filter)),
				update: toJson(toRustInput(update)),
			};
			resetIds();
			lastCommand = null;
			let thrown: string | null = null;
			try {
				await runUpdate(Model as unknown as mongoose.Model<unknown>, method, filter, update, upsert);
			} catch (error) {
				thrown = error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : String(error);
			}
			const captured = lastCommand as { name: string; command: Record<string, unknown> } | null;
			if (captured) {
				const command = captured.command;
				const statement =
					captured.name === "findAndModify"
						? { q: command.query, u: command.update }
						: { q: (command.updates as Record<string, unknown>[])[0]?.q, u: (command.updates as Record<string, unknown>[])[0]?.u };
				updates.push({ ...recorded, outcome: { sent: { hex: toHex(mongoose.mongo.BSON.serialize(statement, { ignoreUndefined: false })) } } });
			} else if (thrown) {
				updates.push({ ...recorded, outcome: { error: thrown } });
			} else {
				updates.push({ ...recorded, outcome: { notSent: true } });
			}
			await db.collection(Model.collection.name).deleteMany({});
		}
	}
	const declaredIndexes: Json = JSON.parse(EJSON.stringify(schema.indexes(), { relaxed: false })) as Json;
	let serverIndexes: Json = null;
	if (hasId) {
		await Model.ensureIndexes();
		const listed = await db.collection(Model.collection.name).listIndexes().toArray();
		serverIndexes = JSON.parse(EJSON.stringify(listed, { relaxed: false })) as Json;
	}
	models[name] = { schema: describe(schema), vectors, updates, declaredIndexes, serverIndexes };
}
// Filters on a path inside a document array, as `{ "sites.updatedAt": ... }`, cast as mongoose
// casts a query's conditions. Drawn after everything else, so the vectors above keep their draws.
type SubpathFilter = { model: string; filter: Json; outcome: { cast: Json } | { error: string } };
const subpathFilters: SubpathFilter[] = [];
for (const [name, schema] of MODELS) {
	const Model = connection.model(name);
	for (const [arrayPath, arrayType] of Object.entries(schema.paths)) {
		const inner = (arrayType as unknown as { $isMongooseDocumentArray?: boolean; schema?: Schema }).$isMongooseDocumentArray
			? (arrayType as unknown as { schema: Schema }).schema
			: undefined;
		if (!inner) continue;
		for (const [leaf, leafType] of Object.entries(inner.paths)) {
			if (leaf.includes("$*") || ["Embedded", "Array", "Map", "Mixed"].includes(leafType.instance)) continue;
			const value: unknown = valueFor(leafType, 1);
			for (const filter of [
				{ [`${arrayPath}.${leaf}`]: value },
				{ [`${arrayPath}.${leaf}`]: { $gt: value } },
				{ [`${arrayPath}.0.${leaf}`]: value },
				{ $or: [{ [`${arrayPath}.${leaf}`]: { $exists: false } }, { [`${arrayPath}.${leaf}`]: { $in: [value] } }] },
			]) {
				const recorded = toJson(toRustInput(filter));
				try {
					const query = Model.find(filter);
					query.cast(Model);
					subpathFilters.push({
						model: name,
						filter: recorded,
						outcome: { cast: { hex: toHex(mongoose.mongo.BSON.serialize(query.getFilter(), { ignoreUndefined: false })) } },
					});
				} catch (error) {
					subpathFilters.push({ model: name, filter: recorded, outcome: { error: error instanceof Error ? error.name : String(error) } });
				}
			}
		}
	}
}

await db.dropDatabase();
await connection.close();

const out = {
	mongoose: mongoose.version,
	mongod: buildInfo.version,
	nowMs: NOW_MS,
	processUnique: toHex(PROCESS_UNIQUE),
	sessionProjection: JSON.parse(EJSON.stringify(schemas.SESSION_PROJECTION, { relaxed: false })) as Json,
	models,
	subpathFilters,
};
writeFileSync(fileURLToPath(new URL("./vectors.json", import.meta.url)), `${JSON.stringify(out)}\n`);
const counts: string = Object.entries(models)
	.map(([name, { vectors, updates }]) => `${name}: ${vectors.filter((v) => "errors" in v.outcome).length} invalid / ${vectors.length}, ${updates.filter((u) => "error" in u.outcome).length} refused, ${updates.filter((u) => "notSent" in u.outcome).length} not sent / ${updates.length} updates`)
	.join(", ");
console.log(`wrote vectors.json (${counts}; ${subpathFilters.length} document-array filters)`);
