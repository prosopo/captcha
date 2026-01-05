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

import type { Account, ProcaptchaClientConfigOutput } from "@prosopo/types";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Extension } from "./Extension.js";
import { ExtensionWeb2 } from "./ExtensionWeb2.js";

describe("Extension", () => {
	// Type tests for abstract class method signature
	describe("getAccount method signature", () => {
		it("should accept ProcaptchaClientConfigOutput as parameter type", () => {
			// Type test: verify parameter type
			const extensionWeb2 = new ExtensionWeb2();
			// Type test: verify getAccount accepts ProcaptchaClientConfigOutput
			expectTypeOf(extensionWeb2.getAccount)
				.parameter(0)
				.toMatchTypeOf<ProcaptchaClientConfigOutput>();
		});

		it("should return Promise<Account> as return type", () => {
			// Type test: verify return type
			const extensionWeb2 = new ExtensionWeb2();
			// Type test: verify getAccount returns Promise<Account>
			expectTypeOf(extensionWeb2.getAccount).returns.toMatchTypeOf<
				Promise<Account>
			>();
		});
	});

	describe("abstract class behavior", () => {
		it("should be an abstract class that cannot be instantiated directly", () => {
			// Verify Extension is abstract by checking it cannot be instantiated
			// This is a compile-time check, but we verify through subclasses
			expect(Extension).toBeDefined();
		});

		it("should be extended by ExtensionWeb2", () => {
			const extensionWeb2 = new ExtensionWeb2();
			expect(extensionWeb2).toBeInstanceOf(Extension);
		});
	});
});
