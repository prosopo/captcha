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

import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import type { Logger } from "@prosopo/common";
import { describe, expectTypeOf, it } from "vitest";
import {
	processArgs,
	type AwaitedProcessedArgs,
	getAddress,
	getPassword,
	getSecret,
	getDB,
} from "../index.js";

/**
 * Type tests for CLI package exports
 * Tests that exported functions and types have correct signatures
 */
describe("CLI index exports - type tests", () => {
	describe("processArgs", () => {
		it("should accept correct parameters and return processed args", () => {
			// Type test: verify processArgs parameters
			expectTypeOf(processArgs)
				.parameter(0)
				.toMatchTypeOf<string[]>();
			expectTypeOf(processArgs)
				.parameter(1)
				.toMatchTypeOf<KeyringPair>();
			expectTypeOf(processArgs)
				.parameter(2)
				.toMatchTypeOf<KeyringPair>();
			expectTypeOf(processArgs)
				.parameter(3)
				.toMatchTypeOf<ProsopoConfigOutput>();

			// Type test: verify return type
			expectTypeOf(processArgs).returns.toMatchTypeOf<AwaitedProcessedArgs>();
		});
	});

	describe("AwaitedProcessedArgs", () => {
		it("should have correct structure", () => {
			// Type test: verify interface structure
			type Args = AwaitedProcessedArgs;

			expectTypeOf<Args["api"]>().toMatchTypeOf<boolean>();
			expectTypeOf<Args["_"]>().toMatchTypeOf<(string | number)[]>();
			expectTypeOf<Args["$0"]>().toMatchTypeOf<string>();

			// Should allow additional string properties
			expectTypeOf<Args>().toMatchTypeOf<Record<string, unknown>>();
		});
	});

	describe("process.env functions", () => {
		describe("getAddress", () => {
			it("should accept optional who parameter and return string or undefined", () => {
				// Type test: verify getAddress parameters
				expectTypeOf(getAddress)
					.parameter(0)
					.toMatchTypeOf<string | undefined>();

				// Type test: verify return type
				expectTypeOf(getAddress).returns.toMatchTypeOf<string | undefined>();
			});
		});

		describe("getPassword", () => {
			it("should accept optional who parameter and return string or undefined", () => {
				// Type test: verify getPassword parameters
				expectTypeOf(getPassword)
					.parameter(0)
					.toMatchTypeOf<string | undefined>();

				// Type test: verify return type
				expectTypeOf(getPassword).returns.toMatchTypeOf<string | undefined>();
			});
		});

		describe("getSecret", () => {
			it("should accept optional who parameter and return string or undefined", () => {
				// Type test: verify getSecret parameters
				expectTypeOf(getSecret)
					.parameter(0)
					.toMatchTypeOf<string | undefined>();

				// Type test: verify return type
				expectTypeOf(getSecret).returns.toMatchTypeOf<string | undefined>();
			});
		});

		describe("getDB", () => {
			it("should return string", () => {
				// Type test: verify getDB has no parameters and returns string
				expectTypeOf(getDB).parameters.toEqualTypeOf<[]>();
				expectTypeOf(getDB).returns.toMatchTypeOf<string>();
			});
		});
	});

	describe("defaultConfig", () => {
		it("should be a function that returns ProsopoConfigOutput", async () => {
			// Import the default export
			const { default: defaultConfig } = await import("../index.js");

			// Type test: verify defaultConfig is a function
			expectTypeOf(defaultConfig).toBeFunction();

			// Type test: verify it returns ProsopoConfigOutput
			expectTypeOf(defaultConfig).returns.toMatchTypeOf<ProsopoConfigOutput>();
		});
	});
});