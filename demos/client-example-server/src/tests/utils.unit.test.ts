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

import type { Connection, Schema } from "mongoose";
import { beforeEach, describe, expect, test, vi } from "vitest";
import UserSchema, { type UserInterface } from "../models/user.js";
import connectionFactory from "../utils/connection.js";
import memoryServerSetup from "../utils/database.js";

/**
 * connectionFactory opens a real mongo connection and registers a model on
 * it. Both mongoose and the auto-increment plugin are replaced so the test
 * observes the wiring without a database.
 */
const mocks = vi.hoisted(() => ({
	createConnection: vi.fn(),
	models: {} as Record<string, unknown>,
	model: vi.fn(),
	plugin: vi.fn(),
	connectionOptions: vi.fn(),
	memoryUri: "mongodb://memory:27017/",
	memoryCreate: vi.fn(),
}));

vi.mock("mongoose", async (importOriginal) => {
	const actual = await importOriginal<typeof import("mongoose")>();
	return {
		...actual,
		default: {
			...actual.default,
			createConnection: (...args: unknown[]) => {
				mocks.createConnection(...args);
				return {
					models: mocks.models,
					model: mocks.model,
				} as unknown as Connection;
			},
		},
	};
});

vi.mock("@typegoose/auto-increment", () => ({
	AutoIncrementID: "auto-increment-plugin",
}));

vi.mock("@prosopo/database", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/database")>();
	return {
		...actual,
		getMongoConnectionOptions: (args: { url: string; appName: string }) => {
			mocks.connectionOptions(args);
			return { appName: args.appName };
		},
	};
});

vi.mock("mongodb-memory-server", () => ({
	MongoMemoryServer: {
		create: () => {
			mocks.memoryCreate();
			return Promise.resolve({ getUri: () => mocks.memoryUri });
		},
	},
}));

beforeEach(() => {
	mocks.createConnection.mockClear();
	mocks.model.mockClear();
	mocks.plugin.mockClear();
	mocks.connectionOptions.mockClear();
	mocks.memoryCreate.mockClear();
	mocks.models = {};
	vi.spyOn(UserSchema, "plugin").mockImplementation(
		(...args: unknown[]): Schema<UserInterface> => {
			mocks.plugin(...args);
			return UserSchema;
		},
	);
});

describe("connectionFactory", () => {
	const URI = "mongodb://localhost:27017/client-example";

	test("connects to the URI it was given", () => {
		connectionFactory(URI);
		expect(mocks.createConnection).toHaveBeenCalledTimes(1);
		expect(mocks.createConnection.mock.calls[0]?.[0]).toBe(URI);
	});

	test("names the connection after the module, for mongo's server logs", () => {
		connectionFactory(URI);
		const options = mocks.createConnection.mock.calls[0]?.[1] as {
			appName: string;
		};
		expect(options.appName).toContain("connection");
		expect(mocks.connectionOptions).toHaveBeenCalledWith({
			url: URI,
			appName: options.appName,
		});
	});

	test("registers the User model with auto-incrementing ids", () => {
		connectionFactory(URI);
		expect(mocks.plugin).toHaveBeenCalledWith("auto-increment-plugin", {
			field: "id",
		});
		expect(mocks.model).toHaveBeenCalledWith("User", UserSchema);
	});

	test("leaves an already-registered model alone", () => {
		// Re-registering throws in mongoose (OverwriteModelError), so the
		// factory has to be safe to call on a connection that has been set up.
		mocks.models = { user: {} };
		connectionFactory(URI);
		expect(mocks.model).not.toHaveBeenCalled();
		expect(mocks.plugin).not.toHaveBeenCalled();
	});

	test("returns the connection it created", () => {
		const connection = connectionFactory(URI);
		expect(connection.model).toBe(mocks.model);
	});
});

describe("memoryServerSetup", () => {
	test("boots an in-memory mongo and returns its URI", async () => {
		await expect(memoryServerSetup()).resolves.toBe(mocks.memoryUri);
		expect(mocks.memoryCreate).toHaveBeenCalledTimes(1);
	});

	test("each call gets its own server", async () => {
		await memoryServerSetup();
		await memoryServerSetup();
		expect(mocks.memoryCreate).toHaveBeenCalledTimes(2);
	});
});

describe("the User schema", () => {
	test("requires the fields a login needs to work", () => {
		// Without email, password and salt, a stored user cannot be logged in.
		for (const field of ["email", "password", "salt"]) {
			expect(UserSchema.path(field).isRequired).toBe(true);
		}
	});

	test("leaves name and id optional", () => {
		// `id` is filled in by the auto-increment plugin after validation.
		expect(UserSchema.path("name").isRequired).toBeFalsy();
		expect(UserSchema.path("id").isRequired).toBeFalsy();
	});

	test("stores the id as a number and the rest as strings", () => {
		expect(UserSchema.path("id").instance).toBe("Number");
		for (const field of ["email", "name", "password", "salt"]) {
			expect(UserSchema.path(field).instance).toBe("String");
		}
	});
});
