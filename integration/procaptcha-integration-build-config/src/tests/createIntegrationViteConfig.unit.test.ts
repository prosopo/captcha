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
import type { LibraryOptions, Plugin, UserConfig } from "vite";
import { describe, expect, test } from "vitest";
import {
	ENV_DIR_RELATIVE_PATH,
	type IntegrationConfigSettings,
	buildFileName,
	createIntegrationViteConfig,
} from "../index.js";

const DIRECTORY = "/repo/integration/frameworks/react/react-procaptcha-wrapper";

const settings = (
	overrides: Partial<IntegrationConfigSettings> = {},
): IntegrationConfigSettings => ({
	directory: DIRECTORY,
	name: "ReactProcaptchaWrapper",
	...overrides,
});

/** The lib options are always present; this keeps the tests free of guards. */
const libOf = (config: UserConfig): LibraryOptions => {
	const lib = config.build?.lib;
	if (lib === undefined || lib === false) {
		throw new Error("expected the config to describe a library build");
	}
	return lib;
};

const pluginsOf = (config: UserConfig): unknown[] =>
	Array.isArray(config.plugins) ? config.plugins : [];

describe("buildFileName", () => {
	test("the es build keeps the bare index.js the package exports point at", () => {
		expect(buildFileName("es")).toBe("index.js");
	});

	test("any other format is named after itself", () => {
		// The format used to be ignored, so a package that added a second format
		// wrote both builds to index.js and kept only whichever finished last.
		expect(buildFileName("cjs")).toBe("index.cjs.js");
		expect(buildFileName("umd")).toBe("index.umd.js");
		expect(buildFileName("iife")).toBe("index.iife.js");
	});

	test("every format maps to a distinct file", () => {
		const formats: string[] = ["es", "cjs", "umd", "iife", "system"];
		expect(new Set(formats.map(buildFileName)).size).toBe(formats.length);
	});
});

describe("createIntegrationViteConfig", () => {
	test("builds into the package's own dist directory", () => {
		expect(createIntegrationViteConfig(settings()).build?.outDir).toBe(
			path.join(DIRECTORY, "dist"),
		);
	});

	test("takes the entry from the package's src", () => {
		expect(libOf(createIntegrationViteConfig(settings())).entry).toBe(
			path.join(DIRECTORY, "src/index.ts"),
		);
	});

	test("reads the environment from the shared frameworks directory", () => {
		// The .env lives at integration/frameworks; resolving it anywhere else
		// leaves every integration build without its variables.
		expect(createIntegrationViteConfig(settings()).envDir).toBe(
			path.resolve(DIRECTORY, ENV_DIR_RELATIVE_PATH),
		);
		expect(createIntegrationViteConfig(settings()).envDir).toBe(
			"/repo/integration/frameworks",
		);
	});

	test("uses the given name as the library name", () => {
		expect(libOf(createIntegrationViteConfig(settings())).name).toBe(
			"ReactProcaptchaWrapper",
		);
	});

	test("builds an es module and nothing else by default", () => {
		expect(libOf(createIntegrationViteConfig(settings())).formats).toEqual([
			"es",
		]);
	});

	test("names the output through buildFileName", () => {
		const fileName = libOf(createIntegrationViteConfig(settings())).fileName;
		expect(typeof fileName).toBe("function");
		expect(fileName).toBe(buildFileName);
	});

	test("does not empty the output directory", () => {
		// The declarations and the bundle are produced by separate runs; emptying
		// would delete whichever of them ran first.
		expect(createIntegrationViteConfig(settings()).build?.emptyOutDir).toBe(
			false,
		);
	});

	test("always adds the declaration plugin", () => {
		expect(pluginsOf(createIntegrationViteConfig(settings()))).toHaveLength(1);
	});

	test("passes the dts options straight to the plugin", () => {
		const config = createIntegrationViteConfig(
			settings({ dtsPluginOptions: { declarationOnly: true } }),
		);
		expect(pluginsOf(config)).toHaveLength(1);
	});

	test("a relative directory is resolved against the working directory", () => {
		// Every consumer passes __dirname, but a relative path must still produce
		// absolute paths rather than ones vite would resolve a second time.
		const config = createIntegrationViteConfig(settings({ directory: "." }));
		expect(path.isAbsolute(config.build?.outDir ?? "")).toBe(true);
		expect(path.isAbsolute(String(libOf(config).entry))).toBe(true);
	});

	describe("the settings it refuses", () => {
		test("an empty directory, which would resolve against the cwd", () => {
			expect(() =>
				createIntegrationViteConfig(settings({ directory: "" })),
			).toThrow("package directory");
		});

		test("a directory of nothing but whitespace", () => {
			expect(() =>
				createIntegrationViteConfig(settings({ directory: "   " })),
			).toThrow("package directory");
		});

		test("an empty library name", () => {
			expect(() => createIntegrationViteConfig(settings({ name: "" }))).toThrow(
				"library name",
			);
		});

		test("a library name of nothing but whitespace", () => {
			expect(() =>
				createIntegrationViteConfig(settings({ name: " " })),
			).toThrow("library name");
		});

		test("it refuses before doing any work", () => {
			expect(() =>
				createIntegrationViteConfig(settings({ directory: "" })),
			).toThrow(Error);
		});
	});
});

describe("merging the caller's vite settings", () => {
	const plugin = (name: string): Plugin => ({ name });

	test("no settings at all is the same as empty settings", () => {
		const bare = createIntegrationViteConfig(settings());
		const empty = createIntegrationViteConfig(settings({ viteSettings: {} }));
		expect(empty.envDir).toBe(bare.envDir);
		expect(empty.build?.outDir).toBe(bare.build?.outDir);
		expect(pluginsOf(empty)).toHaveLength(pluginsOf(bare).length);
	});

	test("the caller's plugins are added to the declaration plugin, not swapped for it", () => {
		// Dropping the dts plugin would ship an integration package with no types
		// and nothing would fail until a consumer imported it.
		const config = createIntegrationViteConfig(
			settings({ viteSettings: { plugins: [plugin("vite:react")] } }),
		);
		expect(pluginsOf(config)).toHaveLength(2);
	});

	test("plugin objects survive the merge unchanged", () => {
		// deepmerge clones plain objects by default, and a plugin is a plain
		// object: a clone loses the state the plugin closed over.
		const react = plugin("vite:react");
		const config = createIntegrationViteConfig(
			settings({ viteSettings: { plugins: [react] } }),
		);
		expect(pluginsOf(config)).toContain(react);
	});

	test("a plugin's hooks are the caller's own functions, not copies", () => {
		// A cloned hook is detached from anything the plugin closed over, so it
		// would run against state that is never updated again.
		const transform = (code: string): string => code;
		const stateful: Plugin = { name: "stateful", transform };
		const config = createIntegrationViteConfig(
			settings({ viteSettings: { plugins: [stateful] } }),
		);
		const merged: Plugin | undefined = pluginsOf(config).at(-1) as
			| Plugin
			| undefined;
		expect(merged?.transform).toBe(transform);
	});

	test("nested build settings are merged, not replaced wholesale", () => {
		const config = createIntegrationViteConfig(
			settings({
				viteSettings: {
					build: { rollupOptions: { external: ["react"] } },
				},
			}),
		);
		expect(config.build?.rollupOptions?.external).toEqual(["react"]);
		expect(config.build?.outDir).toBe(path.join(DIRECTORY, "dist"));
		expect(libOf(config).name).toBe("ReactProcaptchaWrapper");
	});

	test("a caller can override a scalar default", () => {
		const config = createIntegrationViteConfig(
			settings({ viteSettings: { build: { emptyOutDir: true } } }),
		);
		expect(config.build?.emptyOutDir).toBe(true);
	});

	test("a caller can point the build somewhere else", () => {
		const config = createIntegrationViteConfig(
			settings({ viteSettings: { build: { outDir: "/tmp/out" } } }),
		);
		expect(config.build?.outDir).toBe("/tmp/out");
	});

	test("an added format gets a file of its own", () => {
		// Formats concatenate, so this is ["es", "cjs"]; before the file name took
		// the format into account both went to index.js.
		const config = createIntegrationViteConfig(
			settings({
				viteSettings: {
					build: { lib: { entry: "src/index.ts", formats: ["cjs"] } },
				},
			}),
		);
		const formats = libOf(config).formats ?? [];
		expect(formats).toContain("es");
		expect(formats).toContain("cjs");
		expect(new Set(formats.map(buildFileName)).size).toBe(formats.length);
	});

	test("settings for one package do not leak into the next", () => {
		// The default config is rebuilt per call; sharing it would let a caller's
		// plugins accumulate across every integration build in the same process.
		createIntegrationViteConfig(
			settings({ viteSettings: { plugins: [plugin("vite:vue")] } }),
		);
		expect(pluginsOf(createIntegrationViteConfig(settings()))).toHaveLength(1);
	});

	test("two calls do not share their config objects", () => {
		const first = createIntegrationViteConfig(settings());
		const second = createIntegrationViteConfig(settings());
		expect(first).not.toBe(second);
		expect(first.build).not.toBe(second.build);
	});

	test("the caller's settings object is not modified", () => {
		const viteSettings: UserConfig = { plugins: [plugin("vite:react")] };
		createIntegrationViteConfig(settings({ viteSettings }));
		expect(pluginsOf(viteSettings)).toHaveLength(1);
	});
});
