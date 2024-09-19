
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

import * as path from "node:path";
import { ViteFrontendConfig } from "@prosopo/config";
import { loadEnv } from "@prosopo/dotenv";
import { defineConfig } from "vite";

// load env using our util because vite loadEnv is not working for .env.development
loadEnv();

// Vite doesn't find the tsconfig for some reason
process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

// Package specific config
const bundleName = "prosopo-client-example";
const packageName = "@prosopo/client-example";
const entry = path.resolve("./index.html");
const workspaceRoot = path.resolve("../../..");


// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
	const frontendConfig = await ViteFrontendConfig(
		packageName,
		bundleName,
		path.resolve(),
		entry,
		command,
		mode,
		undefined,
		undefined,
		workspaceRoot,
	);

	return {
		...frontendConfig,
		watch: false,
		mode: "development",
		bundle: true,
		define: {
			...frontendConfig.define,
			"process.env.PROSOPO_WEB2": JSON.stringify(
				process.env.PROSOPO_WEB2 || "true",
			),
			"process.env.PROSOPO_LOG_LEVEL": JSON.stringify(
				process.env.PROSOPO_LOG_LEVEL || "Info",
			),
		},
		build: {
			outDir: path.resolve("./dist"),
			modulePreload: { polyfill: true },
			lib: {
				entry,
				name: bundleName,
				formats: ["es"],
			},
			rollupOptions: {
				...frontendConfig.build?.rollupOptions,
				output: {
					dir: path.resolve("./dist"),
				},
			}
		},
		server: {
			port: process.env.PROSOPO_PORT ? Number(process.env.PROSOPO_PORT) : 9230,
		},
	};
});
