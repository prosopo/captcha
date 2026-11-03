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
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { isTranslationKey } from "../serverTranslationKeys.js";

// ResultReason carries a catalogue key. A key with no entry reaches users
// untranslated, so every one must exist in the English catalogue (the parity
// test in locales.unit.test.ts carries it to every other locale).

const PACKAGES_DIR = path.resolve("..");
const REASON_KEY = /=\s*"([A-Z][A-Z_]*\.[A-Z0-9_]+)"/g;

// Whichever namespace file holds it (see NAMESPACES in translationKey.ts).
const isCatalogueKey = (key: string): boolean => isTranslationKey(key);

const uncataloguedKeys = (files: string[], pattern: RegExp): string[] => {
	const missing = new Set<string>();
	for (const file of files) {
		for (const match of fs.readFileSync(file, "utf8").matchAll(pattern)) {
			const key = match[1];
			if (key && !isCatalogueKey(key)) {
				missing.add(`${key} (${path.relative(PACKAGES_DIR, file)})`);
			}
		}
	}
	return [...missing].sort();
};

describe("ResultReason keys", () => {
	test("every ResultReason is in the catalogue", () => {
		const reasons = path.join(PACKAGES_DIR, "types/src/provider/reasons.ts");
		expect(uncataloguedKeys([reasons], REASON_KEY)).toEqual([]);
	});
});
