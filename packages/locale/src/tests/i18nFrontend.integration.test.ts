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

import { describe, expect, test } from "vitest";

// Import the frontend initialization function directly
// @ts-ignore - testing internal function
import { initializeI18n } from "../i18nFrontend.js";

describe("i18nFrontend direct initialization", () => {
	test("should call initializeI18n with callback and trigger code paths", async () => {
		let callbackCalled = false;
		let callbackI18n: any = null;

		// Call initializeI18n directly with a callback
		const i18n = initializeI18n((i18nInstance) => {
			callbackCalled = true;
			callbackI18n = i18nInstance;
		});

		// Wait for initialization to complete
		await new Promise((resolve) => {
			if (i18n.isInitialized) {
				resolve(undefined);
			} else {
				i18n.on("initialized", resolve);
			}
		});

		expect(i18n.isInitialized).toBe(true);
		expect(callbackCalled).toBe(true);
		expect(callbackI18n).toBe(i18n);
		expect(typeof i18n.t).toBe("function");
		expect(i18n.language).toBeDefined();
	}, 15000);

	test("should call initializeI18n without callback", async () => {
		// Call initializeI18n without a callback
		const i18n = initializeI18n();

		// Wait for initialization to complete
		await new Promise((resolve) => {
			if (i18n.isInitialized) {
				resolve(undefined);
			} else {
				i18n.on("initialized", resolve);
			}
		});

		expect(i18n.isInitialized).toBe(true);
		expect(typeof i18n.t).toBe("function");
	}, 15000);
});