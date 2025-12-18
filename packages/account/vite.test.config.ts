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

import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

process.env.NODE_ENV = "test";
// if .env.test exists at this level, use it, otherwise use the one at the root
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
let envPath: string | undefined;
if (fs.existsSync(envFile)) {
	envPath = path.resolve(envFile);
} else if (fs.existsSync(`../../${envFile}`)) {
	envPath = path.resolve(`../../${envFile}`);
}

if (envPath) {
	dotenv.config({ path: envPath });
}

export default defineConfig({
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
		reporters: [["default", { summary: false }]],
		include: ["src/**/*.@(test|spec).@(mts|cts|mjs|cjs|js|ts|tsx|jsx)"],
		watch: false,
		exclude: ["**/node_modules/**", "**/dist/**"],
		logHeapUsage: true,
		coverage: {
			enabled: true,
			include: ["src/**/*.ts", "src/**/*.js", "src/**/*.tsx", "src/**/*.jsx"],
			exclude: [
				"src/tests/**/*",
				"src/**/*.d.ts",
				"src/**/*.test.ts",
				"src/**/*.spec.ts",
				"src/**/*.test.tsx",
				"src/**/*.spec.tsx",
			],
		},
		typecheck: {
			enabled: true,
		},
		pool: "forks",
		poolOptions: {
			forks: {
				isolate: true,
			},
		},
		testTimeout: 10000,
	},
});

