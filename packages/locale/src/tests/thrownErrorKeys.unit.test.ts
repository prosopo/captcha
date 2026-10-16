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
import translationEn from "../locales/en/translation.json" with {
	type: "json",
};

// Error classes and ResultReason carry a catalogue key. A key with no entry
// reaches users and logs untranslated, so every one used in the workspace's
// source must exist in the English catalogue (the parity test in
// locales.unit.test.ts carries it to every other locale).

const PACKAGES_DIR = path.resolve("..");
const THROWN_KEY = /Error\(\s*["']([A-Z][A-Z_]*\.[A-Z0-9_]+)["']/g;
const REASON_KEY = /=\s*"([A-Z][A-Z_]*\.[A-Z0-9_]+)"/g;

const isCatalogueKey = (key: string): boolean => {
	const [section, name] = key.split(".");
	const entries: Record<string, unknown> | undefined =
		section && section in translationEn
			? translationEn[section as keyof typeof translationEn]
			: undefined;
	return name !== undefined && entries !== undefined && name in entries;
};

const sourceFiles = (dir: string): string[] =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: fs.Dirent) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "tests" || entry.name === "node_modules"
				? []
				: sourceFiles(full);
		}
		return entry.name.endsWith(".ts") && !entry.name.includes(".test.")
			? [full]
			: [];
	});

const workspaceSources = (): string[] =>
	fs
		.readdirSync(PACKAGES_DIR)
		.map((name: string) => path.join(PACKAGES_DIR, name, "src"))
		.filter((dir: string) => fs.existsSync(dir))
		.flatMap(sourceFiles);

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

describe("error keys", () => {
	test("every key an error class is constructed with is in the catalogue", () => {
		expect(uncataloguedKeys(workspaceSources(), THROWN_KEY)).toEqual([]);
	});

	test("every ResultReason is in the catalogue", () => {
		const reasons = path.join(PACKAGES_DIR, "types/src/provider/reasons.ts");
		expect(uncataloguedKeys([reasons], REASON_KEY)).toEqual([]);
	});

	test("the scan finds the keys it is looking for", () => {
		const found = workspaceSources().flatMap((file: string) =>
			[...fs.readFileSync(file, "utf8").matchAll(THROWN_KEY)].map(
				(match: RegExpMatchArray) => match[1],
			),
		);
		expect(found).toContain("DATABASE.DATABASE_IMPORT_FAILED");
		expect(found.length).toBeGreaterThan(100);
	});
});
