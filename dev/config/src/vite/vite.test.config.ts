// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { defineConfig } from "vitest/config";
import VitePluginCloseAndCopy from "./vite-plugin-close-and-copy.js";
import VitePluginSourcemapExclude from "./vite-plugin-sourcemap-exclude.js";

export default function () {
	const testTypeEnv = process.env.TEST_TYPE || ''
	const testTypes = testTypeEnv.trim().split(",")
	// @(|) globs any tests which don't have their type specified, e.g. myTest.test.ts. These are included even when filtering by test type because we don't know what type of test they are. Really, they should have their type specified.
	// If we drop ^, there's a chance the tests with no type specified get ignored by accident, which we want to avoid. Ergo, include them by default.
	const testTypeGlob = `@(|${testTypes.map(t => t ? `.${t.trim()}` : '').join('|')})`
	console.log(`Filtering tests by type: ${testTypeGlob}`)
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
			include: [`src/**/*${testTypeGlob}.@(test|spec).@(mts|cts|mjs|cjs|js|ts|tsx|jsx)`],
			watch: false,
			watchExclude: ["**/node_modules/**", "**/dist/**"],
			logHeapUsage: true,
			coverage: {
				enabled: true,
				include: ["packages/*/src/**"],
			},
			typecheck: {
				enabled: true,
			},
			pool: "forks", // forks is slower than 'threads' but more compatible with low-level libs (e.g. bcrypt)
			testTimeout: 10000,
		},
		plugins: [
			VitePluginSourcemapExclude({ excludeNodeModules: true }),
			VitePluginCloseAndCopy(),
		],
	});
}
