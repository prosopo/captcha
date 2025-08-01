// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import VitePluginCloseAndCopy from "./vite-plugin-close-and-copy.js";
import VitePluginSourcemapExclude from "./vite-plugin-sourcemap-exclude.js";

export default function (tsConfigPath?: string) {
	const testTypeEnv = process.env.TEST_TYPE || undefined;
	console.log(`TEST_TYPE environment variable: ${testTypeEnv}`);
	const testTypes = testTypeEnv ? testTypeEnv.trim().split(",") : [];
	// @(|) globs any tests which don't have their type specified, e.g. myTest.test.ts. These are included even when filtering by test type because we don't know what type of test they are. Really, they should have their type specified.
	// If we drop ^, there's a chance the tests with no type specified get ignored by accident, which we want to avoid. Ergo, include them by default.
	const testTypeGlob =
		testTypes.length > 0
			? `@(${testTypes.map((t) => `.${t}`).join("|")})`
			: "@(|)";
	console.log(`Filtering tests by type: ${testTypeGlob}`);

	// Determine coverage include paths based on current working directory
	const cwd = process.cwd();
	const isRunningFromPackage =
		cwd.includes("/packages/") && cwd.includes("/src") === false;

	// If running from a package directory, include local src files
	// If running from repo root, include all package src files
	const coverageInclude = isRunningFromPackage
		? ["src/**/*.ts", "src/**/*.js", "src/**/*.tsx", "src/**/*.jsx"]
		: ["packages/*/src/**", "captcha/packages/*/src/**"];

	const coverageExclude = isRunningFromPackage
		? [
				"src/tests/**/*",
				"src/**/*.d.ts",
				"src/**/*.test.ts",
				"src/**/*.spec.ts",
				"src/**/*.test.tsx",
				"src/**/*.spec.tsx",
			]
		: [
				"**/tests/**/*",
				"**/*.d.ts",
				"**/*.test.*",
				"**/*.spec.*",
				"**/node_modules/**",
				"**/dist/**",
			];
	const include = `src/**/*${testTypeGlob}.@(test|spec).@(mts|cts|mjs|cjs|js|ts|tsx|jsx)`;
	const plugins = [
		VitePluginSourcemapExclude({ excludeNodeModules: true }),
		VitePluginCloseAndCopy(),
	];

	if (tsConfigPath) {
		plugins.push(tsconfigPaths({ projects: [path.resolve(tsConfigPath)] }));
	}

	return defineConfig({
		build: {
			minify: false,
			sourcemap: false,
			rollupOptions: {
				maxParallelFileOps: 1,
				cache: false,
				output: {
					sourcemap: false,
				},
			},
		},
		test: {
			//root: getRootDir(),
			reporters: ["basic"],
			include: [include],
			watch: false,
			exclude: ["**/node_modules/**", "**/dist/**"],
			logHeapUsage: true,
			coverage: {
				enabled: true,
				include: coverageInclude,
				exclude: coverageExclude,
			},
			typecheck: {
				enabled: true,
			},
			pool: "forks", // forks is slower than 'threads' but more compatible with low-level libs (e.g. bcrypt)
			poolOptions: {
				forks: {
					isolate: true,
				},
			},
			testTimeout: 10000,
		},
		plugins: plugins,
	});
}
