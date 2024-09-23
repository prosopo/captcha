// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import fs from "node:fs";
import path from "node:path";
import { LanguageSchema } from "../index.js";
import { describe, expect, test } from "vitest";

describe("logging", () => {
	test("Get all locale JSON files and ensure the keys are identical in each one", () => {
		const locales = LanguageSchema.options.values();
		const sectionKeys = new Set<string>();
		console.log("Local test running at ", path.resolve("."));
		const sectionKeysObj: { [key: string]: Set<string> } = {};
		const innerKeysObj: { [key: string]: { [key: string]: Set<string> } } = {};
		for (const locale of locales) {
			const localeData = fs.readFileSync(
				path.resolve(`./src/locales/${locale}.json`),
				"utf8",
			);
			const localeKeys = Object.keys(JSON.parse(localeData));
			for (const sectionKey of localeKeys) {
				sectionKeys.add(sectionKey);
			}
			sectionKeysObj[locale] = new Set(localeKeys);
			for (const sectionKey of localeKeys) {
				if (!innerKeysObj[locale]) {
					innerKeysObj[locale] = {};
				}
				// @ts-ignore
				if (!innerKeysObj[locale][sectionKey]) {
					// @ts-ignore
					innerKeysObj[locale][sectionKey] = new Set();
				}

				const innerKeys = Object.keys(JSON.parse(localeData)[sectionKey]);
				for (const innerKey of innerKeys) {
					// @ts-ignore
					innerKeysObj[locale][sectionKey].add(innerKey);
				}
			}
		}

		for (const locale of locales) {
			expect(sectionKeysObj[locale]).to.equal(sectionKeys);
			// @ts-ignore
			for (const sectionKey of sectionKeysObj[locale]) {
				// @ts-ignore
				expect(innerKeysObj[locale][sectionKey]).to.equal(
					// @ts-ignore
					innerKeysObj[locales.en][sectionKey],
				);
			}
		}
	});
});
