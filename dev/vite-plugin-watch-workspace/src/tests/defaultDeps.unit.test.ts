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
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { defaultDeps } from "../vite-plugin-watch-workspace.js";

/**
 * The default seams are thin wrappers, but they are the only part of the plugin
 * that is not covered by the injected-fixture tests — a wrong encoding or a
 * `statSync` where `lstatSync` was meant would go unnoticed. Exercised against
 * a real temporary tree rather than mocks, since mocking them would test
 * nothing.
 */
describe("defaultDeps", () => {
	let root: string;

	beforeAll(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "watch-workspace-"));
		fs.mkdirSync(path.join(root, "pkg", "src"), { recursive: true });
		fs.writeFileSync(
			path.join(root, "pkg", "src", "a.ts"),
			"export const a = 1;\n",
		);
		fs.writeFileSync(path.join(root, "pkg", "src", "b.txt"), "not source\n");
		fs.writeFileSync(path.join(root, "pkg", "notes.md"), "\n");
		fs.writeFileSync(
			path.join(root, "pkg", "tsconfig.json"),
			// With a comment and a trailing comma, which plain JSON.parse rejects
			// but tsconfigs routinely contain.
			'{\n\t// a comment\n\t"compilerOptions": { "rootDir": "src", "outDir": "dist", },\n}\n',
		);
	});

	afterAll(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	test("readFile decodes as utf8, not a Buffer", () => {
		const contents = defaultDeps.readFile(
			path.join(root, "pkg", "src", "a.ts"),
		);
		expect(contents).toBe("export const a = 1;\n");
		expect(typeof contents).toBe("string");
	});

	test("readFile throws for a missing file", () => {
		expect(() => defaultDeps.readFile(path.join(root, "nope"))).toThrow(
			/ENOENT/,
		);
	});

	test("readDir lists entry names, not paths", () => {
		expect(defaultDeps.readDir(path.join(root, "pkg")).sort()).toEqual([
			"notes.md",
			"src",
			"tsconfig.json",
		]);
	});

	test("readDir throws for a missing directory", () => {
		expect(() => defaultDeps.readDir(path.join(root, "nope"))).toThrow(
			/ENOENT/,
		);
	});

	test("isDirectory distinguishes directories from files", () => {
		expect(defaultDeps.isDirectory(path.join(root, "pkg", "src"))).toBe(true);
		expect(defaultDeps.isDirectory(path.join(root, "pkg", "notes.md"))).toBe(
			false,
		);
	});

	test("isDirectory does not follow a symlink to a directory", () => {
		// lstat, not stat: a symlinked package would otherwise be walked twice,
		// once through each name, and its files registered under both.
		const link = path.join(root, "links", "link");
		fs.mkdirSync(path.join(root, "links"), { recursive: true });
		fs.symlinkSync(path.join(root, "pkg", "src"), link, "dir");
		expect(defaultDeps.isDirectory(link)).toBe(false);
	});

	test("glob honours the pattern and the ignore list", async () => {
		const matches = await defaultDeps.glob(`${root}/pkg/**/*.(ts|tsx)`, {
			ignore: [],
		});
		expect(matches).toEqual([`${root}/pkg/src/a.ts`]);

		const ignored = await defaultDeps.glob(`${root}/pkg/**/*.(ts|tsx)`, {
			ignore: ["**/src/**"],
		});
		expect(ignored).toEqual([]);
	});

	test("glob resolves to an empty list rather than throwing on no match", async () => {
		await expect(
			defaultDeps.glob(`${root}/**/*.nothing`, { ignore: [] }),
		).resolves.toEqual([]);
	});

	test("readTsConfig parses a tsconfig with comments and trailing commas", () => {
		// The reason this goes through typescript's own reader rather than
		// JSON.parse: real tsconfigs are JSONC.
		expect(
			defaultDeps.readTsConfig(path.join(root, "pkg", "tsconfig.json")),
		).toEqual({ compilerOptions: { rootDir: "src", outDir: "dist" } });
	});

	test("readTsConfig returns undefined for a missing file instead of throwing", () => {
		// typescript reports the failure through `error` and still hands back
		// `config: {}`. Passing that on would look like a valid tsconfig with
		// every option defaulted, so the plugin would emit to `<pkg>/dist` for a
		// package whose real outDir is something else.
		expect(
			defaultDeps.readTsConfig(path.join(root, "nope.json")),
		).toBeUndefined();
	});

	test("readTsConfig returns undefined for a file that is not valid JSONC", () => {
		const broken = path.join(root, "broken.json");
		fs.writeFileSync(broken, "{ definitely not json");
		expect(defaultDeps.readTsConfig(broken)).toBeUndefined();
	});

	test("build compiles the given source through esbuild", async () => {
		const result = await defaultDeps.build({
			stdin: {
				contents: "const a: number = 1; export default a;",
				loader: "ts",
				resolveDir: root,
			},
			write: false,
			format: "esm",
		});
		expect(result.errors).toEqual([]);
		// The type annotation is gone and the module has been given an esm export.
		expect(result.outputFiles?.[0]?.text).not.toContain(": number");
		expect(result.outputFiles?.[0]?.text).toContain("export {");
	});

	test("build rejects on a syntax error", async () => {
		await expect(
			defaultDeps.build({
				stdin: { contents: "const = ;", loader: "ts", resolveDir: root },
				write: false,
			}),
		).rejects.toThrow();
	});

	test("now returns the current epoch milliseconds", () => {
		const before = Date.now();
		const value = defaultDeps.now();
		expect(value).toBeGreaterThanOrEqual(before);
		expect(value).toBeLessThanOrEqual(Date.now());
	});
});
