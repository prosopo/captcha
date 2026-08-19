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
import { createRequire } from "node:module";
import * as path from "node:path";
import {
	ViteBackendConfig,
	nodejsPolarsNativeFilePlugin,
} from "@prosopo/config";
import { loadEnv } from "@prosopo/dotenv";
import { defineConfig } from "vite";
import { version } from "./package.json";

// load env using our util because vite loadEnv is not working for .env.development
loadEnv();

// Package specific config
const packageName = "@prosopo/cli";
const bundleName = "provider";
const dir = path.resolve();
const entry = "./src/cli.ts";
const packageVersion = version;

process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

// Rust napi modules under packages/native-* each ship a single .node binary
// for the linux-x64 target (the only platform the provider runs on). Resolve
// their absolute paths so nodejsPolarsNativeFilePlugin can copy them into
// dist/bundle at bundle time.
const nativeRequire = createRequire(import.meta.url);
// napi-rs writes every package's binary as `index.<triple>.node`, so we
// have to rename on copy or the second overwrites the first in dist/bundle.
const nativeBinaryPaths = [
	{
		src: nativeRequire.resolve("@prosopo/native-ja4/index.linux-x64-gnu.node"),
		dest: "prosopo-native-ja4.node",
	},
	{
		src: nativeRequire.resolve(
			"@prosopo/native-merkle/index.linux-x64-gnu.node",
		),
		dest: "prosopo-native-merkle.node",
	},
];
const bundleOutDir = path.resolve(dir, "dist/bundle");

// Merge with generic backend config
export default defineConfig(async ({ command, mode }) => {
	const backendConfig = await ViteBackendConfig(
		packageName,
		packageVersion,
		bundleName,
		dir,
		entry,
		command,
		mode,
	);
	backendConfig.plugins = [
		...(backendConfig.plugins ?? []),
		nodejsPolarsNativeFilePlugin(nativeBinaryPaths, bundleOutDir),
	];
	return defineConfig({
		ssr: {
			external: [
				...(backendConfig.ssr?.external
					? (backendConfig.ssr.external as string[])
					: []),
				"kerberos",
			] as string[],
		},
		define: {
			...backendConfig.define,
			...(process.env.PROSOPO_MONGO_EVENTS_URI && {
				"process.env.PROSOPO_MONGO_EVENTS_URI": JSON.stringify(
					process.env.PROSOPO_MONGO_EVENTS_URI,
				),
			}),
			...(process.env._DEV_ONLY_WATCH_EVENTS && {
				"process.env._DEV_ONLY_WATCH_EVENTS": JSON.stringify(
					process.env._DEV_ONLY_WATCH_EVENTS,
				),
			}),
			...(process.env.PROSOPO_ENTROPY && {
				"process.env.PROSOPO_ENTROPY": JSON.stringify(
					process.env.PROSOPO_ENTROPY,
				),
			}),
			...(process.env.PROSOPO_IPAPI_URL && {
				"process.env.PROSOPO_IPAPI_URL": JSON.stringify(
					process.env.PROSOPO_IPAPI_URL,
				),
			}),
			...(process.env.PROSOPO_IPAPI_KEY && {
				"process.env.PROSOPO_IPAPI_KEY": JSON.stringify(
					process.env.PROSOPO_IPAPI_KEY,
				),
			}),
		},
		...backendConfig,
	});
});
