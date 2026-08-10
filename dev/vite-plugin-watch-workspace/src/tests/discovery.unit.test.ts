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
import type { BuildOptions, BuildResult } from "esbuild";
import fg from "fast-glob";
import { type Mock, beforeEach, describe, expect, test, vi } from "vitest";
import {
	MAX_TSCONFIG_EXTENDS_DEPTH,
	type TsConfigLike,
	type WatchWorkspaceDeps,
	getExternalFileLists,
	getFilesAndTsConfigs,
	getTsConfigFollowExtends,
} from "../vite-plugin-watch-workspace.js";

const ROOT = path.resolve(path.sep, "repo");

/**
 * A dependency set backed by plain objects.
 *
 * Every seam is required, so a test that forgets to describe part of the
 * workspace gets a deterministic empty/throwing result rather than reaching the
 * real filesystem of whatever machine happens to run CI.
 */
interface Fixture {
	files?: Record<string, string>;
	dirs?: Record<string, string[]>;
	tsconfigs?: Record<string, TsConfigLike | undefined>;
	globResults?: Record<string, string[]>;
}

const makeDeps = (fixture: Fixture): WatchWorkspaceDeps => ({
	readFile: (target: string): string => {
		const contents = fixture.files?.[target];
		if (contents === undefined) {
			throw Object.assign(new Error(`ENOENT: ${target}`), { code: "ENOENT" });
		}
		return contents;
	},
	readDir: (target: string): string[] => fixture.dirs?.[target] ?? [],
	isDirectory: (target: string): boolean =>
		fixture.dirs?.[target] !== undefined,
	glob: (pattern: string): Promise<string[]> =>
		Promise.resolve(fixture.globResults?.[pattern] ?? []),
	readTsConfig: (filename: string): TsConfigLike | undefined =>
		fixture.tsconfigs?.[filename],
	build: (_options: BuildOptions): Promise<BuildResult> =>
		Promise.resolve({ errors: [], warnings: [] } as unknown as BuildResult),
	now: (): number => 1_700_000_000_000,
});

describe("getTsConfigFollowExtends", () => {
	const base = path.join(ROOT, "tsconfig.base.json");
	const leaf = path.join(ROOT, "pkg", "tsconfig.json");

	test("returns the config when there is nothing to extend", () => {
		const deps = makeDeps({
			tsconfigs: { [leaf]: { compilerOptions: { rootDir: "src" } } },
		});
		expect(
			getTsConfigFollowExtends(leaf, undefined, deps).compilerOptions?.rootDir,
		).toBe("src");
	});

	test("merges compilerOptions from the base, with the leaf winning", () => {
		const deps = makeDeps({
			tsconfigs: {
				[base]: {
					compilerOptions: { rootDir: "base-root", outDir: "base-out" },
				},
				[leaf]: {
					extends: "../tsconfig.base.json",
					compilerOptions: { rootDir: "src" },
				},
			},
		});
		const merged = getTsConfigFollowExtends(leaf, undefined, deps);
		expect(merged.compilerOptions).toEqual({
			rootDir: "src",
			outDir: "base-out",
		});
	});

	test("resolves a relative extends against the tsconfig's own directory", () => {
		// The bug this pins: the top-level call passed no rootDir, so `extends`
		// resolved against process.cwd(). Running vite from the repo root then
		// looked for the base config in the wrong place and silently returned an
		// unmerged config — which meant the default rootDir/outDir, and output
		// written to the wrong directory.
		const readTsConfig = vi.fn(
			(filename: string): TsConfigLike | undefined =>
				({
					[leaf]: { extends: "../tsconfig.base.json" },
					[base]: { compilerOptions: { outDir: "resolved" } },
				})[filename],
		);
		const deps: WatchWorkspaceDeps = { ...makeDeps({}), readTsConfig };
		expect(
			getTsConfigFollowExtends(leaf, undefined, deps).compilerOptions,
		).toEqual({
			outDir: "resolved",
		});
		expect(readTsConfig).toHaveBeenCalledWith(base);
	});

	test("an explicit rootDir overrides the tsconfig's directory", () => {
		const other = path.join(ROOT, "other", "tsconfig.base.json");
		const deps = makeDeps({
			tsconfigs: {
				[leaf]: { extends: "./tsconfig.base.json" },
				[other]: { compilerOptions: { outDir: "other" } },
			},
		});
		expect(
			getTsConfigFollowExtends(leaf, path.join(ROOT, "other"), deps)
				.compilerOptions,
		).toEqual({ outDir: "other" });
	});

	test("follows a multi-level extends chain, each hop relative to its own file", () => {
		const mid = path.join(ROOT, "a", "mid.json");
		const top = path.join(ROOT, "top.json");
		const deps = makeDeps({
			tsconfigs: {
				[leaf]: { extends: "../a/mid.json" },
				[mid]: { extends: "../top.json" },
				[top]: { compilerOptions: { outDir: "top-out", rootDir: "top-root" } },
			},
		});
		expect(
			getTsConfigFollowExtends(leaf, undefined, deps).compilerOptions,
		).toEqual({
			outDir: "top-out",
			rootDir: "top-root",
		});
	});

	test("returns an empty config when the tsconfig cannot be read", () => {
		// Previously threw `Cannot read properties of undefined (reading
		// 'extends')`, naming neither the file nor this plugin.
		const deps = makeDeps({ tsconfigs: {} });
		expect(getTsConfigFollowExtends(leaf, undefined, deps)).toEqual({
			compilerOptions: {},
		});
	});

	test("returns an empty config when a config in the chain is missing", () => {
		const deps = makeDeps({
			tsconfigs: { [leaf]: { extends: "../missing.json" } },
		});
		expect(
			getTsConfigFollowExtends(leaf, undefined, deps).compilerOptions,
		).toEqual({});
	});

	test("throws a named error on a self-referencing extends rather than overflowing the stack", () => {
		const deps = makeDeps({
			tsconfigs: { [leaf]: { extends: "./tsconfig.json" } },
		});
		expect(() => getTsConfigFollowExtends(leaf, undefined, deps)).toThrow(
			new RegExp(`exceeded ${MAX_TSCONFIG_EXTENDS_DEPTH} levels`),
		);
	});

	test("throws on a two-file extends cycle", () => {
		const deps = makeDeps({
			tsconfigs: {
				[leaf]: { extends: "../tsconfig.base.json" },
				[base]: { extends: "./pkg/tsconfig.json" },
			},
		});
		expect(() => getTsConfigFollowExtends(leaf, undefined, deps)).toThrow(
			/probably a cycle/,
		);
	});

	test("accepts a chain one hop short of the limit", () => {
		const link = (index: number): string => path.join(ROOT, `c${index}.json`);
		const tsconfigs: Record<string, TsConfigLike> = {};
		for (let index = 0; index < MAX_TSCONFIG_EXTENDS_DEPTH; index++) {
			tsconfigs[link(index)] = { extends: `./c${index + 1}.json` };
		}
		tsconfigs[link(MAX_TSCONFIG_EXTENDS_DEPTH)] = {
			compilerOptions: { outDir: "deep" },
		};
		const deps = makeDeps({ tsconfigs });
		expect(
			getTsConfigFollowExtends(link(0), undefined, deps).compilerOptions,
		).toEqual({ outDir: "deep" });
	});

	test("ignores a non-string extends instead of throwing", () => {
		// TypeScript accepts an array of base configs; following them is out of
		// scope, but the plugin must still return a usable config.
		const deps = makeDeps({
			tsconfigs: {
				[leaf]: {
					extends: ["./a.json", "./b.json"],
					compilerOptions: { outDir: "x" },
				},
			},
		});
		expect(
			getTsConfigFollowExtends(leaf, undefined, deps).compilerOptions,
		).toEqual({
			outDir: "x",
		});
	});

	test("a config with no compilerOptions merges to an empty object, not undefined", () => {
		const deps = makeDeps({ tsconfigs: { [leaf]: {} } });
		expect(
			getTsConfigFollowExtends(leaf, undefined, deps).compilerOptions,
		).toEqual({});
	});
});

describe("getFilesAndTsConfigs", () => {
	const workspacePath = path.join(ROOT, "packages");
	const packagePath = path.join(workspacePath, "cli");
	const tsConfigPath = path.join(packagePath, "tsconfig.json");

	const globFor = (rootDir: string, types: string): string =>
		`${fg.convertPathToPattern(path.resolve(packagePath, rootDir))}/**/*.(${types})`;

	test("leaves the glob metacharacters unescaped", async () => {
		// fast-glob's convertPathToPattern escapes `*`, `(` and `|` so that a path
		// can be used as a literal pattern. It used to be applied to the whole
		// pattern, which escaped the glob itself — so the search matched only a
		// file literally named `**`, and the plugin watched nothing at all.
		const glob = vi.fn((pattern: string) => {
			expect(pattern).not.toContain("\\");
			expect(pattern).toBe(`${packagePath}/**/*.(ts|tsx)`);
			return Promise.resolve([]);
		});
		const deps: WatchWorkspaceDeps = { ...makeDeps({}), glob };
		await getFilesAndTsConfigs(
			workspacePath,
			"p",
			"cli",
			["ts", "tsx"],
			undefined,
			deps,
		);
		expect(glob).toHaveBeenCalledOnce();
	});

	test("returns a triple per file, tagged with the tsconfig and package dir", async () => {
		const pattern = globFor("src", "ts|tsx");
		const file = path.join(packagePath, "src", "a.ts");
		const deps = makeDeps({
			tsconfigs: { [tsConfigPath]: { compilerOptions: { rootDir: "src" } } },
			globResults: { [pattern]: [file] },
		});
		await expect(
			getFilesAndTsConfigs(
				workspacePath,
				"packages/other",
				"cli",
				["ts", "tsx"],
				undefined,
				deps,
			),
		).resolves.toEqual([[file, tsConfigPath, "cli"]]);
	});

	test("returns an empty list when the package has no matching files", async () => {
		const deps = makeDeps({
			tsconfigs: { [tsConfigPath]: { compilerOptions: { rootDir: "src" } } },
		});
		await expect(
			getFilesAndTsConfigs(workspacePath, "p", "cli", ["ts"], undefined, deps),
		).resolves.toEqual([]);
	});

	test("defaults rootDir to '.' when the package tsconfig is unreadable", async () => {
		const pattern = globFor(".", "ts");
		const file = path.join(packagePath, "a.ts");
		const deps = makeDeps({ globResults: { [pattern]: [file] } });
		await expect(
			getFilesAndTsConfigs(workspacePath, "p", "cli", ["ts"], undefined, deps),
		).resolves.toEqual([[file, tsConfigPath, "cli"]]);
	});

	test("turns a plain currentPackage path into a glob so it is excluded", async () => {
		const glob = vi.fn((_pattern: string, options: { ignore: string[] }) => {
			expect(options.ignore).toContain("packages/cli/**/*");
			return Promise.resolve([]);
		});
		const deps: WatchWorkspaceDeps = { ...makeDeps({}), glob };
		await getFilesAndTsConfigs(
			workspacePath,
			"packages/cli",
			"cli",
			["ts"],
			undefined,
			deps,
		);
		expect(glob).toHaveBeenCalledOnce();
	});

	test("leaves a currentPackage that is already a glob alone", async () => {
		const glob = vi.fn((_pattern: string, options: { ignore: string[] }) => {
			expect(options.ignore).toContain("packages/*/src/**");
			expect(options.ignore).not.toContain("packages/*/src/**/**/*");
			return Promise.resolve([]);
		});
		const deps: WatchWorkspaceDeps = { ...makeDeps({}), glob };
		await getFilesAndTsConfigs(
			workspacePath,
			"packages/*/src/**",
			"cli",
			["ts"],
			undefined,
			deps,
		);
		expect(glob).toHaveBeenCalledOnce();
	});

	test("always ignores node_modules and appends the caller's ignore paths", async () => {
		const glob = vi.fn((_pattern: string, options: { ignore: string[] }) => {
			expect(options.ignore).toEqual([
				"**/node_modules/**",
				"p/**/*",
				"**/dist/**",
				"**/*.d.ts",
			]);
			return Promise.resolve([]);
		});
		const deps: WatchWorkspaceDeps = { ...makeDeps({}), glob };
		await getFilesAndTsConfigs(
			workspacePath,
			"p",
			"cli",
			["ts"],
			["**/dist/**", "**/*.d.ts"],
			deps,
		);
		expect(glob).toHaveBeenCalledOnce();
	});

	test("an empty fileTypes list produces an empty alternation rather than throwing", async () => {
		// Degenerate but reachable: `fileTypes: []` in a consumer's config. The
		// pattern matches nothing, which is the honest outcome.
		const glob = vi.fn((pattern: string) => {
			expect(pattern).toContain("*.()");
			return Promise.resolve([]);
		});
		const deps: WatchWorkspaceDeps = { ...makeDeps({}), glob };
		await expect(
			getFilesAndTsConfigs(workspacePath, "p", "cli", [], undefined, deps),
		).resolves.toEqual([]);
	});

	test("propagates a glob failure rather than reporting no files", async () => {
		// Swallowing this would leave the watcher silently watching nothing.
		const deps: WatchWorkspaceDeps = {
			...makeDeps({}),
			glob: () => Promise.reject(new Error("EACCES")),
		};
		await expect(
			getFilesAndTsConfigs(workspacePath, "p", "cli", ["ts"], undefined, deps),
		).rejects.toThrow("EACCES");
	});
});

describe("getExternalFileLists", () => {
	const packagesDir = path.join(ROOT, "packages");
	const packageJson = path.join(ROOT, "package.json");

	const workspaceFixture = (workspacesField: unknown): Fixture => ({
		files: { [packageJson]: JSON.stringify({ workspaces: workspacesField }) },
		dirs: {
			[packagesDir]: ["cli", "core", "notes.txt"],
			[path.join(packagesDir, "cli")]: [],
			[path.join(packagesDir, "core")]: [],
		},
		tsconfigs: {
			[path.join(packagesDir, "cli", "tsconfig.json")]: {
				compilerOptions: { rootDir: "src" },
			},
			[path.join(packagesDir, "core", "tsconfig.json")]: {
				compilerOptions: { rootDir: "src" },
			},
		},
		globResults: {
			[path.resolve(packagesDir, "cli", "src/**/*.(ts)")]: [
				path.join(packagesDir, "cli", "src", "a.ts"),
			],
			[path.resolve(packagesDir, "core", "src/**/*.(ts)")]: [
				path.join(packagesDir, "core", "src", "b.ts"),
			],
		},
	});

	test("maps every discovered file to its tsconfig and package dir", async () => {
		const deps = makeDeps(workspaceFixture(["packages/*"]));
		await expect(
			getExternalFileLists(ROOT, "packages/none", ["ts"], undefined, deps),
		).resolves.toEqual({
			[path.join(packagesDir, "cli", "src", "a.ts")]: [
				path.join(packagesDir, "cli", "tsconfig.json"),
				"cli",
			],
			[path.join(packagesDir, "core", "src", "b.ts")]: [
				path.join(packagesDir, "core", "tsconfig.json"),
				"core",
			],
		});
	});

	test("skips non-directory entries in a globbed workspace", async () => {
		// `notes.txt` sits alongside the package directories and has no tsconfig.
		const isDirectory = vi.fn(
			(target: string): boolean =>
				target.endsWith("cli") || target.endsWith("core"),
		);
		const deps: WatchWorkspaceDeps = {
			...makeDeps(workspaceFixture(["packages/*"])),
			isDirectory,
		};
		const result = await getExternalFileLists(
			ROOT,
			"p",
			["ts"],
			undefined,
			deps,
		);
		expect(Object.keys(result)).toHaveLength(2);
		expect(isDirectory).toHaveBeenCalledWith(
			path.join(packagesDir, "notes.txt"),
		);
	});

	test("resolves a non-glob workspace entry against the workspace root", async () => {
		// The entry names one package directly. It used to be handed down as a
		// bare relative string beside an absolute package path and only worked by
		// accident of path.resolve's argument precedence.
		const cliDir = path.join(ROOT, "tools", "cli");
		const deps = makeDeps({
			files: {
				[packageJson]: JSON.stringify({ workspaces: ["tools/cli"] }),
			},
			tsconfigs: {
				[path.join(cliDir, "tsconfig.json")]: {
					compilerOptions: { rootDir: "src" },
				},
			},
			globResults: {
				[path.resolve(cliDir, "src/**/*.(ts)")]: [
					path.join(cliDir, "src", "a.ts"),
				],
			},
		});
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).resolves.toEqual({
			[path.join(cliDir, "src", "a.ts")]: [
				path.join(cliDir, "tsconfig.json"),
				cliDir,
			],
		});
	});

	test("accepts the object form of the workspaces field", async () => {
		const deps = makeDeps({
			...workspaceFixture(["packages/*"]),
			files: {
				[packageJson]: JSON.stringify({
					workspaces: { packages: ["packages/*"] },
				}),
			},
		});
		const result = await getExternalFileLists(
			ROOT,
			"p",
			["ts"],
			undefined,
			deps,
		);
		expect(Object.keys(result)).toHaveLength(2);
	});

	test("returns an empty map for an empty workspaces array", async () => {
		const deps = makeDeps(workspaceFixture([]));
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).resolves.toEqual({});
	});

	test("returns an empty map when a globbed workspace directory has no packages", async () => {
		const deps = makeDeps({
			files: { [packageJson]: JSON.stringify({ workspaces: ["packages/*"] }) },
			dirs: { [packagesDir]: [] },
		});
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).resolves.toEqual({});
	});

	test("ignores non-string entries in the workspaces array", async () => {
		const deps = makeDeps({
			...workspaceFixture(["packages/*"]),
			files: {
				[packageJson]: JSON.stringify({ workspaces: ["packages/*", 42, null] }),
			},
		});
		const result = await getExternalFileLists(
			ROOT,
			"p",
			["ts"],
			undefined,
			deps,
		);
		expect(Object.keys(result)).toHaveLength(2);
	});

	test("names the file and field when workspaces is missing", async () => {
		// The old failure was `Cannot read properties of undefined (reading
		// 'map')`, which pointed at the plugin rather than the package.json.
		const deps = makeDeps({ files: { [packageJson]: "{}" } });
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).rejects.toThrow(`no 'workspaces' array in ${packageJson}`);
	});

	test("names the file when workspaces is neither an array nor a packages object", async () => {
		const deps = makeDeps({
			files: { [packageJson]: JSON.stringify({ workspaces: "packages/*" }) },
		});
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).rejects.toThrow(/no 'workspaces' array/);
	});

	test("names the file when the package.json is not valid JSON", async () => {
		const deps = makeDeps({ files: { [packageJson]: "{ not json" } });
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).rejects.toThrow(
			new RegExp(`could not parse ${packageJson.replace(/\\/g, "\\\\")}`),
		);
	});

	test("names the file when the package.json parses to null", async () => {
		const deps = makeDeps({ files: { [packageJson]: "null" } });
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).rejects.toThrow(/no 'workspaces' array/);
	});

	test("propagates a missing workspace root package.json", async () => {
		const deps = makeDeps({});
		await expect(
			getExternalFileLists(ROOT, "p", ["ts"], undefined, deps),
		).rejects.toThrow(/ENOENT/);
	});

	test("a later package's file wins when two packages emit the same path", async () => {
		// The map is keyed by file path, so a duplicate is silently collapsed.
		// Pinned because it decides which tsconfig a rebuild uses.
		const shared = path.join(packagesDir, "shared.ts");
		const fixture = workspaceFixture(["packages/*"]);
		const deps = makeDeps({
			...fixture,
			globResults: {
				[path.resolve(packagesDir, "cli", "src/**/*.(ts)")]: [shared],
				[path.resolve(packagesDir, "core", "src/**/*.(ts)")]: [shared],
			},
		});
		const result = await getExternalFileLists(
			ROOT,
			"p",
			["ts"],
			undefined,
			deps,
		);
		expect(result[shared]).toEqual([
			path.join(packagesDir, "core", "tsconfig.json"),
			"core",
		]);
	});
});

describe("VitePluginWatchWorkspace", () => {
	const packagesDir = path.join(ROOT, "packages");
	const packageJson = path.join(ROOT, "package.json");
	const sourceFile = path.join(packagesDir, "cli", "src", "a.ts");
	const tsConfigPath = path.join(packagesDir, "cli", "tsconfig.json");

	const fixture = (): Fixture => ({
		files: {
			[packageJson]: JSON.stringify({ workspaces: ["packages/*"] }),
			[sourceFile]: "export const a = 1;",
		},
		dirs: {
			[packagesDir]: ["cli"],
			[path.join(packagesDir, "cli")]: [],
		},
		tsconfigs: {
			[tsConfigPath]: { compilerOptions: { rootDir: "src", outDir: "dist" } },
		},
		globResults: {
			[path.resolve(packagesDir, "cli", "src/**/*.(ts|tsx)")]: [sourceFile],
		},
	});

	interface HotUpdateContext {
		file: string;
		server: { ws: { send: (payload: unknown) => void } };
	}

	type BuildFn = (options: BuildOptions) => Promise<BuildResult>;
	type SendFn = (payload: unknown) => void;
	type AddWatchFileFn = (file: string) => void;

	let deps: WatchWorkspaceDeps;
	let build: Mock<BuildFn>;
	let send: Mock<SendFn>;

	beforeEach(() => {
		build = vi.fn<BuildFn>(() =>
			Promise.resolve({ errors: [], warnings: [] } as unknown as BuildResult),
		);
		send = vi.fn<SendFn>();
		deps = { ...makeDeps(fixture()), build };
	});

	const makePlugin = async (
		overrides: Partial<{
			workspaceRoot: string;
			currentPackage: string;
			format: "esm" | "cjs";
			fileTypes: string[];
		}> = {},
	) => {
		const { VitePluginWatchWorkspace } = await import(
			"../vite-plugin-watch-workspace.js"
		);
		return await VitePluginWatchWorkspace(
			{
				workspaceRoot: ROOT,
				currentPackage: "packages/none",
				format: "esm",
				...overrides,
			},
			deps,
		);
	};

	test("is named so vite can report it", async () => {
		expect((await makePlugin()).name).toBe("vite-plugin-watch-workspace");
	});

	test("registers every discovered file as a watch target", async () => {
		const plugin = await makePlugin();
		const addWatchFile = vi.fn<AddWatchFileFn>();
		await callBuildStart(plugin, addWatchFile);
		expect(addWatchFile).toHaveBeenCalledExactlyOnceWith(sourceFile);
	});

	test("registers nothing when the workspace has no matching files", async () => {
		deps = { ...makeDeps({ ...fixture(), globResults: {} }), build };
		const plugin = await makePlugin();
		const addWatchFile = vi.fn<AddWatchFileFn>();
		await callBuildStart(plugin, addWatchFile);
		expect(addWatchFile).not.toHaveBeenCalled();
	});

	/**
	 * Invoke buildStart with only the one context method the hook uses. Rollup's
	 * PluginContext has ~15 members; constructing a real one would test rollup.
	 */
	const callBuildStart = async (
		plugin: Awaited<ReturnType<typeof makePlugin>>,
		addWatchFile: Mock<AddWatchFileFn>,
	): Promise<void> => {
		const buildStart = plugin.buildStart;
		if (typeof buildStart !== "function") throw new Error("no buildStart hook");
		await buildStart.call(
			{ addWatchFile } as unknown as ThisParameterType<typeof buildStart>,
			{} as unknown as Parameters<typeof buildStart>[0],
		);
	};

	const runHotUpdate = async (
		file: string,
		overrides?: Parameters<typeof makePlugin>[0],
	): Promise<void> => {
		const plugin = await makePlugin(overrides);
		const handleHotUpdate = plugin.handleHotUpdate;
		if (typeof handleHotUpdate !== "function") {
			throw new Error("no handleHotUpdate hook");
		}
		const context: HotUpdateContext = { file, server: { ws: { send } } };
		// The hook only reads `file` and `server`; vite's full HmrContext carries
		// several more fields that are irrelevant here.
		await handleHotUpdate.call(
			{} as unknown as ThisParameterType<typeof handleHotUpdate>,
			context as unknown as Parameters<typeof handleHotUpdate>[0],
		);
	};

	test("rebuilds a watched file into its package's outDir and notifies the client", async () => {
		await runHotUpdate(sourceFile);
		expect(build).toHaveBeenCalledExactlyOnceWith({
			tsconfig: tsConfigPath,
			stdin: {
				contents: "export const a = 1;",
				loader: "ts",
				resolveDir: path.join(packagesDir, "cli", "src"),
			},
			outfile: path.join(packagesDir, "cli", "dist", "a.js"),
			platform: "neutral",
			format: "esm",
		});
		expect(send).toHaveBeenCalledExactlyOnceWith({
			type: "update",
			updates: [
				{
					acceptedPath: sourceFile,
					type: "js-update",
					path: sourceFile,
					timestamp: 1_700_000_000_000,
				},
			],
		});
	});

	test("ignores a change to a file outside the workspace", async () => {
		// Vite reports every change in the project; anything the plugin did not
		// discover has no tsconfig, and building it would write to an outdir
		// derived from the wrong package.
		await runHotUpdate(path.join(ROOT, "unrelated.ts"));
		expect(build).not.toHaveBeenCalled();
		expect(send).not.toHaveBeenCalled();
	});

	test("targets node for cjs", async () => {
		await runHotUpdate(sourceFile, { format: "cjs" });
		expect(build).toHaveBeenCalledWith(
			expect.objectContaining({ platform: "node", format: "cjs" }),
		);
	});

	test("does not notify the client when the rebuild fails", async () => {
		// A failed build leaves the previous output on disk; telling the browser
		// to swap it in would show stale code as if the edit had applied.
		build.mockRejectedValueOnce(new Error("esbuild: syntax error"));
		await expect(runHotUpdate(sourceFile)).rejects.toThrow("syntax error");
		expect(send).not.toHaveBeenCalled();
	});

	test("does not build when the changed file has been deleted", async () => {
		deps = {
			...deps,
			readFile: (target: string): string => {
				if (target === sourceFile) throw new Error("ENOENT");
				return JSON.stringify({ workspaces: ["packages/*"] });
			},
		};
		await expect(runHotUpdate(sourceFile)).rejects.toThrow("ENOENT");
		expect(build).not.toHaveBeenCalled();
	});

	test("surfaces a discovery failure at plugin construction, not at first edit", async () => {
		// The plugin is awaited inside the vite config, so a broken workspace
		// fails the config load with a clear error instead of half-working.
		deps = { ...makeDeps({ files: { [packageJson]: "{}" } }), build };
		await expect(makePlugin()).rejects.toThrow(/no 'workspaces' array/);
	});
});
