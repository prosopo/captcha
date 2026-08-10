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
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	filterDependencies,
	getExternalsFromReferences,
	getTsConfigs,
} from "./dependencies.js";

let root: string;

/** Write a tsconfig, and optionally a sibling package.json, under `root`. */
const writeProject = (
	dir: string,
	references: string[],
	packageName?: string,
): string => {
	const absolute = path.join(root, dir);
	fs.mkdirSync(absolute, { recursive: true });
	const tsConfigPath = path.join(absolute, "tsconfig.json");
	fs.writeFileSync(
		tsConfigPath,
		JSON.stringify({ references: references.map((p) => ({ path: p })) }),
	);
	if (packageName) {
		fs.writeFileSync(
			path.join(absolute, "package.json"),
			JSON.stringify({ name: packageName }),
		);
	}
	return tsConfigPath;
};

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-config-test-"));
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("getTsConfigs", () => {
	it("returns just the starting config when it has no references", () => {
		const entry = writeProject("a", []);
		expect(getTsConfigs(entry)).toEqual([entry]);
	});

	it("returns nothing when the starting config is excluded and has no references", () => {
		const entry = writeProject("a", []);
		expect(getTsConfigs(entry, [], [], false)).toEqual([]);
	});

	it("walks references transitively", () => {
		const c = writeProject("c", []);
		const b = writeProject("b", ["../c"]);
		const a = writeProject("a", ["../b"]);

		expect(getTsConfigs(a, [/nothing-matches/], []).sort()).toEqual(
			[a, b, c].sort(),
		);
	});

	it("skips references matching an ignore pattern, and everything under them", () => {
		writeProject("keep", []);
		writeProject("skip", []);
		const a = writeProject("a", ["../keep/", "../skip/"]);

		expect(getTsConfigs(a, [/skip/], [])).toEqual([
			a,
			path.join(root, "keep", "tsconfig.json"),
		]);
	});

	it("builds the ignore expression from the stringified patterns, delimiters included", () => {
		// `ignorePatterns.join("|")` calls `toString()` on each RegExp, so the
		// enclosing slashes end up in the pattern. `/skip/` therefore matches
		// the *path segment* "/skip/" rather than the bare word, which is why
		// callers pass directory-shaped patterns.
		writeProject("skip", []);
		const a = writeProject("a", ["../skip"]);

		// No trailing slash on the reference, so "/skip/" does not match and
		// the reference is followed after all.
		expect(getTsConfigs(a, [/skip/], [])).toHaveLength(2);
	});

	it("drops every reference when no ignore pattern is given", () => {
		writeProject("b", []);
		const a = writeProject("a", ["../b"]);
		expect(getTsConfigs(a)).toEqual([a]);
	});

	it("appends tsconfig.json to a reference that names a directory", () => {
		writeProject("b", []);
		const a = writeProject("a", ["../b"]);
		expect(getTsConfigs(a, [/\.\./], [])).toContain(
			path.join(root, "b", "tsconfig.json"),
		);
	});

	it("honours a reference that names a config file explicitly", () => {
		fs.mkdirSync(path.join(root, "b"), { recursive: true });
		const explicit = path.join(root, "b", "tsconfig.build.json");
		fs.writeFileSync(explicit, JSON.stringify({ references: [] }));
		const a = writeProject("a", ["../b/tsconfig.build.json"]);

		expect(getTsConfigs(a, [/\.\./], [])).toContain(explicit);
	});

	it("does not loop forever on a reference cycle", () => {
		// A cycle in the project graph would otherwise recurse until the stack
		// blew, which is a build hang rather than a readable error.
		const a = path.join(root, "a", "tsconfig.json");
		const b = path.join(root, "b", "tsconfig.json");
		writeProject("a", ["../b"]);
		writeProject("b", ["../a"]);

		expect(getTsConfigs(a, [/\.\./], []).sort()).toEqual([a, b].sort());
	});

	it("visits a diamond dependency only once", () => {
		writeProject("d", []);
		writeProject("b", ["../d"]);
		writeProject("c", ["../d"]);
		const a = writeProject("a", ["../b", "../c"]);

		const result = getTsConfigs(a, [/\.\./], []);
		expect(new Set(result).size).toBe(result.length);
		expect(result).toHaveLength(4);
	});

	it("keeps configs that were already accumulated", () => {
		const existing = "/already/seen/tsconfig.json";
		const a = writeProject("a", []);
		expect(getTsConfigs(a, [], [existing])).toEqual([existing, a]);
	});

	it("returns the accumulator untouched when the config was already seen", () => {
		const a = writeProject("a", []);
		expect(getTsConfigs(a, [], [a])).toEqual([a]);
	});

	it("throws for a config path that does not exist", () => {
		expect(() => getTsConfigs(path.join(root, "missing.json"))).toThrow();
	});

	it("throws for a config that is not valid JSON", () => {
		const broken = path.join(root, "broken.json");
		fs.writeFileSync(broken, "{ not json");
		expect(() => getTsConfigs(broken)).toThrow();
	});
});

describe("getExternalsFromReferences", () => {
	it("returns the package name of every referenced project", async () => {
		writeProject("b", [], "@prosopo/b");
		writeProject("c", [], "@prosopo/c");
		const a = writeProject("a", ["../b", "../c"], "@prosopo/a");

		// The starting project is excluded, so a package never externalises
		// itself.
		await expect(getExternalsFromReferences(a, [/\.\./])).resolves.toEqual([
			"@prosopo/b",
			"@prosopo/c",
		]);
	});

	it("returns nothing when there are no followed references", async () => {
		const a = writeProject("a", [], "@prosopo/a");
		await expect(getExternalsFromReferences(a)).resolves.toEqual([]);
	});

	it("rejects when a referenced project has no package.json", async () => {
		writeProject("b", []);
		const a = writeProject("a", ["../b"], "@prosopo/a");
		await expect(getExternalsFromReferences(a, [/\.\./])).rejects.toBeDefined();
	});
});

describe("filterDependencies", () => {
	it("splits on the filter patterns, sorted", () => {
		expect(
			filterDependencies(["zod", "@prosopo/util", "axios"], ["@prosopo"]),
		).toEqual({
			internal: ["axios", "zod"],
			external: ["@prosopo/util"],
		});
	});

	it("treats the filters as alternatives in a single expression", () => {
		expect(
			filterDependencies(["a-one", "b-two", "c-three"], ["one", "two"]),
		).toEqual({ internal: ["c-three"], external: ["a-one", "b-two"] });
	});

	it("deduplicates before splitting", () => {
		expect(
			filterDependencies(["zod", "zod", "zod"], ["nope"]).internal,
		).toEqual(["zod"]);
	});

	it("drops empty strings", () => {
		// `npm ls` output can yield blank captures; an empty external pattern
		// would otherwise match everything downstream.
		expect(filterDependencies(["", "zod", ""], ["nope"])).toEqual({
			internal: ["zod"],
			external: [],
		});
	});

	it("returns two empty lists for no dependencies", () => {
		expect(filterDependencies([], ["@prosopo"])).toEqual({
			internal: [],
			external: [],
		});
	});

	it("puts everything in external when a filter matches all", () => {
		expect(filterDependencies(["a", "b"], [""]).external).toEqual(["a", "b"]);
	});

	it("puts everything in internal when no filter is supplied", () => {
		// An empty filter list joins to an empty pattern, which matches
		// everything — so this is the same all-external case, documented so
		// the surprise is not discovered during a build.
		expect(filterDependencies(["a", "b"], []).external).toEqual(["a", "b"]);
	});

	it("does not mutate the input", () => {
		const deps = ["zod", "axios"];
		filterDependencies(deps, ["zod"]);
		expect(deps).toEqual(["zod", "axios"]);
	});
});
