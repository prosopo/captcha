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
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { ViteTestConfig } from "@prosopo/config";

process.env.NODE_ENV = "test";

const baseConfig = ViteTestConfig(path.resolve("./tsconfig.json"));

export default defineConfig({
	...baseConfig,
	resolve: {
		...baseConfig.resolve,
		conditions: ["browser", "import", "module", "default"],
	},
	build: {
		...baseConfig.build,
		ssr: false,
	},
	plugins: [
		...(baseConfig.plugins || []),
		svelte({
			hot: !process.env.VITEST,
			compilerOptions: {
				dev: process.env.NODE_ENV !== "production",
			},
		}),
	],
	test: {
		...baseConfig.test,
		environment: "jsdom",
	},
});

