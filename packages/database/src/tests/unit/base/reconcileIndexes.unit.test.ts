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
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { type Connection, type Model, Schema } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	defaultIndexName,
	reconcileIndexes,
} from "../../../base/reconcileIndexes.js";

interface Doc {
	a?: string;
	b?: string;
	pending?: boolean;
}

interface LiveIndex {
	name: string;
	key: Record<string, number>;
	unique?: boolean;
	partialFilterExpression?: Record<string, unknown>;
}

describe("reconcileIndexes", () => {
	let mongod: MongoMemoryServer;
	let connection: Connection;
	let modelCount = 0;

	beforeAll(async () => {
		mongod = await MongoMemoryServer.create();
		connection = await mongoose
			.createConnection(mongod.getUri(), { autoIndex: false })
			.asPromise();
	}, 90_000);

	afterAll(async () => {
		await connection.close();
		await mongod.stop();
	}, 30_000);

	beforeEach(() => {
		modelCount += 1;
	});

	const modelFor = (schema: Schema<Doc>): Model<Doc> =>
		connection.model<Doc>(`Reconcile${modelCount}`, schema);

	const liveIndexes = async (model: Model<Doc>): Promise<LiveIndex[]> => {
		const indexes = await model.collection.listIndexes().toArray();
		return indexes
			.filter((index) => index.name !== "_id_")
			.map((index) => ({
				name: index.name ?? "",
				key: index.key as Record<string, number>,
				...(index.unique !== undefined && { unique: index.unique }),
				...(index.partialFilterExpression !== undefined && {
					partialFilterExpression: index.partialFilterExpression,
				}),
			}));
	};

	it("names indexes the way mongo does", () => {
		expect(defaultIndexName({ a: 1, "b.c": -1 })).toBe("a_1_b.c_-1");
	});

	it("creates declared indexes on a collection that does not exist yet", async () => {
		const schema = new Schema<Doc>({ a: String });
		schema.index({ a: 1 });
		const model = modelFor(schema);

		const result = await reconcileIndexes(model);

		expect(result.created).toEqual(["a_1"]);
		expect(result.dropped).toEqual([]);
		expect(await liveIndexes(model)).toEqual([{ name: "a_1", key: { a: 1 } }]);
	});

	it("leaves an index that already matches alone", async () => {
		const schema = new Schema<Doc>({ a: String });
		schema.index({ a: 1 });
		const model = modelFor(schema);
		await model.createCollection();
		await model.collection.createIndex({ a: 1 });

		const result = await reconcileIndexes(model);

		expect(result).toMatchObject({ created: [], dropped: [], failed: [] });
	});

	it("treats a same-key index under another name as a match", async () => {
		const schema = new Schema<Doc>({ a: String, b: String });
		schema.index({ a: 1, b: 1 });
		const model = modelFor(schema);
		await model.createCollection();
		await model.collection.createIndex({ a: 1, b: 1 }, { name: "hand_made" });

		const result = await reconcileIndexes(model);

		expect(result).toMatchObject({ created: [], dropped: [], failed: [] });
	});

	it("rebuilds an index whose key changed under the same name", async () => {
		const schema = new Schema<Doc>({ pending: Boolean });
		schema.index(
			{ pending: 1, _id: 1 },
			{ name: "pending_partial", partialFilterExpression: { pending: true } },
		);
		const model = modelFor(schema);
		await model.createCollection();
		await model.collection.createIndex(
			{ pending: 1 },
			{ name: "pending_partial", partialFilterExpression: { pending: true } },
		);

		const result = await reconcileIndexes(model);

		expect(result).toMatchObject({
			dropped: ["pending_partial"],
			created: ["pending_partial"],
			failed: [],
		});
		expect(await liveIndexes(model)).toEqual([
			{
				name: "pending_partial",
				key: { pending: 1, _id: 1 },
				partialFilterExpression: { pending: true },
			},
		]);
	});

	it("makes an existing non-unique index unique", async () => {
		const schema = new Schema<Doc>({ a: String });
		schema.index({ a: 1 }, { unique: true });
		const model = modelFor(schema);
		await model.insertMany([{ a: "x" }, { a: "y" }]);
		await model.collection.createIndex({ a: 1 });

		const result = await reconcileIndexes(model);

		expect(result).toMatchObject({
			dropped: ["a_1"],
			created: ["a_1"],
			failed: [],
		});
		expect(await liveIndexes(model)).toEqual([
			{ name: "a_1", key: { a: 1 }, unique: true },
		]);
	});

	it("restores the old index when its unique replacement meets duplicates", async () => {
		const schema = new Schema<Doc>({ a: String });
		schema.index({ a: 1 }, { unique: true });
		const model = modelFor(schema);
		await model.insertMany([{ a: "x" }, { a: "x" }]);
		await model.collection.createIndex({ a: 1 });

		const result = await reconcileIndexes(model);

		expect(result.dropped).toEqual(["a_1"]);
		expect(result.created).toEqual([]);
		expect(result.restored).toEqual(["a_1"]);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0]?.error).toMatch(/duplicate key/i);
		expect(await liveIndexes(model)).toEqual([{ name: "a_1", key: { a: 1 } }]);
	});

	it("keeps undeclared indexes unless told they are obsolete", async () => {
		const schema = new Schema<Doc>({ a: String, b: String });
		schema.index({ a: 1 });
		const model = modelFor(schema);
		await model.createCollection();
		await model.collection.createIndex({ a: 1 });
		await model.collection.createIndex({ b: 1 });
		await model.collection.createIndex({ a: 1, b: 1 });

		const kept = await reconcileIndexes(model);
		expect(kept.dropped).toEqual([]);

		const pruned = await reconcileIndexes(model, { obsolete: ["b_1"] });
		expect(pruned.dropped).toEqual(["b_1"]);
		expect((await liveIndexes(model)).map((index) => index.name)).toEqual([
			"a_1",
			"a_1_b_1",
		]);
	});

	it("never drops a declared index named as obsolete", async () => {
		const schema = new Schema<Doc>({ a: String });
		schema.index({ a: 1 });
		const model = modelFor(schema);
		await model.createCollection();
		await model.collection.createIndex({ a: 1 });

		const result = await reconcileIndexes(model, { obsolete: ["a_1"] });

		expect(result.dropped).toEqual([]);
	});

	it("drops every undeclared index when the schema owns the collection", async () => {
		const schema = new Schema<Doc>({ a: String, b: String });
		schema.index({ a: 1 });
		const model = modelFor(schema);
		await model.createCollection();
		await model.collection.createIndex({ a: 1 });
		await model.collection.createIndex({ b: 1 });

		const result = await reconcileIndexes(model, { dropUndeclared: true });

		expect(result.dropped).toEqual(["b_1"]);
		expect(await liveIndexes(model)).toEqual([{ name: "a_1", key: { a: 1 } }]);
	});

	it("reports the plan without changing anything on a dry run", async () => {
		const schema = new Schema<Doc>({ a: String, b: String });
		schema.index({ a: 1 }, { unique: true });
		const model = modelFor(schema);
		await model.createCollection();
		await model.collection.createIndex({ a: 1 });
		await model.collection.createIndex({ b: 1 });

		const result = await reconcileIndexes(model, {
			dryRun: true,
			dropUndeclared: true,
		});

		expect(result.dropped.sort()).toEqual(["a_1", "b_1"]);
		expect(result.created).toEqual(["a_1"]);
		expect(await liveIndexes(model)).toEqual([
			{ name: "a_1", key: { a: 1 } },
			{ name: "b_1", key: { b: 1 } },
		]);
	});

	describe("extra indexes", () => {
		it("creates the missing ones alongside the schema's", async () => {
			const schema = new Schema<Doc>({ a: String, b: String });
			schema.index({ a: 1 });
			const model = modelFor(schema);

			const result = await reconcileIndexes(model, {
				extra: [{ key: { b: 1 }, name: "b_probe" }],
			});

			expect(result.created).toEqual(["a_1", "b_probe"]);
			expect((await liveIndexes(model)).map((index) => index.name)).toEqual([
				"a_1",
				"b_probe",
			]);
		});

		it("counts an index with the same key under another name as present", async () => {
			const model = modelFor(new Schema<Doc>({ b: String }));
			await model.createCollection();
			await model.collection.createIndex({ b: 1 }, { name: "hand_made" });

			const result = await reconcileIndexes(model, {
				extra: [{ key: { b: 1 }, name: "b_probe" }],
			});

			expect(result).toMatchObject({ created: [], dropped: [], failed: [] });
		});

		it("keeps them when every undeclared index is dropped", async () => {
			const model = modelFor(new Schema<Doc>({ a: String, b: String }));
			await model.createCollection();
			await model.collection.createIndex({ a: 1 });
			await model.collection.createIndex({ b: 1 });

			const result = await reconcileIndexes(model, {
				dropUndeclared: true,
				extra: [{ key: { b: 1 } }],
			});

			expect(result.dropped).toEqual(["a_1"]);
			expect((await liveIndexes(model)).map((index) => index.name)).toEqual([
				"b_1",
			]);
		});

		it("lists the missing ones on a dry run without building them", async () => {
			const model = modelFor(new Schema<Doc>({ b: String }));
			await model.createCollection();

			const result = await reconcileIndexes(model, {
				dryRun: true,
				extra: [{ key: { b: 1 } }],
			});

			expect(result.created).toEqual(["b_1"]);
			expect(await liveIndexes(model)).toEqual([]);
		});

		it("leaves one the schema already declares to the schema", async () => {
			const schema = new Schema<Doc>({ b: String });
			schema.index({ b: 1 });
			const model = modelFor(schema);

			const result = await reconcileIndexes(model, {
				extra: [{ key: { b: 1 } }],
			});

			expect(result.created).toEqual(["b_1"]);
		});

		it("reports one that fails to build", async () => {
			const model = modelFor(new Schema<Doc>({ b: String }));
			await model.insertMany([{ b: "x" }, { b: "x" }]);

			const result = await reconcileIndexes(model, {
				extra: [{ key: { b: 1 }, unique: true }],
			});

			expect(result.created).toEqual([]);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0]?.error).toMatch(/duplicate key/i);
		});
	});

	it("waits for a connection that is still opening", async () => {
		const opening = mongoose.createConnection(mongod.getUri(), {
			autoIndex: false,
		});
		const schema = new Schema<Doc>({ a: String });
		schema.index({ a: 1 });
		const model = opening.model<Doc>(`ReconcileOpening${modelCount}`, schema);

		const result = await reconcileIndexes(model);

		expect(result.created).toEqual(["a_1"]);
		await opening.close();
	});

	it("turns a field-level expires into a TTL index", async () => {
		const schema = new Schema<{ at: Date }>({
			at: { type: Date, expires: 60 },
		});
		const model = connection.model(`ReconcileTtl${modelCount}`, schema);

		await reconcileIndexes(model);

		const ttl = await model.collection.indexInformation({ full: true });
		expect(ttl.find((index) => index.name === "at_1")).toMatchObject({
			expireAfterSeconds: 60,
		});
	});
});
