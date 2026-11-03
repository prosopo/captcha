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
import type { UserConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDependencies } from "./dependencies.js";

interface FixtureManifest {
	name: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

let root: string;

const writeManifest = (dir: string, manifest: FixtureManifest): string => {
	const absolute = path.join(root, dir);
	fs.mkdirSync(absolute, { recursive: true });
	fs.writeFileSync(
		path.join(absolute, "package.json"),
		JSON.stringify(manifest),
	);
	return absolute;
};

/** Install `name` at `dir/node_modules/name`, as npm's hoisted layout would. */
const install = (dir: string, manifest: FixtureManifest): string =>
	writeManifest(path.join(dir, "node_modules", manifest.name), manifest);

/** Link `name` into `dir/node_modules` from `target`, as pnpm does. */
const link = (dir: string, name: string, target: string): void => {
	const linkPath = path.join(root, dir, "node_modules", name);
	fs.mkdirSync(path.dirname(linkPath), { recursive: true });
	fs.symlinkSync(target, linkPath, "dir");
};

const useCwd = (dir: string): void => {
	vi.spyOn(process, "cwd").mockReturnValue(path.join(root, dir));
};

beforeEach(() => {
	root = fs.realpathSync(
		fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-get-deps-")),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	fs.rmSync(root, { recursive: true, force: true });
});

describe("getDependencies", () => {
	it("walks the installed tree transitively", async () => {
		writeManifest("app", {
			name: "@prosopo/app",
			dependencies: { mongodb: "6.3.0", zod: "3.22.4" },
		});
		install("app", { name: "mongodb", dependencies: { bson: "6.2.0" } });
		install("app", { name: "bson" });
		install("app", { name: "zod" });
		useCwd("app");

		const { dependencies } = await getDependencies();
		expect(dependencies.sort()).toEqual([
			"@prosopo/app",
			"bson",
			"mongodb",
			"zod",
		]);
	});

	it("follows pnpm's symlinked virtual store", async () => {
		writeManifest("app", {
			name: "@prosopo/app",
			dependencies: { mongodb: "6.3.0" },
		});
		const store = "node_modules/.pnpm/mongodb@6.3.0/node_modules";
		const mongodb = writeManifest(`${store}/mongodb`, {
			name: "mongodb",
			dependencies: { bson: "6.2.0" },
		});
		writeManifest(`${store}/bson`, { name: "bson" });
		link("app", "mongodb", mongodb);
		useCwd("app");

		const { dependencies } = await getDependencies();
		expect(dependencies.sort()).toEqual(["@prosopo/app", "bson", "mongodb"]);
	});

	it("includes the starting package's devDependencies unless production", async () => {
		writeManifest("app", {
			name: "@prosopo/app",
			dependencies: { zod: "3.22.4" },
			devDependencies: { vitest: "4.0.0" },
		});
		install("app", { name: "zod" });
		install("app", { name: "vitest", devDependencies: { tsx: "4.0.0" } });
		useCwd("app");

		await expect(getDependencies(undefined, false)).resolves.toMatchObject({
			dependencies: ["@prosopo/app", "zod", "vitest"],
		});
		await expect(getDependencies(undefined, true)).resolves.toMatchObject({
			dependencies: ["@prosopo/app", "zod"],
		});
	});

	it("reports optional dependencies and peers that are not installed", async () => {
		writeManifest("app", {
			name: "@prosopo/app",
			dependencies: { ws: "8.0.0" },
			optionalDependencies: { fsevents: "2.0.0" },
		});
		install("app", {
			name: "ws",
			peerDependencies: { bufferutil: "^4.0.1", zod: "^3" },
			peerDependenciesMeta: { bufferutil: { optional: true } },
		});
		install("app", { name: "zod" });
		useCwd("app");

		await expect(getDependencies()).resolves.toEqual({
			dependencies: ["@prosopo/app", "ws", "zod"],
			optionalPeerDependencies: ["fsevents", "bufferutil"],
		});
	});

	it("lists a required dependency that is not installed", async () => {
		writeManifest("app", {
			name: "@prosopo/app",
			dependencies: { missing: "1.0.0" },
		});
		useCwd("app");

		await expect(getDependencies()).resolves.toEqual({
			dependencies: ["@prosopo/app", "missing"],
			optionalPeerDependencies: [],
		});
	});

	it("stops at a cycle", async () => {
		writeManifest("app", { name: "@prosopo/app", dependencies: { a: "1" } });
		install("app", { name: "a", dependencies: { b: "1" } });
		install("app", { name: "b", dependencies: { a: "1" } });
		useCwd("app");

		const { dependencies } = await getDependencies();
		expect(dependencies.sort()).toEqual(["@prosopo/app", "a", "b"]);
	});

	it("starts from the named package when it is the one in cwd", async () => {
		writeManifest("packages/server", {
			name: "@prosopo/server",
			dependencies: { zod: "3.22.4" },
		});
		install("packages/server", { name: "zod" });
		useCwd("packages/server");

		await expect(getDependencies("server")).resolves.toMatchObject({
			dependencies: ["@prosopo/server", "zod"],
		});
	});

	it("finds a named package among the workspace members", async () => {
		fs.writeFileSync(
			path.join(root, "pnpm-workspace.yaml"),
			"packages:\n  - apps/*\n  - packages/*\n",
		);
		writeManifest("apps/app", { name: "@prosopo/app" });
		writeManifest("packages/server", {
			name: "@prosopo/server",
			dependencies: { zod: "3.22.4" },
		});
		install("packages/server", { name: "zod" });
		useCwd("apps/app");

		await expect(getDependencies("@prosopo/server")).resolves.toMatchObject({
			dependencies: ["@prosopo/server", "zod"],
		});
	});

	it("uses the outermost workspace when workspaces are nested", async () => {
		fs.writeFileSync(
			path.join(root, "pnpm-workspace.yaml"),
			"packages:\n  - sub/packages/*\n  - packages/*\n",
		);
		fs.mkdirSync(path.join(root, "sub"), { recursive: true });
		fs.writeFileSync(
			path.join(root, "sub/pnpm-workspace.yaml"),
			"packages:\n  - packages/*\n",
		);
		writeManifest("sub/packages/app", { name: "@prosopo/app" });
		writeManifest("packages/server", {
			name: "@prosopo/server",
			dependencies: { zod: "3.22.4" },
		});
		install("packages/server", { name: "zod" });
		useCwd("sub/packages/app");

		await expect(getDependencies("@prosopo/server")).resolves.toMatchObject({
			dependencies: ["@prosopo/server", "zod"],
		});
	});

	it("falls back to cwd for a name that is not a workspace package", async () => {
		fs.writeFileSync(
			path.join(root, "pnpm-workspace.yaml"),
			"packages:\n  - packages/*\n",
		);
		writeManifest("packages/app", {
			name: "@prosopo/app",
			dependencies: { zod: "3.22.4" },
		});
		install("packages/app", { name: "zod" });
		useCwd("packages/app");

		await expect(getDependencies("worker")).resolves.toMatchObject({
			dependencies: ["@prosopo/app", "zod"],
		});
	});
});

const { default: ViteBackendConfig } = await import(
	"./vite/vite.backend.config.js"
);

/** A server package whose installed tree the backend config walks. */
const serverFixture = (): void => {
	writeManifest("packages/server", {
		name: "@prosopo/server",
		dependencies: { mongodb: "6.3.0", zod: "3.22.4" },
	});
	install("packages/server", { name: "mongodb" });
	install("packages/server", { name: "zod" });
	useCwd("packages/server");
};

const externalsOf = (config: UserConfig): string[] => {
	const external = config.build?.rollupOptions?.external;
	if (!Array.isArray(external)) {
		throw new Error("expected an array of externals");
	}
	return external.map(String);
};

// Hand-rolled rather than `.flat(Infinity)`: a non-literal depth makes tsc
// expand FlatArray until it gives up with TS2589.
const flattenDeep = (value: unknown): unknown[] =>
	Array.isArray(value) ? value.flatMap(flattenDeep) : [value];

const pluginNamesOf = (plugins: UserConfig["plugins"]): string[] =>
	flattenDeep(plugins ?? []).map((plugin) => {
		if (plugin && typeof plugin === "object" && "name" in plugin) {
			return String(plugin.name);
		}
		return "";
	});

describe("ViteBackendConfig", () => {
	const build = (
		command?: string,
		mode?: string,
		outputDir?: string,
	): Promise<UserConfig> => {
		serverFixture();
		return ViteBackendConfig(
			"@prosopo/server",
			"1.2.3",
			"server",
			"/repo/packages/server",
			"src/index.ts",
			command,
			mode,
			outputDir,
		);
	};

	it("emits an esm bundle named after the bundle name", async () => {
		const config = await build();
		expect(config.build?.lib).toMatchObject({
			name: "server",
			formats: ["es"],
			fileName: "server.[name].bundle.js",
		});
		expect(config.build?.rollupOptions?.output).toMatchObject({
			entryFileNames: "server.[name].bundle.js",
		});
	});

	it("defaults the output to dist/bundle inside the package", async () => {
		const config = await build();
		expect(config.build?.outDir).toBe(
			path.resolve("/repo/packages/server", "dist/bundle"),
		);
	});

	it("honours an explicit output directory", async () => {
		const config = await build(undefined, undefined, "/tmp/out");
		expect(config.build?.outDir).toBe(path.resolve("/tmp/out"));
	});

	it("minifies only in production", async () => {
		await expect(build(undefined, "production")).resolves.toMatchObject({
			build: { minify: true },
		});
		await expect(build(undefined, "development")).resolves.toMatchObject({
			build: { minify: false },
		});
	});

	it("bakes the package version into the bundle", async () => {
		const config = await build();
		expect(config.define).toMatchObject({
			"process.env.PROSOPO_PACKAGE_VERSION": '"1.2.3"',
		});
	});

	it("stubs out the optional websocket native helpers", async () => {
		// bufferutil and utf-8-validate are optional native deps; without these
		// flags ws tries to require them and the bundle dies at boot.
		const config = await build();
		expect(config.define).toMatchObject({
			"process.env.WS_NO_BUFFER_UTIL": "true",
			"process.env.WS_NO_UTF_8_VALIDATE": "true",
		});
	});

	it("bundles punycode rather than externalising it", async () => {
		// The provider image ships no node_modules, so an external deep import
		// like "punycode/punycode.es6.js" is an immediate boot failure.
		const config = await build();
		expect(externalsOf(config)).not.toContain("punycode");
		expect(externalsOf(config)).toContain("node:punycode");
	});

	it("externalises the remaining node builtins", async () => {
		const list = externalsOf(await build());
		expect(list).toContain("fs");
		expect(list).toContain("node:fs");
	});

	it("resolves the entry against the package directory", async () => {
		const config = await build();
		expect(config.build?.lib).toMatchObject({
			entry: [path.resolve("/repo/packages/server", "src/index.ts")],
		});
	});

	it("resolves a list of entries", async () => {
		serverFixture();
		const config = await ViteBackendConfig(
			"@prosopo/server",
			"1.2.3",
			"server",
			"/repo/packages/server",
			["src/a.ts", "src/b.ts"],
		);
		expect(config.build?.lib).toMatchObject({
			entry: [
				path.resolve("/repo/packages/server", "src/a.ts"),
				path.resolve("/repo/packages/server", "src/b.ts"),
			],
		});
	});

	it("resolves a named entry map", async () => {
		serverFixture();
		const config = await ViteBackendConfig(
			"@prosopo/server",
			"1.2.3",
			"server",
			"/repo/packages/server",
			{ cli: "src/cli.ts" },
		);
		expect(config.build?.lib).toMatchObject({
			entry: { cli: path.resolve("/repo/packages/server", "src/cli.ts") },
		});
	});

	it("skips the close plugin while serving, so the dev server stays up", async () => {
		const serving = (await build("serve")).plugins ?? [];
		const building = (await build("build")).plugins ?? [];
		expect(pluginNamesOf(serving)).not.toContain("close-plugin");
		expect(pluginNamesOf(building)).toContain("close-plugin");
	});

	it("keeps module side effects when treeshaking", async () => {
		// Dropping them broke polyfills that register themselves on import.
		const config = await build();
		expect(config.build?.rollupOptions?.treeshake).toMatchObject({
			annotations: true,
			moduleSideEffects: true,
		});
	});
});
