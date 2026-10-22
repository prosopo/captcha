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
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import { testFileGlobs } from "./testFileGlobs.js";
import VitePluginCloseAndCopy from "./vite-plugin-close-and-copy.js";
import VitePluginSourcemapExclude from "./vite-plugin-sourcemap-exclude.js";

export default function (tsConfigPath?: string) {
	const testFiles = testFileGlobs(process.env.TEST_TYPE);
	console.log(
		`TEST_TYPE=${process.env.TEST_TYPE ?? ""} include=${testFiles.include.join(",")} exclude=${testFiles.exclude.join(",")}`,
	);

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
				output: {
					sourcemap: false,
				},
			},
		},
		test: {
			//root: getRootDir(),
			// vitest 4 removed the "basic" reporter; the default reporter with
			// summary disabled reproduces its terse output.
			reporters: [["default", { summary: false }]],
			include: testFiles.include,
			watch: false,
			exclude: ["**/node_modules/**", "**/dist/**", ...testFiles.exclude],
			logHeapUsage: true,
			coverage: {
				enabled: true,
				include: coverageInclude,
				exclude: coverageExclude,
			},
			typecheck: {
				enabled: true,
			},
			pool: "threads", // use threads for tests that should be run sequentially
			// vitest 4 removed poolOptions; sequential execution is now expressed via
			// fileParallelism instead of min/maxThreads.
			fileParallelism: false,
			testTimeout: 10000,
		},
		plugins: plugins,
	});
}
