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
import { describe, expect, it } from "vitest";
import { literal, string, union, z } from "zod";
import { enumMap } from "./enumMap.js";

describe("enumMap", () => {
	// Define a test enum using z.enum
	const TestEnum = z.enum(["a", "b", "c"]);

	const TestSchema = union([
		literal("value1"),
		literal("value2"),
		literal("value3"),
	]);

	it("creates a schema that validates objects with enum keys", () => {
		const schema = enumMap(TestEnum, TestSchema);

		const validObject = {
			a: "value1",
			b: "value2",
		};

		expect(() => schema.parse(validObject)).not.toThrow();
	});

	it("validates that all keys in the object are valid enum values", () => {
		const schema = enumMap(TestEnum, TestSchema);

		const invalidObject = {
			a: "value1",
			invalidKey: "value2", // This key is not in the enum
		};

		expect(() => schema.parse(invalidObject)).toThrow();
	});

	it("validates that all values in the object match the value schema", () => {
		const schema = enumMap(TestEnum, TestSchema);

		const invalidObject = {
			a: "invalidValue", // This value doesn't match the schema
		};

		expect(() => schema.parse(invalidObject)).toThrow();
	});

	it("accepts empty objects", () => {
		const schema = enumMap(TestEnum, TestSchema);

		expect(() => schema.parse({})).not.toThrow();
	});

	it("accepts partial enum coverage", () => {
		const schema = enumMap(TestEnum, TestSchema);

		const partialObject = {
			a: "value1",
		};

		expect(() => schema.parse(partialObject)).not.toThrow();
	});

	it("works with string schemas", () => {
		const stringSchema = string();
		const schema = enumMap(TestEnum, stringSchema);

		const validObject = {
			a: "any string",
			b: "another string",
		};

		expect(() => schema.parse(validObject)).not.toThrow();
	});
});
