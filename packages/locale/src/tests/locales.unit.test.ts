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
import { describe, expect, test } from "vitest";
import { Languages } from "../index.js";

describe("logging", () => {
	test("Make sure the number of files present in the locales folder is the same size as the Languages array", () => {
		const locales = fs.readdirSync(path.resolve("./src/locales"));
		expect(locales.length).to.equal(Languages.length);
	});

	test("Get all locale JSON files and ensure the keys are identical in each one", () => {
		const locales = Languages;
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
				const innerKeys = JSON.parse(localeData)[sectionKey];
				if (typeof innerKeys !== "object") {
					continue;
				}

				if (!innerKeysObj[locale]) {
					innerKeysObj[locale] = {};
				}

				// @ts-ignore
				if (!innerKeysObj[locale][sectionKey]) {
					// @ts-ignore
					innerKeysObj[locale][sectionKey] = new Set();
				}

				for (const innerKey of Object.keys(innerKeys)) {
					// @ts-ignore
					innerKeysObj[locale][sectionKey].add(innerKey);
				}
			}
		}

		for (const locale of Array.from(locales)) {
			console.log("Checking", locale);
			expect(sectionKeysObj[locale]).to.deep.equal(sectionKeysObj.en);
			// @ts-ignore
			for (const sectionKey of Object.keys(innerKeysObj[locale])) {
				// @ts-ignore
				expect(innerKeysObj[locale][sectionKey]).to.deep.equal(
					// @ts-ignore
					innerKeysObj.en[sectionKey],
				);
			}
		}
	});
});
