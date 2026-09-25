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

// Drives vitest's own file collection over a fixture package, so the
// assertions are about which files actually run, not about glob strings.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createVitest } from "vitest/node";
import { parseTestTypes, testFileGlobs } from "./testFileGlobs.js";
import ViteTestConfig from "./vite.test.config.js";
import ViteThreadsTestConfig from "./vite.threads.test.config.js";

const FIXTURE_FILES: readonly string[] = [
	"src/untyped.test.ts",
	"src/typed.unit.test.ts",
	"src/typed.integration.test.ts",
	"src/nested/named.withDots.test.ts",
	"src/component.spec.tsx",
	"src/notATest.ts",
	"src/types.test-d.ts",
];

const ALL_RUNTIME_TESTS: readonly string[] = [
	"src/component.spec.tsx",
	"src/nested/named.withDots.test.ts",
	"src/typed.integration.test.ts",
	"src/typed.unit.test.ts",
	"src/untyped.test.ts",
];

let root: string;
let cwd: string;
let originalTestType: string | undefined;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-test-globs-"));
	for (const file of FIXTURE_FILES) {
		fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
		fs.writeFileSync(path.join(root, file), "export {};\n");
	}
	fs.writeFileSync(path.join(root, "package.json"), "{}");
	cwd = process.cwd();
	process.chdir(root);
	originalTestType = process.env.TEST_TYPE;
});

afterEach(() => {
	process.chdir(cwd);
	if (originalTestType === undefined) {
		// biome-ignore lint/performance/noDelete: restore absence, not ""
		delete process.env.TEST_TYPE;
	} else {
		process.env.TEST_TYPE = originalTestType;
	}
	fs.rmSync(root, { recursive: true, force: true });
});

type ConfigFactory = () => ReturnType<typeof ViteTestConfig>;

/** Files vitest would collect for `TEST_TYPE=testType` under `factory`. */
const collected = async (
	factory: ConfigFactory,
	testType: string | undefined,
): Promise<string[]> => {
	if (testType === undefined) {
		// biome-ignore lint/performance/noDelete: the config reads presence, not value
		delete process.env.TEST_TYPE;
	} else {
		process.env.TEST_TYPE = testType;
	}
	const config = factory();
	const vitest = await createVitest(
		"test",
		{ config: false, root, watch: false },
		{
			test: {
				include: config.test?.include,
				exclude: config.test?.exclude,
			},
		},
	);
	try {
		const specs = await vitest.globTestSpecifications();
		return specs
			.map((spec) =>
				path.relative(root, spec.moduleId).split(path.sep).join("/"),
			)
			.sort();
	} finally {
		await vitest.close();
	}
};

const without = (excluded: string): string[] =>
	ALL_RUNTIME_TESTS.filter((f) => f !== excluded);

describe.each([
	["ViteTestConfig", (): ReturnType<typeof ViteTestConfig> => ViteTestConfig()],
	[
		"ViteThreadsTestConfig",
		(): ReturnType<typeof ViteTestConfig> => ViteThreadsTestConfig(),
	],
])("%s test file collection", (_name: string, factory: ConfigFactory) => {
	it("collects every test file when TEST_TYPE is unset", async () => {
		expect(await collected(factory, undefined)).toEqual(ALL_RUNTIME_TESTS);
	});

	it("treats an empty TEST_TYPE as unset", async () => {
		expect(await collected(factory, "")).toEqual(ALL_RUNTIME_TESTS);
	});

	it("TEST_TYPE=unit keeps untyped tests and drops integration tests", async () => {
		expect(await collected(factory, "unit")).toEqual(
			without("src/typed.integration.test.ts"),
		);
	});

	it("TEST_TYPE=integration keeps untyped tests and drops unit tests", async () => {
		expect(await collected(factory, "integration")).toEqual(
			without("src/typed.unit.test.ts"),
		);
	});

	it("accepts a spaced, comma-separated list", async () => {
		expect(await collected(factory, " unit , integration ")).toEqual(
			ALL_RUNTIME_TESTS,
		);
	});
});

describe("testFileGlobs", () => {
	it("excludes nothing without a filter", () => {
		expect(testFileGlobs(undefined).exclude).toEqual([]);
	});

	it("excludes only the known types that were not selected", () => {
		expect(testFileGlobs("unit").exclude).toEqual([
			"src/**/*.@(integration).@(test|spec).@(mts|cts|mjs|cjs|js|ts|tsx|jsx)",
		]);
	});

	it("parses the list, dropping blanks", () => {
		expect(parseTestTypes(" unit, ,integration ")).toEqual([
			"unit",
			"integration",
		]);
	});
});
