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

import { describe, expectTypeOf, it } from "vitest";
import type { AllEnumValues, AllKeys, Keys } from "../utils.js";

describe("utils types", () => {
	describe("Keys", () => {
		it("should create partial record of type keys", () => {
			type TestType = {
				required: string;
				optional?: number;
			};

			type TestKeys = Keys<TestType>;

			expectTypeOf<TestKeys>().toMatchTypeOf<{
				required?: unknown;
				optional?: unknown;
			}>();
		});

		it("should work with nested types", () => {
			type NestedType = {
				nested: {
					value: string;
				};
			};

			type NestedKeys = Keys<NestedType>;

			expectTypeOf<NestedKeys>().toMatchTypeOf<{
				nested?: unknown;
			}>();
		});
	});

	describe("AllKeys", () => {
		it("should create complete record of type keys", () => {
			type TestType = {
				prop1: string;
				prop2: number;
			};

			type TestAllKeys = AllKeys<TestType>;

			expectTypeOf<TestAllKeys>().toMatchTypeOf<{
				prop1: unknown;
				prop2: unknown;
			}>();
		});

		it("should enforce all required properties", () => {
			type TestType = {
				required: string;
				optional?: number;
			};

			type TestAllKeys = AllKeys<TestType>;

			expectTypeOf<TestAllKeys>().toMatchTypeOf<{
				required: unknown;
				optional: unknown;
			}>();
		});
	});

	describe("AllEnumValues", () => {
		it("should create record from string enum", () => {
			type StringEnum = "value1" | "value2" | "value3";

			type EnumRecord = AllEnumValues<StringEnum>;

			expectTypeOf<EnumRecord>().toMatchTypeOf<{
				value1: unknown;
				value2: unknown;
				value3: unknown;
			}>();
		});

		it("should create record from number enum", () => {
			type NumberEnum = 1 | 2 | 3;

			type EnumRecord = AllEnumValues<NumberEnum>;

			expectTypeOf<EnumRecord>().toMatchTypeOf<{
				1: unknown;
				2: unknown;
				3: unknown;
			}>();
		});

		it("should work with single value enum", () => {
			type SingleEnum = "only";

			type EnumRecord = AllEnumValues<SingleEnum>;

			expectTypeOf<EnumRecord>().toMatchTypeOf<{
				only: unknown;
			}>();
		});
	});
});
