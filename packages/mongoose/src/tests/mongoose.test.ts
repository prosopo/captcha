// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import type { Connection } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import {
	createModelFromZodSchema,
	createMongooseConnection,
	createSchemaBuilder,
	createSchemaWithMiddleware,
	getOrCreateModel,
} from "../index.js";

describe("Mongoose utilities", () => {
	let mongoServer: MongoMemoryServer;
	let connection: Connection;

	beforeAll(async () => {
		mongoServer = await MongoMemoryServer.create();
		const uri = mongoServer.getUri();
		connection = await createMongooseConnection({
			url: uri,
			dbname: "test",
		});
	});

	afterAll(async () => {
		await connection.close();
		await mongoServer.stop();
	});

	describe("createMongooseConnection", () => {
		it("should create a connection to MongoDB", async () => {
			expect(connection).toBeDefined();
			expect(connection.readyState).toBe(1); // 1 = connected
		});
	});

	describe("createSchemaWithMiddleware", () => {
		it("should create a schema with timestamps", () => {
			interface TestDoc {
				name: string;
				createdAt?: Date;
				updatedAt?: Date;
			}

			const schema = createSchemaWithMiddleware<TestDoc>({
				name: { type: String, required: true },
			});

			expect(schema.path("createdAt")).toBeDefined();
			expect(schema.path("updatedAt")).toBeDefined();
		});

		it("should set createdAt and updatedAt on save", async () => {
			interface TestDoc {
				name: string;
				createdAt?: Date;
				updatedAt?: Date;
			}

			const schema = createSchemaWithMiddleware<TestDoc>({
				name: { type: String, required: true },
			});
			const Model = connection.model("TestSave", schema);

			const doc = new Model({ name: "test" });
			await doc.save();

			const savedDoc = doc.toObject() as TestDoc;
			expect(savedDoc.createdAt).toBeInstanceOf(Date);
			expect(savedDoc.updatedAt).toBeInstanceOf(Date);
		});

		it("should update updatedAt on subsequent saves", async () => {
			interface TestDoc {
				name: string;
				createdAt?: Date;
				updatedAt?: Date;
			}

			const schema = createSchemaWithMiddleware<TestDoc>({
				name: { type: String, required: true },
			});
			const Model = connection.model("TestUpdate", schema);

			const doc = new Model({ name: "test" });
			await doc.save();

			const savedDoc = doc.toObject() as TestDoc;
			const originalCreatedAt = savedDoc.createdAt;
			const originalUpdatedAt = savedDoc.updatedAt;

			// Wait a bit to ensure different timestamp
			await new Promise((resolve) => setTimeout(resolve, 10));

			doc.name = "updated";
			await doc.save();

			const updatedDoc = doc.toObject() as TestDoc;
			expect(updatedDoc.createdAt).toEqual(originalCreatedAt);
			expect(updatedDoc.updatedAt?.getTime()).toBeGreaterThan(
				originalUpdatedAt?.getTime() || 0,
			);
		});

		it("should increment __v on update operations", async () => {
			interface TestDoc {
				name: string;
				createdAt?: Date;
				updatedAt?: Date;
			}

			const schema = createSchemaWithMiddleware<TestDoc>({
				name: { type: String, required: true },
			});
			const Model = connection.model("TestVersion", schema);

			const doc = new Model({ name: "test" });
			await doc.save();

			const originalVersion = doc.__v;

			await Model.updateOne({ _id: doc._id }, { name: "updated" });

			const updated = await Model.findById(doc._id);
			expect(updated?.__v).toBe((originalVersion || 0) + 1);
		});

		it("should not overwrite createdAt on updates", async () => {
			interface TestDoc {
				name: string;
				createdAt?: Date;
				updatedAt?: Date;
			}

			const schema = createSchemaWithMiddleware<TestDoc>({
				name: { type: String, required: true },
			});
			const Model = connection.model("TestCreatedAtProtection", schema);

			const doc = new Model({ name: "test" });
			await doc.save();

			const savedDoc = doc.toObject() as TestDoc;
			const originalCreatedAt = savedDoc.createdAt;

			await Model.updateOne(
				{ _id: doc._id },
				{ name: "updated", createdAt: new Date() },
			);

			const updated = await Model.findById(doc._id);
			const updatedDoc = updated?.toObject() as TestDoc;
			expect(updatedDoc?.createdAt).toEqual(originalCreatedAt);
		});
	});

	describe("getOrCreateModel", () => {
		it("should return the same model instance when called multiple times", () => {
			const schema = createSchemaWithMiddleware({
				name: { type: String, required: true },
			});

			const Model1 = getOrCreateModel(connection, "CachedModel", schema);
			const Model2 = getOrCreateModel(connection, "CachedModel", schema);

			expect(Model1).toBe(Model2);
		});
	});

	describe("createSchemaBuilder", () => {
		it("should create a schema and model factory", () => {
			const builder = createSchemaBuilder({
				name: { type: String, required: true },
			});

			expect(builder.schema).toBeDefined();
			expect(builder.createModel).toBeDefined();

			const Model = builder.createModel(connection, "BuiltModel");
			expect(Model).toBeDefined();
		});
	});

	describe("createModelFromZodSchema", () => {
		it("should create a model from a Zod schema", () => {
			const zodSchema = z.object({
				name: z.string(),
				age: z.number(),
			});

			const Model = createModelFromZodSchema(
				connection,
				"ZodModel",
				zodSchema,
			);
			expect(Model).toBeDefined();
		});

		it("should validate data with Zod on save", async () => {
			const zodSchema = z.object({
				name: z.string(),
				age: z.number().min(0).max(120),
			});

			const Model = createModelFromZodSchema(
				connection,
				"ZodValidation",
				zodSchema,
			);

			// Valid data should work
			const validDoc = new Model({ name: "John", age: 30 });
			await expect(validDoc.save()).resolves.toBeDefined();

			// Invalid data should fail
			const invalidDoc = new Model({ name: "Jane", age: 150 });
			await expect(invalidDoc.save()).rejects.toThrow();
		});

		it("should validate updates with Zod", async () => {
			const zodSchema = z.object({
				name: z.string().min(1),
				age: z.number(),
			});

			const Model = createModelFromZodSchema(
				connection,
				"ZodUpdateValidation",
				zodSchema,
			);

			const doc = new Model({ name: "John", age: 30 });
			await doc.save();

			// Invalid update should fail
			await expect(
				Model.updateOne({ _id: doc._id }, { name: "" }),
			).rejects.toThrow();
		});

		it("should handle optional fields in Zod schema", async () => {
			const zodSchema = z.object({
				name: z.string(),
				email: z.string().email().optional(),
			});

			const Model = createModelFromZodSchema(
				connection,
				"ZodOptional",
				zodSchema,
			);

			const doc1 = new Model({ name: "John" });
			await expect(doc1.save()).resolves.toBeDefined();

			const doc2 = new Model({ name: "Jane", email: "jane@example.com" });
			await expect(doc2.save()).resolves.toBeDefined();
		});

		it("should include timestamp fields from middleware", async () => {
			interface TestDoc {
				name: string;
				createdAt?: Date;
				updatedAt?: Date;
			}

			const zodSchema = z.object({
				name: z.string(),
			});

			const Model = createModelFromZodSchema(
				connection,
				"ZodTimestamps",
				zodSchema,
			);

			const doc = new Model({ name: "test" });
			await doc.save();

			const savedDoc = doc.toObject() as TestDoc;
			expect(savedDoc.createdAt).toBeInstanceOf(Date);
			expect(savedDoc.updatedAt).toBeInstanceOf(Date);
		});
	});
});
