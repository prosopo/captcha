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
import { builtinModules } from "node:module";
import os from "node:os";
import path from "node:path";
import type { Rollup, UserConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nodejsPolarsNativeFilePlugin } from "./NodejsPolarsNativeFilePlugin.js";
import VitePluginCloseAndCopy from "./vite-plugin-close-and-copy.js";
import ViteCommonJSConfig from "./vite.commonjs.config.js";
import ViteEsmConfig from "./vite.esm.config.js";

let root: string;
let cwd: string;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-bundle-config-test-"));
	cwd = process.cwd();
});

afterEach(() => {
	process.chdir(cwd);
	fs.rmSync(root, { recursive: true, force: true });
});

/** A tsconfig with no references, so no npm lookups are needed. */
const leafTsConfig = (): string => {
	const dir = path.join(root, "pkg");
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(
		path.join(dir, "package.json"),
		JSON.stringify({ name: "@prosopo/pkg" }),
	);
	const tsConfigPath = path.join(dir, "tsconfig.json");
	fs.writeFileSync(tsConfigPath, JSON.stringify({ references: [] }));
	return tsConfigPath;
};

// Hand-rolled rather than `.flat(Infinity)`: a non-literal depth makes tsc
// expand FlatArray until it gives up with TS2589.
const flattenDeep = (value: unknown): unknown[] =>
	Array.isArray(value) ? value.flatMap(flattenDeep) : [value];

const pluginNames = (config: UserConfig): string[] =>
	flattenDeep(config.plugins ?? []).map((plugin) => {
		if (plugin && typeof plugin === "object" && "name" in plugin) {
			return String(plugin.name);
		}
		return "";
	});

/**
 * Drive the `generateBundle` hook of the inline import.meta.url plugin over a
 * fake bundle. Only that one plugin defines the hook.
 */
type FakeBundle = Record<string, { type: string; code?: string }>;

const generateBundle = async (
	config: UserConfig,
	bundle: FakeBundle,
): Promise<void> => {
	for (const plugin of flattenDeep(config.plugins ?? [])) {
		if (
			!plugin ||
			typeof plugin !== "object" ||
			!("generateBundle" in plugin)
		) {
			continue;
		}
		const hook = plugin.generateBundle;
		if (typeof hook === "function") {
			await callHook(
				hook as (options: object, bundle: FakeBundle) => unknown,
				{},
				bundle,
			);
		}
	}
};

const externals = (config: UserConfig): string[] => {
	const external = config.build?.rollupOptions?.external;
	if (!Array.isArray(external)) {
		throw new Error("expected an array of externals");
	}
	return external.map(String);
};

describe("ViteEsmConfig", () => {
	it("emits a single esm library targeting the runtime node version", async () => {
		const config = await ViteEsmConfig("my-lib", leafTsConfig());
		expect(config.build?.lib).toMatchObject({
			name: "my-lib",
			formats: ["es"],
			entry: "src/index.ts",
		});
		expect(config.build?.target).toBe("node24");
		expect(config.build?.outDir).toBe("dist");
	});

	it("accepts an explicit entry, including a multi-entry map", async () => {
		const tsConfigPath = leafTsConfig();
		await expect(
			ViteEsmConfig("my-lib", tsConfigPath, "src/other.ts"),
		).resolves.toMatchObject({ build: { lib: { entry: "src/other.ts" } } });
		await expect(
			ViteEsmConfig("my-lib", tsConfigPath, { a: "src/a.ts", b: "src/b.ts" }),
		).resolves.toMatchObject({
			build: { lib: { entry: { a: "src/a.ts", b: "src/b.ts" } } },
		});
	});

	it("externalises every node builtin under both bare and node: specifiers", async () => {
		const list = externals(await ViteEsmConfig("my-lib", leafTsConfig()));
		for (const builtin of builtinModules) {
			expect(list).toContain(builtin);
			expect(list).toContain(`node:${builtin}`);
		}
	});

	it("externalises the webpack toolchain, which vite must not bundle", async () => {
		const list = externals(await ViteEsmConfig("my-lib", leafTsConfig()));
		expect(list).toContain("webpack");
		expect(list).toContain("html-webpack-plugin");
		expect(list).toContain("babel-loader");
	});

	it("uses the same external list for ssr and for rollup", async () => {
		const config = await ViteEsmConfig("my-lib", leafTsConfig());
		expect(config.ssr?.external).toEqual(externals(config));
	});

	it("pulls package names out of the referenced projects", async () => {
		const dep = path.join(root, "dep");
		fs.mkdirSync(dep, { recursive: true });
		fs.writeFileSync(
			path.join(dep, "package.json"),
			JSON.stringify({ name: "@prosopo/dep" }),
		);
		fs.writeFileSync(
			path.join(dep, "tsconfig.json"),
			JSON.stringify({ references: [] }),
		);
		const tsConfigPath = leafTsConfig();
		fs.writeFileSync(
			tsConfigPath,
			JSON.stringify({ references: [{ path: "../dep" }] }),
		);

		expect(externals(await ViteEsmConfig("my-lib", tsConfigPath))).toContain(
			"@prosopo/dep",
		);
	});

	it("disables treeshaking and keeps the output directory intact", async () => {
		// Packages emit esm and cjs into the same tree from two separate runs,
		// so emptying the out dir would delete the sibling build.
		const config = await ViteEsmConfig("my-lib", leafTsConfig());
		expect(config.build?.rollupOptions?.treeshake).toBe(false);
		expect(config.build?.emptyOutDir).toBe(false);
	});

	it("suppresses the CJS require polyfill so browsers can load the output", async () => {
		const config = await ViteEsmConfig("my-lib", leafTsConfig());
		const output = config.build?.rollupOptions?.output;
		expect(output).toMatchObject({ polyfillRequire: false });
	});

	it("registers the copy and tsconfig-paths plugins", async () => {
		const names = pluginNames(await ViteEsmConfig("my-lib", leafTsConfig()));
		expect(names).toContain("close-plugin");
		expect(names).toContain("vite-tsconfig-paths");
	});

	it("uses the automatic jsx runtime", async () => {
		const config = await ViteEsmConfig("my-lib", leafTsConfig());
		expect(config.esbuild).toMatchObject({ jsx: "automatic" });
	});

	it("rejects a tsconfig path that does not exist", async () => {
		await expect(
			ViteEsmConfig("my-lib", path.join(root, "missing.json")),
		).rejects.toBeDefined();
	});
});

describe("ViteCommonJSConfig", () => {
	it("emits cjs into its own subdirectory so it cannot clash with the esm build", async () => {
		const config = await ViteCommonJSConfig("my-lib", leafTsConfig());
		expect(config.build?.lib).toMatchObject({
			name: "my-lib",
			formats: ["cjs"],
		});
		expect(config.build?.outDir).toBe("dist/cjs");
	});

	it("does not externalise the webpack toolchain, unlike the esm config", async () => {
		const tsConfigPath = leafTsConfig();
		expect(
			externals(await ViteCommonJSConfig("my-lib", tsConfigPath)),
		).not.toContain("html-webpack-plugin");
		expect(externals(await ViteEsmConfig("my-lib", tsConfigPath))).toContain(
			"html-webpack-plugin",
		);
	});

	it("rewrites import.meta.url in every emitted chunk, since cjs has none", async () => {
		const bundle: Record<string, { type: string; code?: string }> = {
			"a.js": { type: "chunk", code: "const a = import.meta.url;" },
			"b.js": { type: "chunk", code: "const b = import.meta.url + 1;" },
		};
		await generateBundle(
			await ViteCommonJSConfig("my-lib", leafTsConfig()),
			bundle,
		);

		expect(bundle["a.js"]?.code).toBe(
			"const a = require('url').pathToFileURL(__filename).href;",
		);
		expect(bundle["b.js"]?.code).toBe(
			"const b = require('url').pathToFileURL(__filename).href + 1;",
		);
	});

	it("leaves assets and empty chunks alone", async () => {
		// An asset has no `code` property at all, so touching it would throw.
		const bundle: Record<string, { type: string; code?: string }> = {
			"style.css": { type: "asset" },
			"empty.js": { type: "chunk", code: "" },
		};
		await expect(
			generateBundle(
				await ViteCommonJSConfig("my-lib", leafTsConfig()),
				bundle,
			),
		).resolves.toBeUndefined();
		expect(bundle["empty.js"]?.code).toBe("");
	});

	it("honours an explicit entry", async () => {
		await expect(
			ViteCommonJSConfig("my-lib", leafTsConfig(), "src/cli.ts"),
		).resolves.toMatchObject({ build: { lib: { entry: "src/cli.ts" } } });
	});
});

describe("nodejsPolarsNativeFilePlugin", () => {
	it("claims a native file by basename, wherever it is imported from", () => {
		const plugin = nodejsPolarsNativeFilePlugin(["/abs/polars.node"], "dist");
		expect(plugin.resolveId("./polars.node", "/src/a.ts", {})).toBe(
			"./polars.node",
		);
		expect(plugin.resolveId("./other.node", "/src/a.ts", {})).toBeNull();
	});

	it("replaces the module with a createRequire shim", () => {
		const plugin = nodejsPolarsNativeFilePlugin(["polars.node"], "dist");
		const transformed = plugin.transform("ignored", "/abs/polars.node");
		expect(transformed).toContain("createRequire");
		expect(transformed).toContain("'./polars.node'");
		expect(transformed).toContain("export default content");
	});

	it("leaves every other module untouched", () => {
		const plugin = nodejsPolarsNativeFilePlugin(["polars.node"], "dist");
		expect(plugin.transform("const a = 1;", "/src/index.ts")).toBe(
			"const a = 1;",
		);
	});

	it("loads a native file as empty so the bundler never parses it as js", () => {
		const plugin = nodejsPolarsNativeFilePlugin(["polars.node"], "dist");
		expect(plugin.load("/abs/polars.node")).toBe("");
		expect(plugin.load("/src/index.ts")).toBeNull();
	});

	it("copies the native files into the output directory verbatim", () => {
		const src = path.join(root, "polars.node");
		const outDir = path.join(root, "nested", "dist");
		const bytes = Buffer.from([0, 1, 2, 255]);
		fs.writeFileSync(src, bytes);

		nodejsPolarsNativeFilePlugin([src], outDir).generateBundle({}, {});

		expect(fs.readFileSync(path.join(outDir, "polars.node"))).toEqual(bytes);
	});

	it("throws when a declared native file is missing", () => {
		// A silent skip would produce a bundle that dies at runtime with an
		// unhelpful "cannot find module" instead of failing the build.
		const plugin = nodejsPolarsNativeFilePlugin(
			[path.join(root, "absent.node")],
			path.join(root, "dist"),
		);
		expect(() => plugin.generateBundle({}, {})).toThrow();
	});

	it("does nothing at all when there are no native files", () => {
		const plugin = nodejsPolarsNativeFilePlugin([], "dist");
		expect(plugin.resolveId("anything", undefined, {})).toBeNull();
		expect(plugin.load("anything")).toBeNull();
		expect(() => plugin.generateBundle({}, {})).not.toThrow();
	});
});

describe("VitePluginCloseAndCopy", () => {
	it("is a no-op at close time when no copy options are given", () => {
		const plugin = VitePluginCloseAndCopy();
		expect(plugin.name).toBe("close-plugin");
		expect(() => callHook(plugin.closeBundle)).not.toThrow();
	});

	it("clears the js already in the destination, then copies the bundle over", () => {
		process.chdir(root);
		fs.mkdirSync(path.join(root, "src"));
		fs.writeFileSync(path.join(root, "src", "new.js"), "new");
		fs.mkdirSync(path.join(root, "dest"));
		fs.writeFileSync(path.join(root, "dest", "stale.js"), "stale");
		fs.writeFileSync(path.join(root, "dest", "keep.css"), "keep");

		const plugin = VitePluginCloseAndCopy({
			srcDir: "src",
			destDir: ["dest"],
		});
		callHook(plugin.closeBundle);

		expect(fs.readdirSync(path.join(root, "dest")).sort()).toEqual([
			"keep.css",
			"new.js",
		]);
	});

	it("copies into every destination", () => {
		process.chdir(root);
		fs.mkdirSync(path.join(root, "src"));
		fs.writeFileSync(path.join(root, "src", "a.js"), "a");
		fs.mkdirSync(path.join(root, "one"));
		fs.mkdirSync(path.join(root, "two"));

		callHook(
			VitePluginCloseAndCopy({ srcDir: "src", destDir: ["one", "two"] })
				.closeBundle,
		);

		expect(fs.existsSync(path.join(root, "one", "a.js"))).toBe(true);
		expect(fs.existsSync(path.join(root, "two", "a.js"))).toBe(true);
	});

	it("throws when a destination does not exist", () => {
		process.chdir(root);
		expect(() =>
			callHook(
				VitePluginCloseAndCopy({ srcDir: "src", destDir: ["absent"] })
					.closeBundle,
			),
		).toThrow();
	});

	it("logs the build error it is handed rather than swallowing it", () => {
		const plugin = VitePluginCloseAndCopy();
		expect(() =>
			callHook(plugin.buildEnd, new Error("bundle blew up")),
		).not.toThrow();
	});

	it("announces the start of the build", () => {
		expect(() =>
			callHook(
				VitePluginCloseAndCopy().buildStart,
				{} as Rollup.NormalizedInputOptions,
			),
		).not.toThrow();
	});
});

/**
 * Vite plugin hooks may be a bare function or an object with a `handler`.
 * Neither of these hooks touches the rollup plugin context, so they are safe
 * to call unbound.
 */
type Hook<A extends unknown[]> =
	| ((...args: A) => unknown)
	| { handler: (...args: A) => unknown }
	| undefined;

const callHook = <A extends unknown[]>(hook: Hook<A>, ...args: A): unknown => {
	if (!hook) {
		throw new Error("plugin does not define the hook");
	}
	const handler = typeof hook === "function" ? hook : hook.handler;
	return handler(...args);
};
