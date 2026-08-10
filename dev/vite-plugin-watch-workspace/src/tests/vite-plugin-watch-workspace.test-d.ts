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

import type { BuildOptions, BuildResult } from "esbuild";
import { assertType, describe, expectTypeOf, test } from "vitest";
// The package entrypoint, not the module: consumers import
// `@prosopo/vite-plugin-watch-workspace`, so that is the surface worth pinning.
import {
	type ExternalFiles,
	type TsConfigLike,
	type VitePluginWatchExternalOptions,
	VitePluginWatchWorkspace,
	type WatchWorkspaceDeps,
	defaultDeps,
	getExternalFileLists,
	getLoader,
	getOutDir,
	getOutExtension,
	getOutFile,
	getTsConfigFollowExtends,
	replaceLastSegments,
} from "../index.js";

const options: VitePluginWatchExternalOptions = {
	workspaceRoot: "/repo",
	currentPackage: "packages/cli",
	format: "esm",
};

describe("VitePluginWatchExternalOptions", () => {
	test("requires workspaceRoot, currentPackage and format", () => {
		// @ts-expect-error format is required
		assertType<VitePluginWatchExternalOptions>({
			workspaceRoot: "/repo",
			currentPackage: "packages/cli",
		});
	});

	test("format is a closed union — a typo must not reach esbuild", () => {
		expectTypeOf<VitePluginWatchExternalOptions["format"]>().toEqualTypeOf<
			"esm" | "cjs"
		>();
		// @ts-expect-error "iife" is not supported by the plugin
		assertType<VitePluginWatchExternalOptions>({ ...options, format: "iife" });
	});

	test("fileTypes and ignorePaths are optional string arrays", () => {
		expectTypeOf<VitePluginWatchExternalOptions["fileTypes"]>().toEqualTypeOf<
			string[] | undefined
		>();
		expectTypeOf<VitePluginWatchExternalOptions["ignorePaths"]>().toEqualTypeOf<
			string[] | undefined
		>();
		assertType<VitePluginWatchExternalOptions>({
			...options,
			fileTypes: ["ts"],
			ignorePaths: ["**/dist/**"],
		});
	});
});

describe("VitePluginWatchWorkspace", () => {
	test("is async — consumers must await it inside their vite config", () => {
		expectTypeOf(VitePluginWatchWorkspace(options)).toMatchTypeOf<
			Promise<unknown>
		>();
	});

	test("deps are optional, so the original single-argument call still type checks", () => {
		assertType<Promise<unknown>>(VitePluginWatchWorkspace(options));
		assertType<Promise<unknown>>(
			VitePluginWatchWorkspace(options, defaultDeps),
		);
	});

	test("rejects a partial dependency set", () => {
		// A partial set would fall through to the real filesystem for whatever it
		// omitted, which is what the seam exists to prevent.
		// @ts-expect-error missing every seam but readFile
		VitePluginWatchWorkspace(options, { readFile: () => "" });
	});

	test("the resolved plugin exposes the hooks vite calls", () => {
		type Plugin = Awaited<ReturnType<typeof VitePluginWatchWorkspace>>;
		expectTypeOf<Plugin["name"]>().toEqualTypeOf<string>();
		expectTypeOf<Plugin>().toHaveProperty("buildStart");
		expectTypeOf<Plugin>().toHaveProperty("handleHotUpdate");
	});
});

describe("WatchWorkspaceDeps", () => {
	test("pins each seam's signature", () => {
		expectTypeOf<WatchWorkspaceDeps["readFile"]>().toEqualTypeOf<
			(target: string) => string
		>();
		expectTypeOf<WatchWorkspaceDeps["readDir"]>().toEqualTypeOf<
			(target: string) => string[]
		>();
		expectTypeOf<WatchWorkspaceDeps["isDirectory"]>().toEqualTypeOf<
			(target: string) => boolean
		>();
		expectTypeOf<WatchWorkspaceDeps["now"]>().toEqualTypeOf<() => number>();
	});

	test("readFile returns a string, not a Buffer — the encoding is pinned by the default", () => {
		expectTypeOf(defaultDeps.readFile("/x")).toEqualTypeOf<string>();
		expectTypeOf(defaultDeps.readFile("/x")).not.toBeAny();
	});

	test("glob and build are async and keep esbuild's own types", () => {
		expectTypeOf<WatchWorkspaceDeps["glob"]>().returns.toEqualTypeOf<
			Promise<string[]>
		>();
		expectTypeOf<WatchWorkspaceDeps["build"]>().toEqualTypeOf<
			(options: BuildOptions) => Promise<BuildResult>
		>();
	});

	test("readTsConfig may return undefined — a tsconfig can be absent", () => {
		// If this were widened to TsConfigLike the missing-file branch would be
		// unreachable in the type system while still happening at runtime.
		expectTypeOf<WatchWorkspaceDeps["readTsConfig"]>().returns.toEqualTypeOf<
			TsConfigLike | undefined
		>();
	});

	test("defaultDeps satisfies the interface exactly", () => {
		expectTypeOf(defaultDeps).toEqualTypeOf<WatchWorkspaceDeps>();
	});
});

describe("TsConfigLike", () => {
	test("every field is optional — a tsconfig may be empty", () => {
		assertType<TsConfigLike>({});
		assertType<TsConfigLike>({ compilerOptions: {} });
	});

	test("rootDir and outDir are unknown, forcing a narrowing check", () => {
		// They come from user-authored JSON, so typing them as string would let
		// the code do string operations on a number at runtime.
		expectTypeOf<
			NonNullable<TsConfigLike["compilerOptions"]>["rootDir"]
		>().toEqualTypeOf<unknown>();
		expectTypeOf<TsConfigLike["extends"]>().toEqualTypeOf<unknown>();
		assertType<TsConfigLike>({ extends: ["./a.json"] });
		assertType<TsConfigLike>({ compilerOptions: { rootDir: 7 } });
	});
});

describe("ExternalFiles", () => {
	test("maps a file path to a [tsconfig, packageDir] pair", () => {
		assertType<ExternalFiles>({ "/a.ts": ["/tsconfig.json", "cli"] });
		// @ts-expect-error the value is a two-element tuple, not a bare string
		assertType<ExternalFiles>({ "/a.ts": "/tsconfig.json" });
	});

	test("a lookup may miss, so consumers must check before destructuring", () => {
		const files: ExternalFiles = {};
		expectTypeOf(files["/a.ts"]).toEqualTypeOf<[string, string] | undefined>();
	});
});

describe("pure path helpers", () => {
	test("getLoader and getOutExtension narrow to their literal unions", () => {
		expectTypeOf(getLoader(".ts")).toEqualTypeOf<
			"ts" | "tsx" | "js" | "jsx" | "css" | "json"
		>();
		expectTypeOf(getOutExtension(".ts")).toEqualTypeOf<
			".js" | ".css" | ".json"
		>();
	});

	test("getLoader's result is assignable to esbuild's Loader", () => {
		// The whole point of the union: it is handed straight to esbuild's stdin.
		assertType<NonNullable<BuildOptions["stdin"]>["loader"]>(getLoader(".ts"));
	});

	test("getOutDir takes a config object, not a path", () => {
		expectTypeOf(getOutDir("/a/src/b.ts", {}, "a")).toEqualTypeOf<string>();
		// @ts-expect-error the second parameter is the parsed tsconfig
		getOutDir("/a/src/b.ts", "/a/tsconfig.json", "a");
	});

	test("getOutFile and replaceLastSegments return strings", () => {
		expectTypeOf(getOutFile("/o", "/s/a.ts", ".ts")).toEqualTypeOf<string>();
		expectTypeOf(replaceLastSegments("/a/b", "b", "c")).toEqualTypeOf<string>();
	});
});

describe("getTsConfigFollowExtends", () => {
	test("returns a config, never undefined — the missing-file case is handled inside", () => {
		expectTypeOf(
			getTsConfigFollowExtends("/tsconfig.json"),
		).toEqualTypeOf<TsConfigLike>();
	});

	test("rootDir, deps and depth are all optional", () => {
		assertType<TsConfigLike>(getTsConfigFollowExtends("/tsconfig.json"));
		assertType<TsConfigLike>(
			getTsConfigFollowExtends("/tsconfig.json", "/base"),
		);
		assertType<TsConfigLike>(
			getTsConfigFollowExtends("/tsconfig.json", undefined, defaultDeps),
		);
	});
});

describe("getExternalFileLists", () => {
	test("resolves to the ExternalFiles map", () => {
		expectTypeOf(getExternalFileLists("/repo", "p", ["ts"])).toEqualTypeOf<
			Promise<ExternalFiles>
		>();
	});

	test("ignorePaths is optional and fileTypes is required", () => {
		// @ts-expect-error fileTypes has no default at this level
		getExternalFileLists("/repo", "p");
	});
});
