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

import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
	WORKSPACE_ROOT_MAX_DEPTH,
	type WorkspaceRootDeps,
	findWorkspaceRoot,
} from "../projectInfo.js";

const DEFAULT_NAME = "@prosopo/captcha-private";

interface Tree {
	/** Absolute path -> file contents. Directories are implied by their files. */
	files: Record<string, string>;
	cwd: string;
}

interface Harness {
	deps: WorkspaceRootDeps;
	warnings: string[];
	reads: string[];
}

const harness = (tree: Tree, overrides: Partial<WorkspaceRootDeps> = {}) => {
	const warnings: string[] = [];
	const reads: string[] = [];
	const deps: WorkspaceRootDeps = {
		cwd: (): string => tree.cwd,
		existsSync: (target: string): boolean => target in tree.files,
		readFileSync: (target: string): string => {
			reads.push(target);
			const contents = tree.files[target];
			if (contents === undefined) {
				throw new Error(`ENOENT: ${target}`);
			}
			return contents;
		},
		warn: (message: string): void => {
			warnings.push(message);
		},
		...overrides,
	};
	const result: Harness = { deps, warnings, reads };
	return result;
};

const manifest = (name: string): string => JSON.stringify({ name });

describe("findWorkspaceRoot, lint directory shortcut", () => {
	// dev/lint runs with its own cwd and the workspace root is two levels above
	// the captcha submodule, which the ordinary ascent would not reach within
	// the depth limit.
	test("returns the directory above captcha/ when run from captcha/dev/lint", () => {
		const { deps } = harness({
			files: {},
			cwd: "/home/x/repo/captcha/dev/lint",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
	});

	test("takes precedence over the package.json ascent", () => {
		// Even with a matching manifest right there, the lint path wins.
		const { deps, reads } = harness({
			files: {
				"/home/x/repo/captcha/dev/lint/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo/captcha/dev/lint",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
		expect(reads).toEqual([]);
	});

	test("does not fire for a sibling of dev/lint", () => {
		const { deps } = harness({
			files: {},
			cwd: "/home/x/repo/captcha/dev/scripts",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe(
			"/home/x/repo/captcha/dev/scripts",
		);
	});

	test("does not fire for a directory below dev/lint", () => {
		// The pattern is anchored at the end, so only the lint dir itself counts.
		const { deps } = harness({
			files: {},
			cwd: "/home/x/repo/captcha/dev/lint/src",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe(
			"/home/x/repo/captcha/dev/lint/src",
		);
	});

	test("requires a non-empty prefix before captcha/dev/lint", () => {
		// `/captcha/dev/lint` at the filesystem root has nothing to return, so
		// the pattern must not match and produce an empty string.
		const { deps } = harness({ files: {}, cwd: "/captcha/dev/lint" });
		expect(findWorkspaceRoot(undefined, deps)).not.toBe("");
	});
});

describe("findWorkspaceRoot, website shortcut", () => {
	test("returns cwd when packages/prosopo-website is present", () => {
		const { deps } = harness({
			files: { "/home/x/repo/packages/prosopo-website": "" },
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
	});

	test("takes precedence over an ancestor whose manifest matches", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/sub/packages/prosopo-website": "",
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo/sub",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo/sub");
	});
});

describe("findWorkspaceRoot, package.json ascent", () => {
	test("matches in the current directory", () => {
		const { deps } = harness({
			files: { "/home/x/repo/package.json": manifest(DEFAULT_NAME) },
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
	});

	test("ascends past directories whose manifest does not match", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/captcha/packages/cli/package.json":
					manifest("@prosopo/cli"),
				"/home/x/repo/captcha/package.json": manifest("@prosopo/captcha"),
				"/home/x/repo/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo/captcha/packages/cli",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
	});

	test("ascends past directories with no package.json at all", () => {
		const { deps } = harness({
			files: { "/home/x/package.json": manifest(DEFAULT_NAME) },
			cwd: "/home/x/a/b/c",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x");
	});

	test("honours a caller-supplied name", () => {
		const { deps } = harness({
			files: { "/home/x/repo/package.json": manifest("@acme/other") },
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot("@acme/other", deps)).toBe("/home/x/repo");
	});

	test("an empty name falls back to the default rather than matching nothing", () => {
		// `name || default` treats "" as absent. A manifest with an empty name
		// must therefore not be treated as a match.
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": manifest(""),
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot("", deps)).toBe("/home/x");
	});

	test("returns the nearest match when two ancestors both match", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": manifest(DEFAULT_NAME),
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
	});

	test("a name match is exact, not a prefix", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": manifest("@prosopo/captcha-private-2"),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
		// Falls through to the warning path rather than matching the near-miss.
	});
});

describe("findWorkspaceRoot, malformed input", () => {
	// A package.json anywhere on the ascent may be unreadable or invalid. That
	// must not abort the search: a directory higher up may still be the root.
	test("skips a manifest that is not valid JSON", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": "{not json",
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x");
	});

	test("skips a manifest that fails to read", () => {
		const { deps } = harness(
			{
				files: {
					"/home/x/repo/package.json": manifest(DEFAULT_NAME),
					"/home/x/package.json": manifest(DEFAULT_NAME),
				},
				cwd: "/home/x/repo",
			},
			{
				readFileSync: (target: string): string => {
					if (target === "/home/x/repo/package.json") {
						throw new Error("EACCES: permission denied");
					}
					return manifest(DEFAULT_NAME);
				},
			},
		);
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x");
	});

	test("skips a manifest with no name field", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": JSON.stringify({ version: "1.0.0" }),
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x");
	});

	test("skips a manifest whose name is not a string", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": JSON.stringify({ name: { nested: true } }),
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x");
	});

	test("skips a manifest that is valid JSON but not an object", () => {
		// JSON.parse("null") succeeds, and `null.name` would throw — inside the
		// try, so it is caught, but the ascent must still continue.
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": "null",
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x");
	});

	test("skips an empty manifest file", () => {
		const { deps } = harness({
			files: {
				"/home/x/repo/package.json": "",
				"/home/x/package.json": manifest(DEFAULT_NAME),
			},
			cwd: "/home/x/repo",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x");
	});
});

describe("findWorkspaceRoot, giving up", () => {
	test("warns and returns cwd when nothing matches", () => {
		const { deps, warnings } = harness({ files: {}, cwd: "/home/x/repo" });
		expect(findWorkspaceRoot(undefined, deps)).toBe("/home/x/repo");
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("Could not find workspace root");
	});

	test("does not warn when a root is found", () => {
		const { deps, warnings } = harness({
			files: { "/home/x/repo/package.json": manifest(DEFAULT_NAME) },
			cwd: "/home/x/repo",
		});
		findWorkspaceRoot(undefined, deps);
		expect(warnings).toEqual([]);
	});

	test("stops after the depth limit even when a match sits just beyond it", () => {
		// Deliberate: the limit bounds an unbounded walk toward /. A match
		// further up is missed, and the caller gets cwd plus a warning rather
		// than a wrong-but-plausible directory.
		const deepCwd = `/home/${"a/".repeat(WORKSPACE_ROOT_MAX_DEPTH + 2)}leaf`;
		const { deps, warnings } = harness({
			files: { "/home/package.json": manifest(DEFAULT_NAME) },
			cwd: deepCwd,
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe(deepCwd);
		expect(warnings).toHaveLength(1);
	});

	test("finds a match exactly at the depth limit", () => {
		// WORKSPACE_ROOT_MAX_DEPTH iterations means cwd plus its first four
		// ancestors are inspected.
		const { deps } = harness({
			files: { "/a/package.json": manifest(DEFAULT_NAME) },
			cwd: "/a/b/c/d/e",
		});
		expect(findWorkspaceRoot(undefined, deps)).toBe("/a");
	});

	test("terminates at the filesystem root instead of looping on itself", () => {
		// path.dirname("/") === "/", so without the break the loop would inspect
		// the same directory for every remaining iteration.
		const existsSync = vi.fn((target: string): boolean => target === "/x");
		const { deps, warnings } = harness({ files: {}, cwd: "/" }, { existsSync });
		expect(findWorkspaceRoot(undefined, deps)).toBe("/");
		expect(warnings).toHaveLength(1);
		// cwd inspection only: the website probe plus one package.json probe.
		expect(existsSync).toHaveBeenCalledTimes(2);
	});
});

describe("findWorkspaceRoot, real filesystem", () => {
	// Two end-to-end passes through the default dependencies, so the real
	// wiring is covered and not only the injected variant.
	test("finds the captcha repo root from inside the workspace package", () => {
		// The test runs with cwd at dev/workspace, two levels below the repo
		// root, which the default depth comfortably reaches.
		expect(findWorkspaceRoot("@prosopo/captcha")).toBe(
			path.resolve(process.cwd(), "../.."),
		);
	});

	test("warns through console.warn and returns cwd for a name that is not there", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		try {
			expect(findWorkspaceRoot("@prosopo/no-such-workspace-root")).toBe(
				process.cwd(),
			);
			expect(warn).toHaveBeenCalledTimes(1);
		} finally {
			warn.mockRestore();
		}
	});
});
