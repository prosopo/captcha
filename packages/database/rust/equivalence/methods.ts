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

// Records what ProviderDatabase's methods send to mongod and return, into methods.json, which
// methods.rs replays against the Rust: for each scripted call, the arguments, every command sent
// (the fields that decide what it does, not session bookkeeping), and the result or the error.
// Time and Math.random are pinned, and every random number drawn is recorded so the Rust can draw
// the same ones.
//
// Needs a throwaway mongod: PROSOPO_EQUIVALENCE_MONGO_URL, e.g. mongodb://127.0.0.1:27999. The
// generator writes to, and then drops, the database `prosopo-equivalence-database-methods`.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BSON, EJSON } from "bson";
import mongoose from "mongoose";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}
const MONGO_URL = process.env.PROSOPO_EQUIVALENCE_MONGO_URL;
if (!MONGO_URL) {
	throw new Error("set PROSOPO_EQUIVALENCE_MONGO_URL to a throwaway mongod, e.g. mongodb://127.0.0.1:27999");
}
const DB_NAME = "prosopo-equivalence-database-methods";

const NOW_MS = 1_710_000_060_123;
const RealDate = Date;
class PinnedDate extends RealDate {
	constructor(...args: ConstructorParameters<typeof Date> | []) {
		if (args.length === 0) super(NOW_MS);
		else super(...(args as ConstructorParameters<typeof Date>));
	}
	static override now(): number {
		return NOW_MS;
	}
}
// mongoose maps a schema's `Date` by the constructor's name.
Object.defineProperty(PinnedDate, "name", { value: "Date" });
globalThis.Date = PinnedDate as unknown as DateConstructor;

let randomSeed = 0x1234abcd;
let drawn: number[] = [];
Math.random = (): number => {
	randomSeed = (Math.imul(randomSeed ^ (randomSeed >>> 15), 0x2c1b3c6d) + 0x9e3779b9) | 0;
	const value: number = ((randomSeed >>> 0) % 1_000_000) / 1_000_000;
	drawn.push(value);
	return value;
};

// Every connection the database opens reports the commands it sends.
const createConnection = mongoose.createConnection.bind(mongoose);
(mongoose as unknown as { createConnection: unknown }).createConnection = (
	uri: string,
	options: mongoose.ConnectOptions,
): mongoose.Connection => createConnection(uri, { ...options, monitorCommands: true });

const { ProviderDatabase } = await import("../../src/databases/provider.js");
const { MongoDatabase } = await import("../../src/base/mongo.js");
const { getLogger } = await import("@prosopo/logger");

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const toJson = (value: unknown): Json => JSON.parse(EJSON.stringify(value, { relaxed: false })) as Json;

// The parts of a command that decide what it does, by command.
const RELEVANT: Record<string, string[]> = {
	find: ["find", "filter", "projection", "sort", "limit", "hint", "skip"],
	aggregate: ["aggregate", "pipeline"],
	update: ["update", "updates"],
	insert: ["insert", "documents"],
	delete: ["delete", "deletes"],
	findAndModify: ["findAndModify", "query", "update", "new", "upsert", "fields", "remove"],
	count: ["count", "query"],
	getMore: ["getMore", "collection"],
};

type Command = { name: string; hex: string; json: Json; reply?: { hex: string; json: Json } };
let commands: Command[] = [];
const pending = new Map<number, Command>();
// The parts of a reply the methods read: the documents a cursor returns, and the counts.
const REPLY_FIELDS: string[] = ["cursor", "n", "nModified", "upserted", "value", "lastErrorObject"];
const silent = getLogger("error", "equivalence");
const db = new ProviderDatabase({ mongo: { url: MONGO_URL, dbname: DB_NAME }, logger: silent });
await MongoDatabase.prototype.connect.call(db);
db.loadTables();
const connection = db.getConnection();
connection.getClient().on("commandStarted", (event) => {
	const fields: string[] | undefined = RELEVANT[event.commandName];
	if (!fields) return;
	const kept: Record<string, unknown> = {};
	for (const field of fields) {
		if (field in event.command) kept[field] = (event.command as Record<string, unknown>)[field];
	}
	try {
		const bytes: Uint8Array = BSON.serialize(kept);
		const command: Command = {
			name: event.commandName,
			hex: Buffer.from(bytes).toString("hex"),
			json: toJson(BSON.deserialize(bytes, { promoteValues: false })),
		};
		commands.push(command);
		pending.set(event.requestId, command);
	} catch (error) {
		commands.push({ name: event.commandName, hex: "", json: { unrecordable: String(error) } });
	}
});
connection.getClient().on("commandSucceeded", (event) => {
	const command: Command | undefined = pending.get(event.requestId);
	if (!command) return;
	pending.delete(event.requestId);
	const reply: Record<string, unknown> = {};
	for (const field of REPLY_FIELDS) {
		if (field in (event.reply as Record<string, unknown>)) reply[field] = (event.reply as Record<string, unknown>)[field];
	}
	const bytes: Uint8Array = BSON.serialize(reply);
	command.reply = { hex: Buffer.from(bytes).toString("hex"), json: toJson(BSON.deserialize(bytes, { promoteValues: false })) };
});
await connection.db?.dropDatabase();

const collectionNames: Record<string, string> = Object.fromEntries(
	Object.entries(db.getTables()).map(([table, model]) => [table, (model as mongoose.Model<unknown>).collection.name]),
);

type Scenario = { group: string; name: string; method: string; args: Json; random: number[]; commands: Command[]; result?: Json; error?: Json };
const scenarios: Scenario[] = [];

const describeError = (error: unknown): Json => {
	const e = error as { name?: string; message?: string; translationKey?: string; context?: { error?: { message?: string } } };
	return {
		name: e?.name ?? null,
		message: e?.message ?? String(error),
		translationKey: e?.translationKey ?? null,
		cause: e?.context?.error?.message ?? null,
	};
};

// Runs one call: the commands it sends and what it returns are recorded under `name`.
const record = async (group: string, name: string, method: string, args: unknown[]): Promise<void> => {
	commands = [];
	drawn = [];
	const scenario: Scenario = { group, name, method, args: toJson(args), random: [], commands: [] };
	try {
		const result: unknown = await (db as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method](...args);
		scenario.result = toJson(result === undefined ? null : result);
	} catch (error) {
		scenario.error = describeError(error);
	}
	await new Promise<void>((resolve) => setTimeout(resolve, 20));
	scenario.commands = [...commands];
	scenario.random = drawn;
	scenarios.push(scenario);
};

// A change made straight on the database between calls, recorded so a live test can make it too.
const setup = async (group: string, name: string, change: () => Promise<unknown>): Promise<void> => {
	commands = [];
	drawn = [];
	await change();
	await new Promise<void>((resolve) => setTimeout(resolve, 20));
	scenarios.push({ group, name, method: "__setup", args: [], random: [], commands: [...commands] });
};

const hex = (n: number): string => `0x${n.toString(16).padStart(64, "0")}`;
const datasetId: string = hex(0xd1);
const dataset = {
	datasetId,
	datasetContentId: hex(0xdc),
	format: "SelectAll",
	contentTree: [[hex(1), hex(2)], [hex(3)]],
	solutionTree: [[hex(4), hex(5)], [hex(6)]],
	captchas: [0, 1, 2, 3, 4, 5].map((i) => ({
		captchaId: hex(0x100 + i),
		captchaContentId: hex(0x200 + i),
		salt: `0x${"ab".repeat(16)}${i}`,
		items: [
			{ hash: hex(0x300 + i), data: `https://example.com/${i}.png`, type: "image" },
			{ hash: hex(0x400 + i), data: `https://example.com/${i}b.png`, type: "image" },
		],
		target: i % 2 === 0 ? "bus" : "car",
		...(i < 4 ? { solution: [hex(0x300 + i)] } : {}),
	})),
};

// Group 1: datasets, captchas and solutions.
await record("datasets", "store a dataset", "storeDataset", [dataset]);
await record("datasets", "store the same dataset again", "storeDataset", [dataset]);
await record("datasets", "store an invalid dataset", "storeDataset", [{ ...dataset, contentTree: "nope" }]);
await record("datasets", "solutions of the dataset", "getSolutions", [datasetId]);
await record("datasets", "solutions of an unknown dataset", "getSolutions", [hex(0xee)]);
await record("datasets", "a solution by captcha id", "getSolutionByCaptchaId", [hex(0x101)]);
await record("datasets", "a missing solution", "getSolutionByCaptchaId", [hex(0x1ff)]);
await record("datasets", "the dataset", "getDataset", [datasetId]);
// A solution stored for a captcha that is not solved is not returned with it.
await setup("datasets", "a stray solution", () =>
	db.getTables().solution.collection.insertOne({
		_id: new mongoose.Types.ObjectId("65f0a1b2c3d4e5f6000000ff"),
		captchaId: hex(0x104),
		captchaContentId: hex(0x204),
		datasetId,
		datasetContentId: hex(0xdc),
		salt: "0xstray",
		solution: [hex(0x304)],
	}),
);
await record("datasets", "the dataset with a stray solution", "getDataset", [datasetId]);
await record("datasets", "a missing dataset", "getDataset", [hex(0xee)]);
await record("datasets", "dataset details", "getDatasetDetails", [datasetId]);
await record("datasets", "details of a non-hex id", "getDatasetDetails", ["not-hex"]);
await record("datasets", "details of a missing dataset", "getDatasetDetails", [hex(0xee)]);
await record("datasets", "the most recent dataset id", "getMostRecentDatasetId", []);
for (const [solved, size] of [[true, 2], [false, 1], [true, undefined], [true, 10], [false, -2.7]] as const) {
	await record("datasets", `random captchas solved=${solved} size=${size}`, "getRandomCaptcha", [solved, datasetId, size]);
}
await record("datasets", "random captchas of a non-hex id", "getRandomCaptcha", [true, "nope", 1]);
await record("datasets", "random captchas of a missing dataset", "getRandomCaptcha", [true, hex(0xee), 1]);
await record("datasets", "captchas by id", "getCaptchaById", [[hex(0x100), hex(0x105), hex(0x1ff)]]);
await record("datasets", "no captchas by id", "getCaptchaById", [[hex(0x1ff)]]);
await record("datasets", "solved captchas of the dataset", "getAllCaptchasByDatasetId", [datasetId, "solved"]);
await record("datasets", "unsolved captchas of the dataset", "getAllCaptchasByDatasetId", [datasetId, "unsolved"]);
await record("datasets", "captchas without a state", "getAllCaptchasByDatasetId", [datasetId]);
await record("datasets", "a dataset with enough solutions", "getDatasetIdWithSolvedCaptchasOfSizeN", [4]);
await record("datasets", "no dataset with enough solutions", "getDatasetIdWithSolvedCaptchasOfSizeN", [99]);
await record("datasets", "random solved captchas", "getRandomSolvedCaptchasFromSingleDataset", [datasetId, 2]);
await record("datasets", "random solved captchas of a non-hex id", "getRandomSolvedCaptchasFromSingleDataset", ["nope", 2]);
await record("datasets", "random solved captchas of a missing dataset", "getRandomSolvedCaptchasFromSingleDataset", [hex(0xee), 2]);
await record("datasets", "remove two captchas", "removeCaptchas", [[hex(0x104), hex(0x105)]]);
// Captchas stored before `randomKey` existed are only found by the `$sample` fallback.
await setup("datasets", "captchas without random keys", () =>
	db.getTables().captcha.collection.updateMany({}, { $unset: { randomKey: "" } }),
);
await record("datasets", "random captchas without random keys", "getRandomCaptcha", [true, datasetId, 2]);

await connection.db?.dropDatabase();
await db.close();

writeFileSync(
	fileURLToPath(new URL("./methods.json", import.meta.url)),
	`${JSON.stringify({ nowMs: NOW_MS, collections: collectionNames, scenarios })}\n`,
);
console.log(`wrote methods.json (${scenarios.length} scenarios, ${scenarios.reduce((n, s) => n + s.commands.length, 0)} commands)`);
