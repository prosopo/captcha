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
import { defineConfig } from "vitest/config";

// This package *is* the shared test config, so it cannot consume its own
// `ViteTestConfig` export without a bootstrap cycle. The settings below mirror
// it: same include glob, coverage on, typecheck on, forks pool.
export default defineConfig({
	test: {
		reporters: [["default", { summary: false }]],
		include: ["src/**/*.@(test|spec).@(mts|cts|mjs|cjs|js|ts|tsx|jsx)"],
		watch: false,
		exclude: ["**/node_modules/**", "**/dist/**"],
		coverage: {
			enabled: true,
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.@(test|spec).ts", "src/**/*.test-d.ts"],
		},
		typecheck: {
			enabled: true,
		},
		pool: "forks",
		isolate: true,
		testTimeout: 10000,
	},
});
