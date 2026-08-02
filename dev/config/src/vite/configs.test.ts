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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nodejsPolarsDirnamePlugin } from "./NodejsPolarsDirnamePlugin.js";
import ViteTestConfig from "./vite.test.config.js";
import ViteThreadsTestConfig from "./vite.threads.test.config.js";

const NATIVE_POLARS = "/repo/node_modules/nodejs-polars/bin/native-polars.js";

let root: string;
let cwd: string;
let originalTestType: string | undefined;

beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "prosopo-vite-config-test-"));
	cwd = process.cwd();
	originalTestType = process.env.TEST_TYPE;
	process.env.TEST_TYPE = undefined;
	// biome-ignore lint/performance/noDelete: the config reads presence, not value
	delete process.env.TEST_TYPE;
});

afterEach(() => {
	process.chdir(cwd);
	if (originalTestType === undefined) {
		// biome-ignore lint/performance/noDelete: restore absence, not ""
		delete process.env.TEST_TYPE;
	} else {
		process.env.TEST_TYPE = originalTestType;
	}
	fs.rmSync(root, { recursive: true, force: true });
});

/** Make `root` look like a package (package.json + src) and chdir into it. */
const asPackage = (): void => {
	fs.writeFileSync(path.join(root, "package.json"), "{}");
	fs.mkdirSync(path.join(root, "src"));
	process.chdir(root);
};

/** Make `root` look like a repo root (no src dir) and chdir into it. */
const asRepoRoot = (): void => {
	fs.writeFileSync(path.join(root, "package.json"), "{}");
	process.chdir(root);
};

describe("ViteTestConfig", () => {
	it("enables coverage and typechecking by default", () => {
		asPackage();
		const config = ViteTestConfig();
		expect(config.test?.coverage?.enabled).toBe(true);
		expect(config.test?.typecheck?.enabled).toBe(true);
		expect(config.test?.watch).toBe(false);
	});

	it("runs in forks, isolated, because low-level crypto needs it", () => {
		asPackage();
		const config = ViteTestConfig();
		expect(config.test?.pool).toBe("forks");
		expect(config.test?.isolate).toBe(true);
	});

	it("includes tests with no declared type when no filter is set", () => {
		asPackage();
		expect(config_include(ViteTestConfig())).toBe(
			"src/**/*@(|).@(test|spec).@(mts|cts|mjs|cjs|js|ts|tsx|jsx)",
		);
	});

	it("filters on a single declared test type", () => {
		asPackage();
		process.env.TEST_TYPE = "unit";
		expect(config_include(ViteTestConfig())).toContain("@(.unit)");
	});

	it("filters on several test types", () => {
		asPackage();
		process.env.TEST_TYPE = "unit,integration";
		expect(config_include(ViteTestConfig())).toContain("@(.unit|.integration)");
	});

	it("trims whitespace around the test type list", () => {
		asPackage();
		process.env.TEST_TYPE = "  unit  ";
		expect(config_include(ViteTestConfig())).toContain("@(.unit)");
	});

	it("ignores an empty test type, keeping the default glob", () => {
		asPackage();
		process.env.TEST_TYPE = "";
		expect(config_include(ViteTestConfig())).toContain("@(|)");
	});

	it("scopes coverage to the local src when run from a package", () => {
		// Workspaces outside `packages/` were reporting 0/0 coverage because
		// the repo-root globs only match `packages/*/src/**`.
		asPackage();
		const config = ViteTestConfig();
		expect(config.test?.coverage?.include).toContain("src/**/*.ts");
		expect(config.test?.coverage?.exclude).toContain("src/**/*.test.ts");
	});

	it("falls back to repo-wide globs when there is no src directory", () => {
		asRepoRoot();
		const config = ViteTestConfig();
		expect(config.test?.coverage?.include).toEqual([
			"packages/*/src/**",
			"captcha/packages/*/src/**",
		]);
		expect(config.test?.coverage?.exclude).toContain("**/node_modules/**");
	});

	it("adds the tsconfig-paths plugin only when given a tsconfig", () => {
		asPackage();
		const withoutPaths = ViteTestConfig().plugins ?? [];
		const tsConfigPath = path.join(root, "tsconfig.json");
		fs.writeFileSync(tsConfigPath, "{}");
		const withPaths = ViteTestConfig(tsConfigPath).plugins ?? [];
		expect(withPaths.length).toBe(withoutPaths.length + 1);
	});

	it("always excludes node_modules and dist from the test run", () => {
		asPackage();
		expect(ViteTestConfig().test?.exclude).toEqual([
			"**/node_modules/**",
			"**/dist/**",
		]);
	});

	it("disables sourcemaps and minification, which only cost time here", () => {
		asPackage();
		const config = ViteTestConfig();
		expect(config.build?.minify).toBe(false);
		expect(config.build?.sourcemap).toBe(false);
	});
});

describe("ViteThreadsTestConfig", () => {
	it("differs from the forks config only in its pool", () => {
		asPackage();
		expect(ViteThreadsTestConfig().test?.pool).toBe("threads");
		expect(ViteTestConfig().test?.pool).toBe("forks");
	});

	it("keeps coverage and typechecking on", () => {
		asPackage();
		const config = ViteThreadsTestConfig();
		expect(config.test?.coverage?.enabled).toBe(true);
		expect(config.test?.typecheck?.enabled).toBe(true);
	});
});

describe("nodejsPolarsDirnamePlugin", () => {
	const plugin = nodejsPolarsDirnamePlugin();

	it("claims only the native polars entry point", () => {
		expect(plugin.resolveId(NATIVE_POLARS, undefined, {})).toBe(NATIVE_POLARS);
		expect(plugin.resolveId("zod", undefined, {})).toBeNull();
		expect(
			plugin.resolveId("nodejs-polars/bin/other.js", undefined, {}),
		).toBeNull();
	});

	it("rewrites __dirname to a path derived from import.meta.url", () => {
		// The bundled output is a single ESM file, where `__dirname` does not
		// exist; polars uses it to locate its native binary.
		const code = "const a = __dirname; const b = __dirname;";
		const transformed = plugin.transform(code, NATIVE_POLARS);
		expect(transformed).not.toContain("__dirname");
		expect(transformed).toContain("import.meta.url");
		expect(transformed.match(/import\.meta\.url/g)).toHaveLength(2);
	});

	it("leaves every other module untouched", () => {
		const code = "const a = __dirname;";
		expect(plugin.transform(code, "/repo/src/index.ts")).toBe(code);
	});

	it("is named", () => {
		expect(plugin.name).toBe("nodejs-polars-dirname-plugin");
	});
});

/** The include glob is stored as a single-element array. */
const config_include = (config: ReturnType<typeof ViteTestConfig>): string => {
	const include = config.test?.include;
	if (!include || !include[0]) {
		throw new Error("config has no test include glob");
	}
	return include[0];
};

describe("coverage excludes", () => {
	it("drops type-test files, which are compiled but never executed", () => {
		// `src/**/*.d.ts` does not match `*.test-d.ts`, so without this every
		// package reported its type tests as 0%-covered source.
		asPackage();
		const exclude = ViteTestConfig().test?.coverage?.exclude ?? [];
		expect(exclude).toContain("src/**/*.test-d.ts");
		expect(exclude).toContain("src/**/*.test-d.tsx");
	});
});
