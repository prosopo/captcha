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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tsNoCheckPlugin } from "./TsNoCheckPlugin.js";
import VitePluginCopy from "./vite-plugin-copy.js";
import VitePluginExternalizeObfuscatorDeadCode from "./vite-plugin-externalize-obfuscator-deadcode.js";
import VitePluginFixAbsoluteImports from "./vite-plugin-fix-absolute-imports.js";
import {
	flatten,
	unflatten,
} from "./vite-plugin-remove-unused-translations.js";
import VitePluginSourcemapExclude from "./vite-plugin-sourcemap-exclude.js";

/**
 * Vite plugin hooks are declared as `hook | { handler }` objects, so they are
 * pulled out through a narrowing helper rather than being called directly.
 */
const handlerOf = <T>(hook: T | { handler: T } | undefined): T => {
	if (!hook) {
		throw new Error("plugin does not define the hook");
	}
	return typeof hook === "function" ? hook : (hook as { handler: T }).handler;
};

describe("VitePluginSourcemapExclude", () => {
	const transformOf = (opts?: { excludeNodeModules?: boolean }) => {
		const plugin = VitePluginSourcemapExclude(opts);
		return handlerOf(plugin.transform) as (
			code: string,
			id: string,
		) => { code: string; map: { mappings: string } } | undefined;
	};

	it("is named so it can be found in a plugin list", () => {
		expect(VitePluginSourcemapExclude().name).toBe("sourcemap-exclude");
	});

	it("blanks the sourcemap for node_modules when asked", () => {
		// The whole point is to stop Vite holding megabytes of vendor
		// sourcemaps in memory.
		const result = transformOf({ excludeNodeModules: true })(
			"code",
			"/repo/node_modules/zod/index.js",
		);
		expect(result).toEqual({ code: "code", map: { mappings: "" } });
	});

	it("leaves first-party code alone", () => {
		expect(
			transformOf({ excludeNodeModules: true })("code", "/repo/src/index.ts"),
		).toBeUndefined();
	});

	it("does nothing without the option, or with no options at all", () => {
		expect(
			transformOf({})("code", "/repo/node_modules/zod/index.js"),
		).toBeUndefined();
		expect(
			transformOf()("code", "/repo/node_modules/zod/index.js"),
		).toBeUndefined();
		expect(
			transformOf({ excludeNodeModules: false })(
				"code",
				"/repo/node_modules/zod/index.js",
			),
		).toBeUndefined();
	});

	it("matches node_modules anywhere in the id, including nested copies", () => {
		expect(
			transformOf({ excludeNodeModules: true })(
				"code",
				"/repo/node_modules/a/node_modules/b/index.js",
			),
		).toBeDefined();
	});
});

describe("VitePluginFixAbsoluteImports", () => {
	const transform = handlerOf(VitePluginFixAbsoluteImports().transform) as (
		code: string,
		id: string,
	) => { code: string };

	it("runs after other plugins have emitted their imports", () => {
		const plugin = VitePluginFixAbsoluteImports();
		expect(plugin.name).toBe("fix-absolute-imports");
		expect(plugin.enforce).toBe("post");
	});

	it("rewrites a deep builtin import back to the bare specifier", () => {
		// `from "node:fs/promises/index.js"` is not resolvable at runtime;
		// the bare builtin is.
		expect(transform('import x from "fs/promises/index.js";', "id").code).toBe(
			'import x from "fs";',
		);
	});

	it("rewrites every occurrence in a file", () => {
		const code = 'from "path/posix/x.js";\nfrom "path/win32/y.js";';
		expect(transform(code, "id").code).toBe('from "path";\nfrom "path";');
	});

	it("leaves a bare builtin import untouched", () => {
		const code = 'import fs from "fs";';
		expect(transform(code, "id").code).toBe(code);
	});

	it("leaves third-party deep imports untouched", () => {
		const code = 'import x from "zod/lib/index.js";';
		expect(transform(code, "id").code).toBe(code);
	});

	it("returns empty code unchanged", () => {
		expect(transform("", "id").code).toBe("");
	});
});

describe("tsNoCheckPlugin", () => {
	it("prefixes every emitted chunk with a ts-nocheck pragma", () => {
		// Consumers typecheck the bundled output; without this the generated
		// code fails their build.
		const bundle = {
			"index.js": { type: "chunk", code: "export const a = 1;" },
			"other.js": { type: "chunk", code: "export const b = 2;" },
		};
		tsNoCheckPlugin().generateBundle({}, bundle);

		expect(bundle["index.js"].code).toBe("// @ts-nocheck\nexport const a = 1;");
		expect(bundle["other.js"].code).toBe("// @ts-nocheck\nexport const b = 2;");
	});

	it("leaves assets and empty chunks alone", () => {
		const bundle = {
			"style.css": { type: "asset", source: "body{}" },
			"empty.js": { type: "chunk", code: "" },
		};
		tsNoCheckPlugin().generateBundle({}, bundle);

		expect(bundle["style.css"]).toEqual({ type: "asset", source: "body{}" });
		expect(bundle["empty.js"].code).toBe("");
	});

	it("handles an empty bundle", () => {
		expect(() => tsNoCheckPlugin().generateBundle({}, {})).not.toThrow();
	});

	it("is named", () => {
		expect(tsNoCheckPlugin().name).toBe("vite-plugin-ts-nocheck");
	});
});

describe("VitePluginExternalizeObfuscatorDeadCode", () => {
	const resolveId = handlerOf(
		VitePluginExternalizeObfuscatorDeadCode().resolveId,
	) as (source: string) => { id: string; external: boolean } | null;

	it("runs before resolution so rolldown never sees the specifier", () => {
		const plugin = VitePluginExternalizeObfuscatorDeadCode();
		expect(plugin.name).toBe("externalize-obfuscator-deadcode");
		expect(plugin.enforce).toBe("pre");
	});

	it("externalises each known dead-code specifier", () => {
		// Rolldown treats an unresolved import as a hard error, so missing one
		// of these breaks the obfuscated build outright.
		for (const source of [
			"../../package",
			"../redacted.js",
			"../utils/isStandaloneExecutable",
			"./resolve-local-redacted-path",
			"@redacted/components/package",
			"@redacted/enterprise-plugin",
			"@redacted/enterprise-plugin/package",
		]) {
			expect(resolveId(source), source).toEqual({ id: source, external: true });
		}
	});

	it("defers every other specifier to the normal resolver", () => {
		for (const source of [
			"zod",
			"./real-module.js",
			"",
			"../../package.json",
		]) {
			expect(resolveId(source), source).toBeNull();
		}
	});

	it("matches exactly, not by prefix", () => {
		expect(resolveId("@redacted/enterprise-plugin/extra")).toBeNull();
	});
});

describe("VitePluginCopy", () => {
	let root: string;
	let cwd: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-copy-test-"));
		cwd = process.cwd();
		process.chdir(root);
		fs.mkdirSync(path.join(root, "src", "nested"), { recursive: true });
		fs.writeFileSync(path.join(root, "src", "a.txt"), "a");
		fs.writeFileSync(path.join(root, "src", "b.md"), "b");
		fs.writeFileSync(path.join(root, "src", "nested", "c.txt"), "c");
	});

	afterEach(() => {
		process.chdir(cwd);
		fs.rmSync(root, { recursive: true, force: true });
	});

	const run = async (options: Parameters<typeof VitePluginCopy>[0]) => {
		const plugin = VitePluginCopy(options);
		const closeBundle = handlerOf(plugin.closeBundle) as () => Promise<void>;
		await closeBundle();
	};

	it("copies matching files and creates the destination tree", async () => {
		await run({ srcDir: "src", destDir: "dist", include: ["**/*.txt"] });

		expect(fs.readFileSync(path.join(root, "dist", "a.txt"), "utf8")).toBe("a");
		expect(
			fs.readFileSync(path.join(root, "dist", "nested", "c.txt"), "utf8"),
		).toBe("c");
		expect(fs.existsSync(path.join(root, "dist", "b.md"))).toBe(false);
	});

	it("honours the exclude globs", async () => {
		await run({
			srcDir: "src",
			destDir: "dist",
			include: ["**/*.txt"],
			exclude: ["nested/**"],
		});

		expect(fs.existsSync(path.join(root, "dist", "a.txt"))).toBe(true);
		expect(fs.existsSync(path.join(root, "dist", "nested"))).toBe(false);
	});

	it("copies nothing, and says so, when no include glob is given", async () => {
		// Copying the whole tree by default would silently ship sources.
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		await run({ srcDir: "src", destDir: "dist" });

		expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
		expect(info).toHaveBeenCalledWith(
			"[copy-plugin] No include globs specified, nothing to copy.",
		);
		info.mockRestore();
	});

	it("treats an empty include list as no include list", async () => {
		await run({ srcDir: "src", destDir: "dist", include: [] });
		expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
	});

	it("succeeds when nothing matches", async () => {
		await run({ srcDir: "src", destDir: "dist", include: ["**/*.nope"] });
		expect(fs.existsSync(path.join(root, "dist"))).toBe(false);
	});

	it("overwrites an existing destination file", async () => {
		fs.mkdirSync(path.join(root, "dist"), { recursive: true });
		fs.writeFileSync(path.join(root, "dist", "a.txt"), "stale");
		await run({ srcDir: "src", destDir: "dist", include: ["a.txt"] });
		expect(fs.readFileSync(path.join(root, "dist", "a.txt"), "utf8")).toBe("a");
	});

	it("is named", () => {
		expect(VitePluginCopy({ srcDir: "s", destDir: "d" }).name).toBe(
			"copy-plugin",
		);
	});
});

describe("translation flatten/unflatten", () => {
	it("flattens nested objects to dotted keys", () => {
		expect(flatten({ a: { b: { c: "x" } }, d: "y" })).toEqual({
			"a.b.c": "x",
			d: "y",
		});
	});

	it("returns an empty object for an empty input", () => {
		expect(flatten({})).toEqual({});
	});

	it("applies a prefix", () => {
		expect(flatten({ a: "x" }, "p.")).toEqual({ "p.a": "x" });
	});

	it("treats arrays as objects, keying by index", () => {
		expect(flatten({ a: ["x", "y"] })).toEqual({ "a.0": "x", "a.1": "y" });
	});

	it("round trips a nested object", () => {
		const original = { a: { b: "x" }, c: "y" };
		expect(unflatten(flatten(original))).toEqual(original);
	});

	it("rebuilds arrays when the next key is numeric", () => {
		// Locale files contain arrays of strings; turning them into objects
		// keyed "0", "1" would change the shape the app reads at runtime.
		expect(unflatten({ "a.0": "x", "a.1": "y" })).toEqual({ a: ["x", "y"] });
	});

	it("keeps object keys that merely look like words", () => {
		expect(unflatten({ "a.b": "x" })).toEqual({ a: { b: "x" } });
	});

	it("merges sibling keys under one parent", () => {
		expect(unflatten({ "a.b": "x", "a.c": "y" })).toEqual({
			a: { b: "x", c: "y" },
		});
	});

	it("handles a top-level key with no dots", () => {
		expect(unflatten({ a: "x" })).toEqual({ a: "x" });
	});

	it("returns an empty object for an empty input", () => {
		expect(unflatten({})).toEqual({});
	});

	it("preserves non-string leaf values", () => {
		expect(unflatten({ "a.b": 1, "a.c": true })).toEqual({
			a: { b: 1, c: true },
		});
	});
});
