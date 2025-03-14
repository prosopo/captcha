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
import * as path from "node:path";
import { ViteFrontendConfig } from "@prosopo/config";
import { loadEnv } from "@prosopo/dotenv";
import { VitePluginWatchWorkspace } from "@prosopo/vite-plugin-watch-workspace";
import fg from "fast-glob";
import { defineConfig } from "vite";

// load env using our util because vite loadEnv is not working for .env.development
loadEnv();

// Vite doesn't find the tsconfig for some reason
process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

// Package specific config
const bundleName = "prosopo-client-example";
const packageName = "@prosopo/client-example";
const entry = path.resolve("./index.html");
const workspaceRoot = path.resolve("../..");

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
	const copyDir = {
		srcDir: `${workspaceRoot}/packages/locale/src/locales`,
		destDir: `${workspaceRoot}/demos/client-example/dist/locales`,
	};

	const localFiles = await fg.glob(
		`${workspaceRoot}/packages/locale/src/locales/**/*.json`,
	);

	console.log(localFiles);
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

	const define = {
		...frontendConfig.define,
		"process.env.PROSOPO_WEB2": JSON.stringify(
			process.env.PROSOPO_WEB2 || "true",
		),
		"process.env.PROSOPO_LOG_LEVEL": JSON.stringify(
			process.env.PROSOPO_LOG_LEVEL || "Info",
		),
		"process.env.PROSOPO_DOCS_URL": JSON.stringify(
			process.env.PROSOPO_DOCS_URL,
		),
		"process.env.PROSOPO_SITE_KEY_IMAGE": JSON.stringify(
			process.env.PROSOPO_SITE_KEY_IMAGE,
		),
		"process.env.PROSOPO_SITE_KEY_POW": JSON.stringify(
			process.env.PROSOPO_SITE_KEY_POW,
		),
		"process.env.PROSOPO_SITE_KEY_FRICTIONLESS": JSON.stringify(
			process.env.PROSOPO_SITE_KEY_FRICTIONLESS,
		),
	};
	console.log("defined vars", define);
	return {
		...frontendConfig,
		watch: false,
		mode: "development",
		bundle: true,
		define,
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
			},
		},
		plugins: [
			...(frontendConfig.plugins || []),
			// Watches external files (workspace packages) and rebuilds them when they change
			await VitePluginWatchWorkspace({
				workspaceRoot: path.resolve("../.."),
				currentPackage: `${path.resolve(".")}/**/*`,
				format: "esm",
				ignorePaths: [
					`${path.resolve("../..")}/demos/*`,
					`${path.resolve("../..")}/dev/*`,
					"**/dist/**/*",
				],
			}),
			{
				name: "copy-dir",
				async writeBundle() {
					if (copyDir) {
						const containingFolder = path.dirname(copyDir.destDir);
						if (!fs.existsSync(containingFolder)) {
							fs.mkdirSync(containingFolder, { recursive: true });
						}
						fs.cpSync(copyDir.srcDir, copyDir.destDir, {
							recursive: true,
						});
					}
				},
			},
		],
		server: {
			port: process.env.PROSOPO_PORT ? Number(process.env.PROSOPO_PORT) : 9230,
		},
	};
});
