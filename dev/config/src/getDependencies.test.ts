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

import type { ExecException } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { UserConfig } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** What `npm ls` handed back for a given command. */
interface ExecResult {
	stdout: string;
	stderr: string;
}

type ExecCallback = (
	error: ExecException | null,
	stdout: string,
	stderr: string,
) => void;

/** Commands seen, in order, so the tests can assert on what was run. */
let commands: string[] = [];
/** Queue of responses, consumed one per `exec` call. */
let responses: (ExecResult | Error)[] = [];

const fakeExec = (command: string, callback: ExecCallback): void => {
	commands.push(command);
	const next = responses.shift();
	if (next === undefined) {
		throw new Error(`unexpected exec: ${command}`);
	}
	if (next instanceof Error) {
		callback(next, "", "");
		return;
	}
	callback(null, next.stdout, next.stderr);
};

// `util.promisify` honours this symbol, which is how the real
// `child_process.exec` resolves to `{ stdout, stderr }` rather than to stdout
// alone. The mock has to provide it or the promisified call shape differs from
// production.
Object.defineProperty(fakeExec, promisify.custom, {
	value: (command: string): Promise<ExecResult> =>
		new Promise((resolve, reject) => {
			fakeExec(command, (error, stdout, stderr) => {
				if (error) {
					reject(error);
				} else {
					resolve({ stdout, stderr });
				}
			});
		}),
});

vi.mock("node:child_process", () => ({ default: { exec: fakeExec } }));

const { getDependencies } = await import("./dependencies.js");

beforeEach(() => {
	commands = [];
	responses = [];
});

afterEach(() => {
	expect(responses).toEqual([]);
});

const ok = (stdout: string, stderr = ""): ExecResult => ({ stdout, stderr });

/** `util.promisify` reads stdout/stderr off the error for a failing exec. */
const failing = (stdout: string, stderr = ""): Error => {
	const error: ExecException & { stdout?: string; stderr?: string } =
		Object.assign(new Error("npm ls exited 1"), { stdout, stderr });
	return error;
};

const TREE = [
	"@prosopo/root@1.0.0 /repo",
	"├─┬ mongodb@6.3.0",
	"│ └── bson@6.2.0",
	"└── zod@3.22.4",
].join("\n");

describe("getDependencies", () => {
	it("parses every package name out of the npm ls tree", async () => {
		responses = [ok(TREE)];
		const { dependencies } = await getDependencies();
		expect(dependencies).toEqual(["mongodb", "bson", "zod"]);
	});

	it("does not treat the root package line as a dependency", async () => {
		// The root line has no leading whitespace, which is what the regex keys
		// off — a package must never externalise itself.
		responses = [ok(TREE)];
		const { dependencies } = await getDependencies();
		expect(dependencies).not.toContain("@prosopo/root");
	});

	it("collects unmet optional peers separately", async () => {
		responses = [
			ok(
				[
					"│ ├── UNMET OPTIONAL DEPENDENCY bufferutil@^4.0.1",
					"│ ├── UNMET OPTIONAL DEPENDENCY utf-8-validate@^5.0.2",
					"└── zod@3.22.4",
				].join("\n"),
			),
		];
		const { dependencies, optionalPeerDependencies } = await getDependencies();
		expect(optionalPeerDependencies).toEqual(["bufferutil", "utf-8-validate"]);
		expect(dependencies).toEqual(["zod"]);
	});

	it("deduplicates packages that appear all over the tree", async () => {
		responses = [ok(["├── zod@3.22.4", "│ └── zod@3.22.4"].join("\n"))];
		await expect(getDependencies()).resolves.toEqual({
			dependencies: ["zod"],
			optionalPeerDependencies: [],
		});
	});

	it("returns empty lists for an empty tree", async () => {
		responses = [ok("")];
		await expect(getDependencies()).resolves.toEqual({
			dependencies: [],
			optionalPeerDependencies: [],
		});
	});

	it("omits dev dependencies when asked for a production tree", async () => {
		responses = [ok(TREE)];
		await getDependencies(undefined, true);
		expect(commands[0]).toContain("--omit=dev");
	});

	it("keeps dev dependencies otherwise", async () => {
		responses = [ok(TREE)];
		await getDependencies(undefined, false);
		expect(commands[0]).not.toContain("--omit=dev");
	});

	it("resolves the package directory first and runs npm ls inside it", async () => {
		responses = [ok("/repo/packages/server\n"), ok(TREE)];
		await getDependencies("@prosopo/server");
		expect(commands[0]).toBe("npm list @prosopo/server -ap");
		expect(commands[1]).toContain("cd /repo/packages/server &&");
	});

	it("prefixes a bare package name with the scope", async () => {
		responses = [ok("/repo/packages/server\n"), ok(TREE)];
		await getDependencies("server");
		expect(commands[0]).toBe("npm list @prosopo/server -ap");
	});

	it("leaves an already-scoped name alone", async () => {
		responses = [ok("/repo/packages/server\n"), ok(TREE)];
		await getDependencies("@prosopo/server");
		expect(commands[0]).toBe("npm list @prosopo/server -ap");
	});

	it("falls back to the working directory when npm prints no path", async () => {
		responses = [ok("  \n"), ok(TREE)];
		await getDependencies("@prosopo/server");
		expect(commands[1]).toContain(`cd ${process.cwd()} &&`);
	});

	it("rejects when the package cannot be located", async () => {
		responses = [ok("", "npm ERR! code E404")];
		await expect(getDependencies("@prosopo/absent")).rejects.toThrow(
			"CONFIG.INVALID_PACKAGE_DIR",
		);
	});

	it("tolerates npm warnings on stderr that are not errors", async () => {
		responses = [
			ok("/repo/packages/server\n", "npm warn deprecated"),
			ok(TREE),
		];
		await expect(getDependencies("@prosopo/server")).resolves.toMatchObject({
			dependencies: ["mongodb", "bson", "zod"],
		});
	});

	it("still parses the tree when npm ls exits non-zero", async () => {
		// `npm ls` exits 1 for any unmet or extraneous dependency but still
		// prints the whole tree, so the build must not be blocked by it.
		responses = [failing(TREE)];
		const { dependencies } = await getDependencies();
		expect(dependencies).toEqual(["mongodb", "bson", "zod"]);
	});

	it("rethrows when a failing npm ls produced no output at all", async () => {
		const error: ExecException = new Error("npm not found");
		responses = [error];
		await expect(getDependencies()).rejects.toThrow("npm not found");
	});

	it("reads stderr as well as stdout, since npm splits the tree across both", async () => {
		responses = [ok("├── zod@3.22.4", "\n└── axios@1.6.0")];
		const { dependencies } = await getDependencies();
		expect(dependencies).toEqual(["zod", "axios"]);
	});
});

const { default: ViteBackendConfig } = await import(
	"./vite/vite.backend.config.js"
);

/** Every backend config starts with the same two npm ls calls. */
const npmLsResponses = (): (ExecResult | Error)[] => [
	ok("/repo/packages/server\n"),
	ok(TREE),
];

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
		responses = npmLsResponses();
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
		responses = npmLsResponses();
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
		responses = npmLsResponses();
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
