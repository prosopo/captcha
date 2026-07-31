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

import { ProsopoDBError } from "@prosopo/common";
import { MongoDatabase } from "@prosopo/database";
import type mongoose from "mongoose";
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { type JA4Data, JA4Database } from "../db.js";

type ModelFn = (
	name: string,
	schema: mongoose.Schema,
) => ReturnType<mongoose.Connection["model"]>;

interface ConnectionMock {
	model: Mock<ModelFn>;
}

/**
 * A connection whose model() hands back a stand-in the tests can drive.
 *
 * The real thing needs a running mongod, which CI does not have; only model()
 * is reached by the code under test.
 */
const createConnectionMock = (table: TableMock): ConnectionMock => ({
	model: vi.fn<ModelFn>(
		() => table as unknown as ReturnType<mongoose.Connection["model"]>,
	),
});

/**
 * The subset of a mongoose model the code under test actually uses: the
 * constructor, save(), find() and findOne(). Standing the whole Model interface
 * up would mean a hundred stubs that no test ever calls.
 */
interface TableMock {
	find: Mock<(filter: object) => Promise<unknown[]>>;
	findOne: Mock<(filter: object) => Promise<RecordMock | null>>;
	constructed: JA4Data[];
	saved: Mock<() => Promise<unknown>>;
}

interface RecordMock {
	observation_count?: number;
	save: Mock<() => Promise<unknown>>;
}

const createRecordMock = (observationCount?: number): RecordMock => ({
	observation_count: observationCount,
	save: vi.fn<() => Promise<unknown>>(async () => undefined),
});

const RECORD: JA4Data = {
	ja4_fingerprint: "t13d1516h2_8daaf6152771_b0da82dd1658",
	user_agent_string: "Mozilla/5.0",
};

let db: JA4Database;
let connectSpy: Mock<() => Promise<void>>;
let table: TableMock;

/** Attach a fake connection the way a successful super.connect() would. */
const stubSuperConnect = (connection: ConnectionMock | undefined): void => {
	connectSpy = vi.fn<() => Promise<void>>(async () => {
		db.connection = connection as unknown as mongoose.Connection;
	});
	vi.spyOn(MongoDatabase.prototype, "connect").mockImplementation(connectSpy);
};

beforeEach(() => {
	db = new JA4Database("mongodb://localhost:27017", "client", "admin");
	const constructed: JA4Data[] = [];
	const saved = vi.fn<() => Promise<unknown>>(async () => undefined);
	function TableModel(this: JA4Data, doc: JA4Data): void {
		constructed.push(doc);
	}
	TableModel.prototype.save = saved;
	table = Object.assign(TableModel, {
		find: vi.fn<(filter: object) => Promise<unknown[]>>(async () => []),
		findOne: vi.fn<(filter: object) => Promise<RecordMock | null>>(
			async () => null,
		),
		constructed,
		saved,
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("the constructor", () => {
	test("builds a url from the parts it is given", () => {
		expect(db.url).toContain("mongodb://localhost:27017");
		expect(db.url).toContain("authSource=admin");
		expect(db.dbname).toBe("client");
	});

	test("registers no tables before connecting", () => {
		expect(db.tables).toEqual({});
	});

	test("works without a database name or auth source", () => {
		const bare = new JA4Database("mongodb://localhost:27017");
		expect(bare.url).toContain("localhost:27017");
		expect(bare.tables).toEqual({});
	});
});

describe("connect", () => {
	test("registers the ja4 model on the open connection", async () => {
		const connection = createConnectionMock(table);
		stubSuperConnect(connection);
		await db.connect();
		expect(connection.model).toHaveBeenCalledOnce();
		expect(connection.model.mock.calls[0]?.[0]).toBe("ja4");
		expect(db.tables.ja4).toBeDefined();
	});

	test("opens the connection before registering anything", async () => {
		stubSuperConnect(createConnectionMock(table));
		await db.connect();
		expect(connectSpy).toHaveBeenCalledOnce();
	});

	test("fails loudly when the base class left no connection", async () => {
		// The models used to be read off an undefined connection, so this showed
		// up much later as "cannot read properties of undefined".
		stubSuperConnect(undefined);
		await expect(db.connect()).rejects.toBeInstanceOf(ProsopoDBError);
		expect(db.tables.ja4).toBeUndefined();
	});

	test("propagates a failure to connect", async () => {
		vi.spyOn(MongoDatabase.prototype, "connect").mockRejectedValue(
			new Error("mongo is down"),
		);
		await expect(db.connect()).rejects.toThrow("mongo is down");
		expect(db.tables.ja4).toBeUndefined();
	});

	test("connecting twice is harmless", async () => {
		stubSuperConnect(createConnectionMock(table));
		await db.connect();
		await db.connect();
		expect(db.tables.ja4).toBeDefined();
	});
});

describe("getTables", () => {
	test("throws when nothing has been registered yet", () => {
		expect(() => db.getTables()).toThrow(ProsopoDBError);
	});

	test("returns the models once connected", async () => {
		stubSuperConnect(createConnectionMock(table));
		await db.connect();
		expect(db.getTables().ja4).toBeDefined();
	});

	test("querying before connecting is a database error, not a TypeError", async () => {
		await expect(db.getJA4Records()).rejects.toBeInstanceOf(ProsopoDBError);
		await expect(
			db.getJA4RecordByFingerprintAndUserAgent("a", "b"),
		).rejects.toBeInstanceOf(ProsopoDBError);
		await expect(db.addOrUpdateJA4Record(RECORD)).rejects.toBeInstanceOf(
			ProsopoDBError,
		);
	});
});

describe("queries", () => {
	beforeEach(async () => {
		stubSuperConnect(createConnectionMock(table));
		await db.connect();
	});

	test("getJA4Records asks for every record", async () => {
		await db.getJA4Records();
		expect(table.find).toHaveBeenCalledWith({});
	});

	test("getJA4Records passes an empty result through", async () => {
		table.find.mockResolvedValue([]);
		expect(await db.getJA4Records()).toEqual([]);
	});

	test("a lookup matches on both the fingerprint and the user agent", async () => {
		await db.getJA4RecordByFingerprintAndUserAgent("fp", "ua");
		expect(table.findOne).toHaveBeenCalledWith({
			ja4_fingerprint: "fp",
			user_agent_string: "ua",
		});
	});

	test("a miss is null, not an error", async () => {
		expect(
			await db.getJA4RecordByFingerprintAndUserAgent("fp", "ua"),
		).toBeNull();
	});

	test("a failed query is propagated", async () => {
		table.find.mockRejectedValue(new Error("connection reset"));
		await expect(db.getJA4Records()).rejects.toThrow("connection reset");
	});
});

describe("addOrUpdateJA4Record", () => {
	beforeEach(async () => {
		stubSuperConnect(createConnectionMock(table));
		await db.connect();
	});

	test("inserts when there is no matching record", async () => {
		await db.addOrUpdateJA4Record(RECORD);
		expect(table.constructed).toEqual([RECORD]);
		expect(table.saved).toHaveBeenCalledOnce();
	});

	test("increments the count when there is one", async () => {
		const existing = createRecordMock(4);
		table.findOne.mockResolvedValue(existing);
		const result = await db.addOrUpdateJA4Record(RECORD);
		expect(existing.observation_count).toBe(5);
		expect(existing.save).toHaveBeenCalledOnce();
		expect(result).toBe(existing);
		expect(table.constructed).toEqual([]);
	});

	test("a record with no count so far starts from one", async () => {
		const existing = createRecordMock(undefined);
		table.findOne.mockResolvedValue(existing);
		await db.addOrUpdateJA4Record(RECORD);
		expect(existing.observation_count).toBe(1);
	});

	test("a count of zero is incremented, not treated as missing", async () => {
		const existing = createRecordMock(0);
		table.findOne.mockResolvedValue(existing);
		await db.addOrUpdateJA4Record(RECORD);
		expect(existing.observation_count).toBe(1);
	});

	test("looks up by the record's own fingerprint and user agent", async () => {
		await db.addOrUpdateJA4Record(RECORD);
		expect(table.findOne).toHaveBeenCalledWith({
			ja4_fingerprint: RECORD.ja4_fingerprint,
			user_agent_string: RECORD.user_agent_string,
		});
	});

	test("an empty user agent is looked up as the empty string", async () => {
		await db.addOrUpdateJA4Record({ ...RECORD, user_agent_string: "" });
		expect(table.findOne).toHaveBeenCalledWith({
			ja4_fingerprint: RECORD.ja4_fingerprint,
			user_agent_string: "",
		});
	});

	test("a failure to save is propagated", async () => {
		const existing = createRecordMock(1);
		existing.save.mockRejectedValue(new Error("duplicate key"));
		table.findOne.mockResolvedValue(existing);
		await expect(db.addOrUpdateJA4Record(RECORD)).rejects.toThrow(
			"duplicate key",
		);
	});
});
