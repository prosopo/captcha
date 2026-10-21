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

// Every connection a database opens reports the commands it sends, those to the central
// database marked as such.
const CENTRAL_DB_NAME = "prosopo-equivalence-database-central";
const CLIENT_DB_NAME = "prosopo-equivalence-database-client";
const createConnection = mongoose.createConnection.bind(mongoose);
(mongoose as unknown as { createConnection: unknown }).createConnection = (
	uri: string,
	options: mongoose.ConnectOptions,
): mongoose.Connection => {
	const opened: mongoose.Connection = createConnection(uri, { ...options, monitorCommands: true });
	monitor(opened.getClient(), options.dbName === CENTRAL_DB_NAME ? "central" : options.dbName === CLIENT_DB_NAME ? "client" : "provider");
	return opened;
};

const { ProviderDatabase } = await import("../../src/databases/provider.js");
const { MongoDatabase } = await import("../../src/base/mongo.js");
const { getLogger } = await import("@prosopo/logger");
const { ClientSettingsSchema } = await import("@prosopo/types");
const { CaptchaDatabase } = await import("../../src/databases/captcha.js");
const { CentralDbStreamer } = await import("../../src/databases/centralDbStreamer.js");
const { ClientDatabase } = await import("../../src/databases/client.js");

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

type Command = { central?: true; client?: true; name: string; hex: string; json: Json; reply?: { hex: string; json: Json } };
let commands: Command[] = [];
const pending = new Map<number, Command>();
// The parts of a reply the methods read: the documents a cursor returns, and the counts.
const REPLY_FIELDS: string[] = ["cursor", "n", "nModified", "upserted", "value", "lastErrorObject", "writeErrors", "writeConcernError"];
function monitor(client: mongoose.mongo.MongoClient, database: "provider" | "central" | "client"): void {
	client.on("commandStarted", (event) => {
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
				...(database === "central" ? { central: true } : database === "client" ? { client: true } : {}),
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
	client.on("commandSucceeded", (event) => {
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
}
const silent = getLogger("error", "equivalence");
const db = new ProviderDatabase({ mongo: { url: MONGO_URL, dbname: DB_NAME }, logger: silent });
await MongoDatabase.prototype.connect.call(db);
const connection = db.getConnection();

await connection.db?.dropDatabase();
await connection.getClient().db(CENTRAL_DB_NAME).dropDatabase();
await connection.getClient().db(CLIENT_DB_NAME).dropDatabase();
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
const recordOn = async (target: object, settleMs: number, group: string, name: string, method: string, args: unknown[]): Promise<unknown> => {
	if (process.env.EQUIVALENCE_PROGRESS) process.stderr.write(`${group}: ${name}\n`);
	commands = [];
	drawn = [];
	const idStart: number = (mongoose.mongo.ObjectId as unknown as ObjectIdStatics).index;
	const scenario: Scenario = { group, name, method, args: toJson(toRecordable(args)), random: [], commands: [], idStart };
	let result: unknown;
	try {
		result = await (target as Record<string, (...a: unknown[]) => Promise<unknown>>)[method](...args);
		const plain: unknown = result instanceof mongoose.Document ? result.toObject() : result;
		scenario.result = toJson(plain === undefined ? null : plain);
	} catch (error) {
		scenario.error = describeError(error);
	}
	await new Promise<void>((resolve) => setTimeout(resolve, settleMs));
	scenario.commands = [...commands];
	scenario.random = drawn;
	scenarios.push(scenario);
	return result;
};
const record = (group: string, name: string, method: string, args: unknown[]): Promise<unknown> => recordOn(db, 20, group, name, method, args);

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

// Group 4: image commitments, user solutions and pending image requests.
const requestHash = (n: number): string => hex(0xaa00 + n);
await record("image", "store a pending request", "storePendingImageCommitment", ["user20", requestHash(1), "0xsalt1", new Date(1_710_000_120_000), new Date(1_710_000_000_000), ip4, 0.8, "session-20", ipInfo]);
await record("image", "store a pending request without extras", "storePendingImageCommitment", ["user21", requestHash(2), "0xsalt2", new Date(1_710_000_120_000), new Date(1_710_000_000_000), ip6, 1]);
await record("image", "store a pending request with a non-hex hash", "storePendingImageCommitment", ["user22", "nope", "0xsalt", new Date(0), new Date(0), ip4, 1]);
await record("image", "store a pending request again", "storePendingImageCommitment", ["user20", requestHash(1), "0xsalt1b", new Date(1_710_000_130_000), new Date(1_710_000_000_000), ip4, 0.5]);
await record("image", "a pending request", "getPendingImageCommitment", [requestHash(1)]);
await record("image", "a missing pending request", "getPendingImageCommitment", [requestHash(99)]);
await record("image", "a pending request with a non-hex hash", "getPendingImageCommitment", ["nope"]);
await record("image", "consume a pending request", "updatePendingImageCommitmentStatus", [requestHash(1)]);
await record("image", "consume a pending request again", "updatePendingImageCommitmentStatus", [requestHash(1)]);
await record("image", "consume a pending request with a non-hex hash", "updatePendingImageCommitmentStatus", ["nope"]);
await record("image", "a consumed pending request", "getPendingImageCommitment", [requestHash(1)]);
const commitment = (n: number, extra: Record<string, unknown> = {}) => ({
	id: hex(0xc000 + n),
	userAccount: `user${n}`,
	dappAccount: "dapp",
	datasetId,
	providerAccount: "provider",
	result: { status: "Pending" },
	userSignature: `0xusersig${n}`,
	ipAddress: n % 2 === 0 ? ip4 : ip6,
	headers,
	ja4: "ja4",
	userSubmitted: true,
	serverChecked: false,
	requestedAtTimestamp: new Date(1_710_000_000_000 + n),
	pending: false,
	salt: `0xsalt${n}`,
	requestHash: requestHash(n),
	deadlineTimestamp: new Date(1_710_000_200_000),
	threshold: 0.8,
	sessionId: `session-${n}`,
	ipInfo,
	unknownField: "stripped by zod",
	...extra,
});
const solutions = (n: number) => [
	{ captchaId: hex(0x100), captchaContentId: hex(0x200), salt: `0xsol${n}a`, solution: [hex(0x300)] },
	{ captchaId: hex(0x101), captchaContentId: hex(0x201), salt: `0xsol${n}b`, solution: [hex(0x301), hex(0x401)], inputMethods: ["pointer", "keyboard"] },
];
await record("image", "store a solution", "storeUserImageCaptchaSolution", [solutions(30), commitment(30)]);
await record("image", "store a solution with everything", "storeUserImageCaptchaSolution", [
	solutions(31),
	commitment(31, {
		providedIp: ip6,
		metadata: { email: "a@b.c", emailNormalised: "ab@b.c" },
		clientMetaData: { hp: "", clientSessionId: "client-31" },
		coords: [[[1, 2]], [[3, 4]]],
		inputMethods: [["pointer"], ["keyboard"]],
		deviceCapability: "touch",
		behavioralDataPacked: { c1: [1, [2, 3]], c2: [], c3: ["x"], d: "dev" },
		label: "human",
	}),
]);
await record("image", "store a commitment without solutions", "storeUserImageCaptchaSolution", [[], commitment(32)]);
await record("image", "store the same solution again", "storeUserImageCaptchaSolution", [solutions(30), commitment(30, { serverChecked: true })]);
await record("image", "a commitment by id", "getDappUserCommitmentById", [hex(0xc000 + 31)]);
await record("image", "a missing commitment", "getDappUserCommitmentById", [hex(0xc0ff)]);
await record("image", "commitments by account", "getDappUserCommitmentByAccount", ["user30", "dapp"]);
await record("image", "no commitments by account", "getDappUserCommitmentByAccount", ["nobody", "dapp"]);
await record("image", "solutions by captcha", "getAllDappUserSolutions", [[hex(0x100), hex(0x1ff)]]);
await record("image", "a solution by commitment", "getDappUserSolutionById", [hex(0xc000 + 30)]);
await record("image", "a missing solution by commitment", "getDappUserSolutionById", [hex(0xc0ff)]);
await record("image", "approve a commitment", "approveDappUserCommitment", [hex(0xc000 + 30), [[[5, 6]]]]);
await record("image", "approve a commitment without coordinates", "approveDappUserCommitment", [hex(0xc000 + 32)]);
await record("image", "disapprove a commitment", "disapproveDappUserCommitment", [hex(0xc000 + 31), "CAPTCHA.INVALID_SOLUTION", [[[7, 8]]]]);
await record("image", "disapprove a commitment without a reason", "disapproveDappUserCommitment", [hex(0xc000 + 32)]);
await record("image", "patch a commitment", "updateDappUserCommitment", [hex(0xc000 + 30), { providedIp: ip4, metadata: { email: "x@y.z", emailNormalised: "x@y.z" } }]);
await record("image", "mark a fresh commitment checked", "markDappUserCommitmentsChecked", [[hex(0xc000 + 31)]]);
await record("image", "patch a commitment's flags", "updateDappUserCommitment", [hex(0xc000 + 31), { userSubmitted: true, serverChecked: true, result: { status: "Disapproved", reason: "CAPTCHA.INVALID_SOLUTION" } }]);
await record("image", "checked commitments", "getCheckedDappUserCommitments", []);
await record("image", "unstored commitments", "getUnstoredDappUserCommitments", []);
await record("image", "unstored commitments, a page", "getUnstoredDappUserCommitments", [1]);
await record("image", "mark commitments stored", "markDappUserCommitmentsStored", [[hex(0xc000 + 30), hex(0xc000 + 32)], new Date(1_710_000_060_123)]);
await record("image", "mark commitments checked", "markDappUserCommitmentsChecked", [[hex(0xc000 + 30), hex(0xc000 + 32)]]);
await record("image", "mark commitments checked again", "markDappUserCommitmentsChecked", [[hex(0xc000 + 30)]]);
await record("image", "flag solutions processed", "flagProcessedDappUserSolutions", [[hex(0x100), hex(0x101)]]);
await record("image", "flag commitments processed", "flagProcessedDappUserCommitments", [[hex(0xc000 + 30), hex(0xc000 + 30), hex(0xc000 + 31)]]);

const session = (n: number, extra: Record<string, unknown> = {}) => ({
	sessionId: `session-s${n}`,
	createdAt: new Date(1_710_000_000_000 + n),
	token: `token-${n}`,
	score: 0.5,
	threshold: 0.8,
	scoreComponents: { baseScore: 0.5, triggeredDetectors: [1, 2.5] },
	ipAddress: n % 2 === 0 ? ip4 : ip6,
	captchaType: "pow",
	webView: false,
	iFrame: true,
	decryptedHeadHash: `head-${n}`,
	userSitekeyIpHash: `hash-${n}`,
	siteKey: "sitekey",
	headers,
	ipInfo,
	unknownField: "stripped by mongoose",
	...extra,
});
await record("sessions", "store a session", "storeSessionRecord", [session(1)]);
await record("sessions", "store a session with everything", "storeSessionRecord", [
	session(2, {
		mode: "invisible",
		solvedImagesCount: 2,
		powDifficulty: 4,
		puzzleTolerance: 3.5,
		puzzle: { z: 1, a: [2, 3] },
		iconOrderTolerance: 10,
		iconOrder: { size: 4 },
		puzzleLevel: 1,
		lastUpdatedTimestamp: new Date(1_710_000_000_500),
		isEscalation: true,
		originSessionId: "session-s1",
		refreshOf: "session-s0",
		refreshCount: 2,
		refreshedAfterMs: 1234,
		bundleId: "bundle",
		currentUrl: "https://example.com/page",
		iframeUrl: "https://protect.example.com/",
		isProtect: true,
		reason: "someReason",
		ruleType: ["ja4Hash"],
		matchedRule: { type: "block", description: "rule" },
		result: { status: "Approved" },
		userSubmitted: false,
		serverChecked: false,
		agent: true,
		webBotAuthAgent: "https://chatgpt.com",
		simdReadings: { v: 1, r: [1.5, 2] },
		simdReadingsStage: "frictionless",
		d: { em: "a@b.c", n: 3 },
		tcpToChelloUs: 100,
		synNs: 1_700_000_000_000_000,
		observedTtl: 64,
		tcpOptsKinds: [2, 4, 8, 1, 3],
		tcpTsval: 4_294_967_295,
		dnsEvent: { resolverIp: "1.1.1.1", receivedAt: new Date(1_710_000_000_900) },
		clientMetaData: { hp: "", clientSessionId: "client-2" },
	}),
]);
await record("sessions", "store a session with no token", "storeSessionRecord", [session(3, { token: "" })]);
await record("sessions", "store a session twice", "storeSessionRecord", [session(1)]);
await record("sessions", "store a blocked session", "storeBlockedSession", [session(4, { blocked: false, ruleHash: "rule", ruleDescription: "why" })]);
await record("sessions", "store a blocked session already stored", "storeBlockedSession", [session(5, { storedAtTimestamp: new Date(1_710_000_000_000), lastUpdatedTimestamp: new Date(1_710_000_000_001) })]);
await record("sessions", "store a blocked session that fails", "storeBlockedSession", [session(4)]);
await record("sessions", "a session by id", "getSessionRecordBySessionId", ["session-s2"]);
await record("sessions", "a missing session by id", "getSessionRecordBySessionId", ["session-none"]);
await record("sessions", "a session by token", "getSessionRecordByToken", ["token-2"]);
await record("sessions", "a missing session by token", "getSessionRecordByToken", ["token-none"]);
await record("sessions", "a session by hash", "getSessionByuserSitekeyIpHash", ["hash-1"]);
await record("sessions", "a deleted session by hash", "getSessionByuserSitekeyIpHash", ["hash-4"]);
await record("sessions", "claim a session", "claimSessionServerCheck", ["session-s1"]);
await record("sessions", "claim a session again", "claimSessionServerCheck", ["session-s1"]);
await record("sessions", "claim a missing session", "claimSessionServerCheck", ["session-none"]);
await record("sessions", "patch a session", "updateSessionRecord", ["session-s2", { score: 0.25, result: { status: "Disapproved", reason: "CAPTCHA.INVALID_SOLUTION" }, ipAddress: ip6, solvedImagesCount: "3" }]);
await record("sessions", "patch a session with a bad value", "updateSessionRecord", ["session-s2", { score: "high" }]);
await record("sessions", "record SIMD readings", "recordSessionSimdReadingsIfAbsent", ["session-s1", { v: 2, r: [0.5] }, "challenge"]);
await record("sessions", "record SIMD readings again", "recordSessionSimdReadingsIfAbsent", ["session-s1", { v: 3 }, "submit"]);
await record("sessions", "merge a DNS event", "mergeSessionDnsEvent", ["session-s1", { resolverIp: "8.8.8.8" }, new Date(1_710_000_001_000)]);
await record("sessions", "merge another DNS event", "mergeSessionDnsEvent", ["session-s1", { peerIp: "9.9.9.9", pathValid: false }, new Date(1_710_000_002_000)]);
await record("sessions", "merge an empty DNS event", "mergeSessionDnsEvent", ["session-s2", {}, new Date(1_710_000_003_000)]);
await record("sessions", "merge a DNS event into a missing session", "mergeSessionDnsEvent", ["session-none", { pathValid: true }, new Date(1_710_000_003_000)]);
await record("sessions", "unstored sessions", "getUnstoredSessionRecords", []);
await record("sessions", "unstored sessions, a page", "getUnstoredSessionRecords", [1]);
await record("sessions", "mark sessions stored", "markSessionRecordsStored", [["session-s1", "session-s2"], new Date(1_710_000_060_123)]);
await record("sessions", "consume a session", "checkAndRemoveSession", ["session-s1"]);
await record("sessions", "consume a session again", "checkAndRemoveSession", ["session-s1"]);
await record("sessions", "consume a missing session", "checkAndRemoveSession", ["session-none"]);
await record("sessions", "a consumed session by hash", "getSessionByuserSitekeyIpHash", ["hash-1"]);

const taskId = await record("scheduler", "create a task status", "createScheduledTaskStatus", ["StoreCommitmentsExternal", "Running"]);
await record("scheduler", "create another task status", "createScheduledTaskStatus", ["GetClientList", "Completed"]);
await record("scheduler", "a task status", "getScheduledTaskStatus", [taskId, "Running"]);
await record("scheduler", "a task status in another status", "getScheduledTaskStatus", [taskId, "Completed"]);
await record("scheduler", "the last task status", "getLastScheduledTaskStatus", ["StoreCommitmentsExternal"]);
await record("scheduler", "the last task status in a status", "getLastScheduledTaskStatus", ["StoreCommitmentsExternal", "Completed"]);
await record("scheduler", "complete a task", "updateScheduledTaskStatus", [taskId, "Completed", { data: { processed: 3, z: [1, "a"] } }]);
await record("scheduler", "fail a task", "updateScheduledTaskStatus", [taskId, "Failed", { error: "boom" }]);
await record("scheduler", "update a task without a result", "updateScheduledTaskStatus", [taskId, "Completed"]);
await record("scheduler", "the completed task", "getScheduledTaskStatus", [taskId, "Completed"]);
await record("scheduler", "clean up completed tasks", "cleanupScheduledTaskStatus", ["Completed"]);
await record("scheduler", "no last task status", "getLastScheduledTaskStatus", ["StoreCommitmentsExternal"]);

const settings = ClientSettingsSchema.parse({ domains: ["default.example"] });
const customSettings = ClientSettingsSchema.parse({ captchaType: "pow", domains: ["example.com"], powDifficulty: 5, frictionlessThreshold: 0.75 });
await record("clients", "update client records", "updateClientRecords", [
	[
		{ account: "client1", settings, tier: "free" },
		{ account: "client2", settings: customSettings, tier: "professional", extra: "dropped" },
		{ account: "", settings, tier: "free" },
		{ settings, tier: "free" },
		{ account: "client3", tier: "enterprise" },
	],
]);
await record("clients", "update client records again", "updateClientRecords", [[{ account: "client1", settings: customSettings, tier: "enterprise" }]]);
await record("clients", "update no client records", "updateClientRecords", [[{ account: "", settings, tier: "free" }]]);
await record("clients", "update an empty list of client records", "updateClientRecords", [[]]);
await record("clients", "all client records", "getAllClientRecords", []);
await record("clients", "a client record", "getClientRecord", ["client2"]);
await record("clients", "a client record without settings", "getClientRecord", ["client3"]);
await record("clients", "a missing client record", "getClientRecord", ["nobody"]);
await record("clients", "remove client records", "removeClientRecords", [["client3", "nobody"]]);
await record("clients", "remove no client records", "removeClientRecords", [[]]);

const artifact = (extra: Record<string, unknown> = {}) => ({
	scope: "global",
	runtime: "node",
	source: "export default () => ({ decision: 'allow' })",
	createdAt: new Date(0),
	updatedAt: new Date(0),
	...extra,
});
await record("decisionMachines", "upsert a global artifact", "upsertDecisionMachineArtifact", [artifact()]);
await record("decisionMachines", "upsert a dapp artifact", "upsertDecisionMachineArtifact", [artifact({ scope: "dapp", dappAccount: "dapp1", kind: "decision", language: "ts", name: "dm", version: "1.0.0", captchaType: "puzzle" })]);
await record("decisionMachines", "upsert the global artifact again", "upsertDecisionMachineArtifact", [artifact({ source: "changed", name: "renamed" })]);
await record("decisionMachines", "the global artifact", "getDecisionMachineArtifact", ["global"]);
await record("decisionMachines", "the dapp artifact of a kind", "getDecisionMachineArtifact", ["dapp", "dapp1", "decision"]);
await record("decisionMachines", "a missing artifact", "getDecisionMachineArtifact", ["dapp", "dapp2"]);
await record("decisionMachines", "all artifacts", "getAllDecisionMachineArtifacts", []);
const firstArtifactId = "65ec87bca1b2c3d4e5f00001";
await setup("decisionMachines", "an artifact with a known id", () =>
	connection.collection("decisionmachines").insertOne({
		_id: new mongoose.Types.ObjectId(firstArtifactId),
		scope: "dapp",
		dappAccount: "dapp-fixed",
		kind: "routing",
		runtime: "node",
		source: "fixed",
		createdAt: new Date(1_000),
		updatedAt: new Date(2_000),
		__v: 0,
	}),
);
await record("decisionMachines", "an artifact by id", "getDecisionMachineArtifactById", [firstArtifactId]);
await record("decisionMachines", "a missing artifact by id", "getDecisionMachineArtifactById", ["65ec87bca1b2c3d4e5ffffff"]);
await record("decisionMachines", "an artifact by a malformed id", "getDecisionMachineArtifactById", ["nope"]);
await record("decisionMachines", "remove an artifact", "removeDecisionMachineArtifact", [firstArtifactId]);
await record("decisionMachines", "remove it again", "removeDecisionMachineArtifact", [firstArtifactId]);
await record("decisionMachines", "remove an artifact by a malformed id", "removeDecisionMachineArtifact", ["nope"]);
await record("decisionMachines", "remove all artifacts", "removeAllDecisionMachineArtifacts", []);
await record("decisionMachines", "remove all artifacts again", "removeAllDecisionMachineArtifacts", []);

await record("spam", "add spam domains", "bulkUpdateSpamEmailDomains", [[{ filter: { domain: "spam.com" }, update: { domain: "spam.com" } }, { filter: { domain: "junk.co.uk" }, update: { domain: "junk.co.uk" } }], true]);
await record("spam", "rename a spam domain without upserting", "bulkUpdateSpamEmailDomains", [[{ filter: { domain: "junk.co.uk" }, update: { domain: "junk.org" } }, { filter: { domain: "absent.com" }, update: { domain: "absent.com" } }], false]);
await record("spam", "update no spam domains", "bulkUpdateSpamEmailDomains", [[], true]);
await record("spam", "a spam domain", "getSpamEmailDomain", ["spam.com"]);
await record("spam", "a subdomain of a spam domain", "getSpamEmailDomain", ["mail.eu.spam.com"]);
await record("spam", "a deep subdomain of a spam domain", "getSpamEmailDomain", ["a.b.c.d.e.f.spam.com"]);
await record("spam", "a clean domain", "getSpamEmailDomain", ["example.com"]);
await record("spam", "a renamed spam domain", "getSpamEmailDomain", ["junk.org"]);
await record("spam", "not a domain", "getSpamEmailDomain", ["localhost"]);
await record("spam", "an empty domain", "getSpamEmailDomain", [""]);

// The central database: the sweep's batch upserts and reads, then the streamer.
const central = new CaptchaDatabase(MONGO_URL, CENTRAL_DB_NAME, undefined, silent);
// The driver draws `Math.random()` for its own ends on the central database's fresh connections;
// `CaptchaDatabase` itself draws none.
const recordCentral = async (name: string, method: string, args: unknown[]): Promise<unknown> => {
	const result: unknown = await recordOn(central, 50, "central", name, method, args);
	(scenarios[scenarios.length - 1] as Scenario).random = [];
	return result;
};
const tables = db.getTables();
const leanSessions = await tables.session.find({}).sort({ _id: 1 }).limit(3).lean();
const leanCommitments = await tables.commitment.find({}).sort({ _id: 1 }).limit(3).lean();
const leanPow = await tables.powcaptcha.find({}).sort({ _id: 1 }).limit(3).lean();
const leanPuzzle = await tables.puzzlecaptcha.find({}).sort({ _id: 1 }).limit(2).lean();
const leanIconOrder = await tables.iconordercaptcha.find({}).sort({ _id: 1 }).limit(2).lean();
const leanAudio = await tables.audiocaptcha.find({}).sort({ _id: 1 }).limit(2).lean();
await setup("central", "a commitment whose provided IP a pipeline wrote as a Long", () =>
	tables.commitment.updateOne(
		{ id: hex(0xc000 + 31) },
		[{ $set: { providedIp: { lower: BigInt("0xB496D250E5C58459"), upper: BigInt("0xB496D250E5C58459"), type: "v6" } } }],
		{ updatePipeline: true },
	),
);
const poisoned = await tables.commitment.find({ id: hex(0xc000 + 31) }).lean();
await recordCentral("save every kind of record", "saveCaptchas", [leanSessions, leanCommitments, leanPow, leanPuzzle, leanIconOrder, leanAudio]);
await recordCentral("save them again", "saveCaptchas", [leanSessions, leanCommitments, leanPow, leanPuzzle, leanIconOrder, leanAudio]);
await recordCentral("save a commitment with a Long provided IP", "saveCaptchas", [[], poisoned, []]);
await recordCentral("save nothing", "saveCaptchas", [[], [], []]);
await recordCentral("read the records", "getCaptchas", []);
await recordCentral("read the records of a dapp, a page", "getCaptchas", [{ dappAccount: "dapp" }, 2]);
await recordCentral("read with a filter that cannot cast", "getCaptchas", [{ requestedAtTimestamp: "not a date" }, 1]);

// The portal's accounts, read for the sites that changed.
const clients = new ClientDatabase(MONGO_URL, CLIENT_DB_NAME, undefined, silent);
await clients.connect();
const accountSettings = (domain: string) => ({ domains: [domain], powDifficulty: 4, captchaType: "pow", frictionlessThreshold: { image: 0.5, puzzle: 0.7 } });
await setup("client", "accounts", () =>
	clients.tables.accounts.insertMany([
		{
			signupEmail: "two@example.com",
			tier: "professional",
			users: [{ email: "two@example.com", status: "active" }],
			sites: [
				{ name: "a", siteKey: "siteKeyA", secretKey: "sa", settings: accountSettings("a.example.com"), createdAt: 1, updatedAt: 500, active: true },
				{ name: "b", siteKey: "siteKeyB", secretKey: "sb", settings: accountSettings("b.example.com"), createdAt: 1, updatedAt: 100, active: true },
				{ name: "never stamped", siteKey: "siteKeyC", secretKey: "sc", settings: accountSettings("c.example.com"), createdAt: 1, active: true },
				{ name: "no key", secretKey: "sd", settings: accountSettings("d.example.com"), createdAt: 1, updatedAt: 900, active: true },
				{ name: "no settings", siteKey: "siteKeyE", secretKey: "se", createdAt: 1, updatedAt: 900, active: true },
			],
		},
		{
			signupEmail: "inactive@example.com",
			tier: "free",
			users: [{ email: "inactive@example.com", status: "pending" }],
			sites: [{ name: "x", siteKey: "siteKeyX", secretKey: "sx", settings: accountSettings("x.example.com"), createdAt: 1, updatedAt: 900, active: true }],
		},
		{ signupEmail: "nosites@example.com", tier: "enterprise", users: [{ email: "nosites@example.com", status: "active" }] },
	]),
);
await clients.close();
const recordClients = async (name: string, method: string, args: unknown[]): Promise<unknown> => {
	const result: unknown = await recordOn(clients, 50, "client", name, method, args);
	(scenarios[scenarios.length - 1] as Scenario).random = [];
	return result;
};
await recordClients("sites changed since 0", "getUpdatedClients", [0]);
await recordClients("sites changed since 200", "getUpdatedClients", [200]);
await recordClients("sites changed since 1000", "getUpdatedClients", [1000]);

// The streamer: each method's local write, then the record streamed to the central database and
// the local record marked stored.
db.setCentralDbStreamer(new CentralDbStreamer(`${MONGO_URL}/${CENTRAL_DB_NAME}`, silent));
const stream = (name: string, method: string, args: unknown[]): Promise<unknown> => recordOn(db, 300, "streaming", name, method, args);
await stream("store a PoW record", "storePowCaptchaRecord", [challenge(50), components(50), 4, "0xsig50", ip4, headers, "ja4", "session-50", false, false, undefined, ipInfo]);
await stream("approve a PoW record", "updatePowCaptchaRecordResult", [challenge(50), result("Approved"), true, true, "0xusersig", [[[1, 2]]]]);
await stream("patch a PoW record", "updatePowCaptchaRecord", [challenge(50), { serverChecked: true }]);
await stream("patch a missing PoW record", "updatePowCaptchaRecord", ["missing", { serverChecked: true }]);
await stream("store a puzzle record", "storePuzzleCaptchaRecord", [challenge(51), components(51), 120.5, 40, 10, 12, 15, "0xsig", ip6, headers, "ja4", "session-51", ipInfo]);
await stream("approve a puzzle record", "updatePuzzleCaptchaRecordResult", [challenge(51), result("Approved"), true, true, "0xusersig", [[[1, 2]]]]);
await stream("patch a puzzle record", "updatePuzzleCaptchaRecord", [challenge(51), { userSubmitted: true }]);
await stream("store a puzzle record to check", "storePuzzleCaptchaRecord", [challenge(57), components(57), 120.5, 40, 10, 12, 15, "0xsig", ip4, headers, "ja4"]);
await stream("mark a puzzle record checked", "markPuzzleCaptchaRecordChecked", [challenge(57)]);
await stream("mark a puzzle record checked again", "markPuzzleCaptchaRecordChecked", [challenge(57)]);
await stream("store an audio record", "storeAudioCaptchaRecord", [challenge(52), components(52), "524815", "0xsig", ip4, headers, "ja4"]);
await stream("store an icon-order record", "storeIconOrderCaptchaRecord", [challenge(53), components(53), [{ x: 10, y: 20.5, size: 32, kind: "star" }], 0.75, "0xsig", ip4, headers, "ja4"]);
await stream("store an image solution", "storeUserImageCaptchaSolution", [solutions(54), commitment(54)]);
await stream("approve a commitment", "approveDappUserCommitment", [hex(0xc000 + 54), [[[5, 6]]]]);
await stream("disapprove a commitment", "disapproveDappUserCommitment", [hex(0xc000 + 54), "CAPTCHA.INVALID_SOLUTION"]);
await stream("store a session", "storeSessionRecord", [session(55)]);
await stream("store a blocked session", "storeBlockedSession", [session(56)]);
await stream("patch a session and stream it", "updateSessionRecord", ["session-s55", { score: 0.9 }, true]);
await stream("patch a session without streaming it", "updateSessionRecord", ["session-s55", { score: 0.1 }, false]);
await stream("patch a missing session and stream it", "updateSessionRecord", ["session-none", { score: 0.9 }, true]);

await connection.db?.dropDatabase();
await connection.getClient().db(CENTRAL_DB_NAME).dropDatabase();
await connection.getClient().db(CLIENT_DB_NAME).dropDatabase();
await db.close();

writeFileSync(
	fileURLToPath(new URL("./methods.json", import.meta.url)),
	`${JSON.stringify({ nowMs: NOW_MS, collections: collectionNames, scenarios })}\n`,
);
console.log(`wrote methods.json (${scenarios.length} scenarios, ${scenarios.reduce((n, s) => n + s.commands.length, 0)} commands)`);
// The streamer keeps its central connection open for the life of the process.
process.exit(0);
