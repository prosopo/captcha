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

import type { Account, RandomProvider } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { detect } from "../index.ts";

describe("detect - unit tests", () => {
	/**
	 * Test basic function properties and type safety.
	 * These tests focus on compile-time guarantees and basic runtime behavior.
	 */
	it("should be a function", () => {
		expect(typeof detect).toBe("function");
	});

	it("should return a Promise", () => {
		const result = detect();
		expect(result).toBeInstanceOf(Promise);
		// Catch any errors to prevent unhandled rejections
		result.catch(() => {
			// Ignore errors - obfuscated code may fail in test environment
		});
	});

	/**
	 * Test TypeScript type safety for the return value.
	 * This ensures the function signature matches the expected interface.
	 */
	it("types: should have correct return type", () => {
		const result: Promise<{
			token: string;
			encryptHeadHash: string;
			provider: RandomProvider;
			userAccount: Account;
		}> = detect();
		expect(result).toBeInstanceOf(Promise);
		// Catch any errors to prevent unhandled rejections
		result.catch(() => {
			// Ignore errors - obfuscated code may fail in test environment
		});
	});
});

