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

// New ids come from the pinned time, fixed process bytes and a counter reset before each call,
// so the Rust can mint the same ones.
const PROCESS_UNIQUE = Uint8Array.from([0xa1, 0xb2, 0xc3, 0xd4, 0xe5]);
type ObjectIdStatics = { index: number; PROCESS_UNIQUE: Uint8Array | null };
const resetIds = (): void => {
	const statics = mongoose.mongo.ObjectId as unknown as ObjectIdStatics;
	statics.index = 0;
	statics.PROCESS_UNIQUE = PROCESS_UNIQUE;
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
	dropIndexes: ["dropIndexes", "index"],
	createIndexes: ["createIndexes", "indexes"],
};

type Command = { name: string; hex: string; json: Json; reply?: { hex: string; json: Json } };
let commands: Command[] = [];
const pending = new Map<number, Command>();
// The parts of a reply the methods read: the documents a cursor returns, and the counts.
const REPLY_FIELDS: string[] = ["cursor", "n", "nModified", "upserted", "value", "lastErrorObject"];
const silent = getLogger("error", "equivalence");
const db = new ProviderDatabase({ mongo: { url: MONGO_URL, dbname: DB_NAME }, logger: silent });
await MongoDatabase.prototype.connect.call(db);
const connection = db.getConnection();
connection.getClient().on("commandStarted", (event) => {
	const fields: string[] | undefined = RELEVANT[event.commandName];
	if (!fields) return;
	const kept: Record<string, unknown> = {};
	for (const field of fields) {
		if (field in event.command) kept[field] = (event.command as Record<string, unknown>)[field];
	}
	try {
		// As the driver serialises a command: an undefined value goes on the wire as null.
		const bytes: Uint8Array = BSON.serialize(kept, { ignoreUndefined: false });
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
resetIds();

let collectionNames: Record<string, string> = {};

// A bigint argument (an IP half) is recorded as its decimal string, which the Rust reads as one.
const toRecordable = (value: unknown): unknown => {
	if (typeof value === "bigint") return { $bigint: value.toString() };
	if (value === undefined) return { $undefined: true };
	if (Array.isArray(value)) return value.map(toRecordable);
	if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
		return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, toRecordable(inner)]));
	}
	return value;
};

type Scenario = {
	group: string;
	name: string;
	method: string;
	args: Json;
	random: number[];
	commands: Command[];
	idStart?: number;
	result?: Json;
	error?: Json;
};
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
	const idStart: number = (mongoose.mongo.ObjectId as unknown as ObjectIdStatics).index;
	const scenario: Scenario = { group, name, method, args: toJson(toRecordable(args)), random: [], commands: [], idStart };
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

// Loading the tables compiles the models, and mongoose's autoIndex then creates every declared
// index, as it does at every provider start. The models are done concurrently, so the order of
// these commands is not fixed: these scenarios are marked unordered.
(db as unknown as { autoIndexed: () => Promise<void> }).autoIndexed = async (): Promise<void> => {
	db.loadTables();
	await Promise.all(Object.values(db.getTables()).map((model) => (model as mongoose.Model<unknown>).init()));
};
await record("indexes", "load the tables", "autoIndexed", []);
(scenarios[scenarios.length - 1] as Scenario & { unordered?: boolean }).unordered = true;
collectionNames = Object.fromEntries(
	Object.entries(db.getTables()).map(([table, model]) => [table, (model as mongoose.Model<unknown>).collection.name]),
);
// ensureIndexes drops them all and creates them again.
await record("indexes", "ensure indexes", "ensureIndexes", []);
(scenarios[scenarios.length - 1] as Scenario & { unordered?: boolean }).unordered = true;

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

// Group 3: PoW, puzzle, audio and icon-order challenge records.
const ip4 = { lower: 3232235777n, type: "v4" };
const ip6 = { lower: 2n ** 63n + 7n, upper: 42n, type: "v6" };
const headers = { "user-agent": "Mozilla/5.0", accept: "*/*", "1": "integer-like key", z: "last" };
const ipInfo = { isValid: true, ip: "192.168.1.1", countryCode: "GB", isVPN: false, asn: 1234, score: 0.25, providerType: "residential" };
const ipInfoError = { isValid: false, error: "lookup failed", ip: "10.0.0.1" };
const components = (n: number) => ({ requestedAtTimestamp: 1_700_000_000_000 + n, userAccount: `user${n}`, dappAccount: "dapp" });
const challenge = (n: number): string => `${1_700_000_000_000 + n}___user${n}___dapp___nonce${n}`;
const result = (status: string, reason?: string) => (reason ? { status, reason } : { status });
await record("challenges", "store a PoW record", "storePowCaptchaRecord", [challenge(1), components(1), 4, "0xprovidersig", ip4, headers, "t13d1516h2_8daaf6152771_02713d6af862", "session-1", false, false, undefined, ipInfo]);
await record("challenges", "store a PoW record with every flag", "storePowCaptchaRecord", [challenge(2), components(2), 8.5, "0xsig2", ip6, {}, "ja4", undefined, true, true, "0xusersig", ipInfoError]);
await record("challenges", "store a PoW record without extras", "storePowCaptchaRecord", [challenge(3), components(3), 1, "0xsig3", ip4, headers, "ja4"]);
await record("challenges", "store a PoW record twice", "storePowCaptchaRecord", [challenge(3), components(3), 1, "0xsig3", ip4, headers, "ja4"]);
await record("challenges", "a PoW record", "getPowCaptchaRecordByChallenge", [challenge(1)]);
await record("challenges", "a missing PoW record", "getPowCaptchaRecordByChallenge", ["missing"]);
await record("challenges", "approve a PoW record with unsafe coordinates", "updatePowCaptchaRecordResult", [challenge(1), result("Approved"), true, true, "0xusersig", [[[1, 2], [3.5, 4]]]]);
await record("challenges", "approve a PoW record", "updatePowCaptchaRecordResult", [challenge(1), result("Approved"), true, true, "0xusersig", [[[1, 2], [3, 4]]]]);
await record("challenges", "disapprove a PoW record", "updatePowCaptchaRecordResult", [challenge(2), result("Disapproved", "CAPTCHA.INVALID_TIMESTAMP"), false, true]);
await record("challenges", "update a missing PoW record", "updatePowCaptchaRecordResult", ["missing", result("Approved"), false, false]);
// A wrong solution still blocks a PoW, unlike the other types.
await record("challenges", "disapprove a PoW record as a wrong solution", "updatePowCaptchaRecordResult", [challenge(3), result("Disapproved", "CAPTCHA.INVALID_SOLUTION"), false, true]);
await record("challenges", "a PoW record after its result", "getPowCaptchaRecordByChallenge", [challenge(1)]);
await record("challenges", "patch a PoW record", "updatePowCaptchaRecord", [challenge(3), { serverChecked: true, ipInfo, coords: [[[5, 6]]] }]);
await record("challenges", "unstored PoW records", "getUnstoredDappUserPoWCommitments", []);
await record("challenges", "unstored PoW records, a page", "getUnstoredDappUserPoWCommitments", [1]);
await record("challenges", "unstored PoW records after an id", "getUnstoredDappUserPoWCommitments", [10, new mongoose.Types.ObjectId("000000000000000000000000")]);
await record("challenges", "mark PoW records stored", "markDappUserPoWCommitmentsStored", [[challenge(1), challenge(3)], new Date(1_710_000_060_123)]);
await record("challenges", "mark PoW records checked", "markDappUserPoWCommitmentsChecked", [[challenge(2), challenge(3)]]);
await record("challenges", "mark PoW records checked again", "markDappUserPoWCommitmentsChecked", [[challenge(2)]]);
for (const [kind, store, get, claim, update, patch, check] of [
	["puzzle", "storePuzzleCaptchaRecord", "getPuzzleCaptchaRecordByChallenge", null, "updatePuzzleCaptchaRecordResult", "updatePuzzleCaptchaRecord", "markPuzzleCaptchaRecordChecked"],
	["audio", "storeAudioCaptchaRecord", "getAudioCaptchaRecordByChallenge", "claimAudioCaptchaSubmission", "updateAudioCaptchaRecordResult", "updateAudioCaptchaRecord", "markAudioCaptchaRecordChecked"],
	["iconOrder", "storeIconOrderCaptchaRecord", "getIconOrderCaptchaRecordByChallenge", "claimIconOrderCaptchaSubmission", "updateIconOrderCaptchaRecordResult", "updateIconOrderCaptchaRecord", "markIconOrderCaptchaRecordChecked"],
] as const) {
	const extra = (n: number): unknown[] =>
		kind === "puzzle"
			? [120.5 + n, 40, 10, 12, 15]
			: kind === "audio"
				? [`${n}4815`]
				: [[{ x: 10, y: 20.5, size: 32, kind: "star" }, { x: 100, y: 50, size: 28, kind: "moon" }], 0.75];
	await record(kind, `store a ${kind} record`, store, [challenge(10), components(10), ...extra(10), "0xsig", ip6, headers, "ja4", "session-10", ipInfo]);
	await record(kind, `store a ${kind} record without extras`, store, [challenge(11), components(11), ...extra(11), "0xsig", ip4, {}, "ja4"]);
	await record(kind, `a ${kind} record`, get, [challenge(10)]);
	await record(kind, `a missing ${kind} record`, get, ["missing"]);
	if (claim) {
		await record(kind, `claim a ${kind} submission`, claim, [challenge(10)]);
		await record(kind, `claim a ${kind} submission again`, claim, [challenge(10)]);
	}
	await record(kind, `approve a ${kind} record`, update, [challenge(10), result("Approved"), true, true, "0xusersig", [[[1, 2]]]]);
	await record(kind, `disapprove a ${kind} record at a given time`, update, [challenge(11), result("Disapproved", "CAPTCHA.INVALID_SOLUTION"), false, true, undefined, undefined, new Date(1_700_000_123_456)]);
	await record(kind, `update a missing ${kind} record`, update, ["missing", result("Approved"), false, false]);
	await record(kind, `patch a ${kind} record`, patch, [challenge(11), { serverChecked: true, userSubmitted: true, result: result("Disapproved") }]);
	await record(kind, `patch a ${kind} record lightly`, patch, [challenge(10), { ipInfo: ipInfoError }]);
	await record(kind, `store a ${kind} record to check`, store, [challenge(12), components(12), ...extra(12), "0xsig", ip4, headers, "ja4"]);
	await record(kind, `mark a fresh ${kind} record checked`, check, [challenge(12)]);
	await record(kind, `mark a ${kind} record checked`, check, [challenge(11)]);
	await record(kind, `mark a ${kind} record checked again`, check, [challenge(11)]);
	await record(kind, `a ${kind} record after its updates`, get, [challenge(11)]);
}
await setup("challenges", "a verified record with an email", () =>
	db.getTables().powcaptcha.collection.updateOne({ challenge: challenge(2) }, { $set: { metadata: { email: "a@b.c", emailNormalised: "ab@b.c" } } }),
);
await record("challenges", "count by email", "countCommitmentsByNormalisedEmail", ["dapp", "ab@b.c"]);
await record("challenges", "count by an empty email", "countCommitmentsByNormalisedEmail", ["dapp", ""]);
await record("challenges", "count by email for another dapp", "countCommitmentsByNormalisedEmail", ["other", "ab@b.c"]);

await connection.db?.dropDatabase();
await db.close();

writeFileSync(
	fileURLToPath(new URL("./methods.json", import.meta.url)),
	`${JSON.stringify({ nowMs: NOW_MS, collections: collectionNames, scenarios })}\n`,
);
console.log(`wrote methods.json (${scenarios.length} scenarios, ${scenarios.reduce((n, s) => n + s.commands.length, 0)} commands)`);
