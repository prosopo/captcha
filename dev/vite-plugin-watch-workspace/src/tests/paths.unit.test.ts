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
import { describe, expect, test } from "vitest";
import {
	type TsConfigLike,
	getLoader,
	getOutDir,
	getOutExtension,
	getOutFile,
	replaceLastSegments,
} from "../vite-plugin-watch-workspace.js";

describe("getLoader", () => {
	test.each([
		[".ts", "ts"],
		[".tsx", "tsx"],
		[".js", "js"],
		[".jsx", "jsx"],
		[".css", "css"],
		[".json", "json"],
	])("maps %s to the %s loader", (extension: string, expected: string) => {
		expect(getLoader(extension)).toBe(expected);
	});

	test.each([
		["", "empty extension — path.extname returns this for `Makefile`"],
		[".mts", "not in the switch"],
		[".TS", "case matters; path.extname preserves case"],
		[".vue", "unknown"],
	])(
		"falls back to the ts loader for %j (%s)",
		(extension: string, _reason: string) => {
			expect(getLoader(extension)).toBe("ts");
		},
	);
});

describe("getOutExtension", () => {
	test.each([
		[".ts", ".js"],
		[".tsx", ".js"],
		[".js", ".js"],
		[".jsx", ".js"],
	])("compiles %s down to %s", (extension: string, expected: string) => {
		expect(getOutExtension(extension)).toBe(expected);
	});

	test.each([
		[".css", ".css"],
		[".json", ".json"],
	])("passes %s through unchanged", (extension: string, expected: string) => {
		expect(getOutExtension(extension)).toBe(expected);
	});

	test.each([[""], [".mts"], [".unknown"]])(
		"falls back to .js for %j",
		(extension: string) => {
			expect(getOutExtension(extension)).toBe(".js");
		},
	);

	test("every loader-known extension also has an out extension", () => {
		// The two switches are maintained side by side; an extension added to one
		// and not the other silently falls through to the default and emits .js.
		expect(getOutExtension(".css")).not.toBe(getOutExtension(".unknown"));
		expect(getOutExtension(".json")).not.toBe(getOutExtension(".unknown"));
	});
});

describe("replaceLastSegments", () => {
	const sep = path.sep;
	const join = (...parts: string[]): string => parts.join(sep);

	test("replaces a single matching segment", () => {
		expect(replaceLastSegments(join("", "a", "src", "b"), "src", "dist")).toBe(
			join("", "a", "dist", "b"),
		);
	});

	test("replaces the LAST match, not the first", () => {
		// The regression this function exists for: a checkout under a directory
		// that happens to be called `src`.
		expect(
			replaceLastSegments(
				join("", "home", "src", "pkg", "src", "a"),
				"src",
				"dist",
			),
		).toBe(join("", "home", "src", "pkg", "dist", "a"));
	});

	test("does not match inside a longer segment", () => {
		// `srcinal` contains "src" as a substring but is a different directory.
		expect(replaceLastSegments(join("", "srcinal", "x"), "src", "dist")).toBe(
			join("", "srcinal", "x"),
		);
	});

	test("matches a multi-segment target", () => {
		expect(
			replaceLastSegments(join("", "a", "src", "lib", "b"), "src/lib", "out"),
		).toBe(join("", "a", "out", "b"));
	});

	test("expands a multi-segment replacement", () => {
		expect(
			replaceLastSegments(join("", "a", "pkg", "f"), "pkg", "pkg/dist"),
		).toBe(join("", "a", "pkg", "dist", "f"));
	});

	test("returns the input unchanged when there is no match", () => {
		const input = join("", "a", "b");
		expect(replaceLastSegments(input, "nope", "dist")).toBe(input);
	});

	test("returns the input unchanged for an empty target", () => {
		// Splitting "" yields no segments; without the guard the loop would start
		// past the end of the array and splice the replacement in at the tail.
		const input = join("", "a", "b");
		expect(replaceLastSegments(input, "", "dist")).toBe(input);
		expect(replaceLastSegments(input, "/", "dist")).toBe(input);
	});

	test("matches a target longer than the path without throwing", () => {
		expect(replaceLastSegments("a", "a/b/c", "x")).toBe("a");
	});

	test("matches the first segment of the path", () => {
		expect(replaceLastSegments(join("src", "a"), "src", "dist")).toBe(
			join("dist", "a"),
		);
	});

	test("matches the last segment of the path", () => {
		expect(replaceLastSegments(join("a", "src"), "src", "dist")).toBe(
			join("a", "dist"),
		);
	});
});

describe("getOutDir", () => {
	const tsconfig = (rootDir?: unknown, outDir?: unknown): TsConfigLike => ({
		compilerOptions: { rootDir, outDir },
	});
	const p = (...parts: string[]): string => parts.join(path.sep);

	test("inserts outDir under the package when rootDir is '.'", () => {
		expect(
			getOutDir(
				p("", "repo", "packages", "cli", "a", "b.ts"),
				tsconfig(".", "dist"),
				"cli",
			),
		).toBe(p("", "repo", "packages", "cli", "dist", "a"));
	});

	test("substitutes the rootDir segment for the outDir one when rootDir is set", () => {
		expect(
			getOutDir(
				p("", "repo", "packages", "cli", "src", "b.ts"),
				tsconfig("./src", "./dist"),
				"cli",
			),
		).toBe(p("", "repo", "packages", "cli", "dist"));
	});

	test("strips leading ../ from rootDir and outDir", () => {
		expect(
			getOutDir(
				p("", "repo", "cli", "src", "b.ts"),
				tsconfig("../src", "../../dist"),
				"cli",
			),
		).toBe(p("", "repo", "cli", "dist"));
	});

	test("uses the package occurrence nearest the file", () => {
		// A repo checked out at /cli would otherwise have its outer directory
		// rewritten and the build emitted outside the workspace.
		expect(
			getOutDir(
				p("", "cli", "packages", "cli", "x.ts"),
				tsconfig(".", "dist"),
				"cli",
			),
		).toBe(p("", "cli", "packages", "cli", "dist"));
	});

	test("defaults outDir to dist when the tsconfig omits it", () => {
		expect(getOutDir(p("", "pkg", "src", "a.ts"), tsconfig("src"), "pkg")).toBe(
			p("", "pkg", "dist"),
		);
	});

	test("defaults rootDir to '.' when the tsconfig omits it", () => {
		expect(
			getOutDir(p("", "r", "pkg", "a.ts"), tsconfig(undefined, "out"), "pkg"),
		).toBe(p("", "r", "pkg", "out"));
	});

	test("treats a tsconfig with no compilerOptions as all-defaults", () => {
		expect(getOutDir(p("", "r", "pkg", "a.ts"), {}, "pkg")).toBe(
			p("", "r", "pkg", "dist"),
		);
	});

	test("ignores a non-string rootDir/outDir rather than stringifying it", () => {
		// These come from a user-authored JSON file, so they can be any shape.
		expect(
			getOutDir(p("", "r", "pkg", "a.ts"), tsconfig(7, ["dist"]), "pkg"),
		).toBe(p("", "r", "pkg", "dist"));
	});

	test("ignores an empty-string rootDir/outDir", () => {
		expect(getOutDir(p("", "r", "pkg", "a.ts"), tsconfig("", ""), "pkg")).toBe(
			p("", "r", "pkg", "dist"),
		);
	});

	test("leaves the path alone when the package segment is absent", () => {
		// Better than emitting into an arbitrary rewritten directory.
		const file = p("", "elsewhere", "a.ts");
		expect(getOutDir(file, tsconfig(".", "dist"), "pkg")).toBe(
			p("", "elsewhere"),
		);
	});

	test("accepts an absolute packageDir, as the non-glob workspace branch supplies", () => {
		expect(
			getOutDir(
				p("", "r", "pkg", "a.ts"),
				tsconfig(".", "dist"),
				p("", "r", "pkg"),
			),
		).toBe(p("", "r", "pkg", "dist"));
	});
});

describe("getOutFile", () => {
	const p = (...parts: string[]): string => parts.join(path.sep);

	test("swaps the extension and places the file in outdir", () => {
		expect(getOutFile(p("", "o"), p("", "s", "a.ts"), ".ts")).toBe(
			p("", "o", "a.js"),
		);
	});

	test("keeps .css and .json extensions", () => {
		expect(getOutFile(p("", "o"), p("", "s", "a.css"), ".css")).toBe(
			p("", "o", "a.css"),
		);
		expect(getOutFile(p("", "o"), p("", "s", "a.json"), ".json")).toBe(
			p("", "o", "a.json"),
		);
	});

	test("only the basename survives — nested source dirs are flattened into outdir", () => {
		// getOutDir has already encoded the directory, so getOutFile must not add
		// the source's own subdirectories a second time.
		expect(
			getOutFile(p("", "o", "deep"), p("", "s", "deep", "a.tsx"), ".tsx"),
		).toBe(p("", "o", "deep", "a.js"));
	});

	test("a dotted filename keeps its earlier dots", () => {
		expect(getOutFile(p("", "o"), p("", "s", "a.test.ts"), ".ts")).toBe(
			p("", "o", "a.test.js"),
		);
	});

	test("an extension appearing earlier in the basename is replaced first", () => {
		// Documents a real sharp edge: String.replace hits the first occurrence,
		// so `a.ts.ts` becomes `a.js.ts`. Callers derive fileExtension from
		// path.extname of this same file, so the trailing match is the intent.
		expect(getOutFile(p("", "o"), p("", "s", "a.ts.ts"), ".ts")).toBe(
			p("", "o", "a.js.ts"),
		);
	});

	test("resolves a relative outdir against the cwd", () => {
		expect(getOutFile("out", p("", "s", "a.ts"), ".ts")).toBe(
			path.resolve("out", "a.js"),
		);
	});
});
