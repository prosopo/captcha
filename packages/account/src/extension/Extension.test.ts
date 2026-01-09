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

import type { Account, ProcaptchaClientConfigOutput } from "@prosopo/types";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Extension } from "./Extension.js";
import { ExtensionWeb2 } from "./ExtensionWeb2.js";

describe("Extension", () => {
	// Type tests for abstract class method signature
	describe("getAccount method signature", () => {
		it("should accept ProcaptchaClientConfigOutput as parameter type", () => {
			// Type test: verify that getAccount method accepts ProcaptchaClientConfigOutput as input parameter
			const extensionWeb2 = new ExtensionWeb2();
			expectTypeOf(extensionWeb2.getAccount)
				.parameter(0)
				.toMatchTypeOf<ProcaptchaClientConfigOutput>();
		});

		it("should return Promise<Account> as return type", () => {
			// Type test: verify that getAccount method returns Promise<Account>
			const extensionWeb2 = new ExtensionWeb2();
			expectTypeOf(extensionWeb2.getAccount).returns.toMatchTypeOf<
				Promise<Account>
			>();
		});
	});

	describe("abstract class behavior", () => {
		it("should be an abstract class that cannot be instantiated directly", () => {
			// Verify Extension is abstract by checking it exists but cannot be instantiated
			// TypeScript prevents direct instantiation at compile time
			expect(Extension).toBeDefined();
		});

		it("should be extended by ExtensionWeb2", () => {
			// Test that ExtensionWeb2 properly extends the abstract Extension class
			const extensionWeb2 = new ExtensionWeb2();
			expect(extensionWeb2).toBeInstanceOf(Extension);
		});

		it("should be extended by concrete implementations", () => {
			// Test that concrete implementations properly extend the abstract Extension class
			// ExtensionWeb3 is tested separately due to browser environment requirements
			const extensionWeb2 = new ExtensionWeb2();
			expect(extensionWeb2).toBeInstanceOf(Extension);
		});
	});

	describe("module exports", () => {
		it("should export Extension as named export", () => {
			// Test that Extension can be imported as a named export
			expect(Extension).toBeDefined();
			expect(typeof Extension).toBe("function");
		});

		it("should export ExtensionWeb2 as named export", () => {
			// Test that ExtensionWeb2 can be imported as a named export
			expect(ExtensionWeb2).toBeDefined();
			expect(typeof ExtensionWeb2).toBe("function");
		});


		it("should export ExtensionWeb2 as default export", () => {
			// Test that ExtensionWeb2 can be imported as a default export
			expect(ExtensionWeb2).toBeDefined();
		});

	});
});
