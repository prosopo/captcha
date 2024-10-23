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

import * as fs from "node:fs";
import * as path from "node:path";
import { ViteFrontendConfig } from "@prosopo/config";
import { loadEnv } from "@prosopo/dotenv";
import fg from "fast-glob";
import { defineConfig } from "vite";

// load env using our util because vite loadEnv is not working for .env.development
loadEnv();

// Vite doesn't find the tsconfig for some reason
process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

// Package specific config
const copyTo = ["../../demos/client-bundle-example/src/assets"];
const bundleName = "procaptcha";
const packageName = "@prosopo/procaptcha-bundle";
const entry = "./src/index.tsx";
const copyOptions = copyTo
	? {
			srcDir: "./dist/bundle",
			destDir: copyTo,
		}
	: undefined;
const tsConfigPaths = [path.resolve("./tsconfig.json")];
const packagesDir = path.resolve("..");
const workspaceRoot = path.resolve("../../");
// Get all folders in packagesDir
const packages = fs
	.readdirSync(packagesDir)
	.filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());
for (const packageName of packages) {
	// Add the tsconfig for each package to tsConfigPaths
	tsConfigPaths.push(path.resolve(`../${packageName}/tsconfig.json`));
}
console.log(`${workspaceRoot}/packages/locale/src/locales/.*.json`);

const copyOptionsLocale = {
	srcDir: `${workspaceRoot}/packages/locale/src/locales`,
	destDir: [
		`${workspaceRoot}/packages/procaptcha-bundle/dist/bundle`,
		...copyTo,
	],
};

const localFiles = await fg.glob(
	`${workspaceRoot}/packages/locale/src/locales/*.json`,
);

console.log(localFiles);

// Merge with generic frontend config
export default defineConfig(async ({ command, mode }) => {
	const frontendConfig = await ViteFrontendConfig(
		packageName,
		bundleName,
		path.resolve(),
		entry,
		command,
		mode,
		copyOptions,
		tsConfigPaths,
		workspaceRoot,
	);
	// @ts-ignore
	// biome-ignore lint/correctness/noUnsafeOptionalChaining: output is optional
	const { output } = frontendConfig.build?.rollupOptions;
	return {
		...frontendConfig,
		build: {
			...frontendConfig.build,
			rollupOptions: {
				...frontendConfig.build?.rollupOptions,
				external: {
					// @ts-ignore
					// biome-ignore lint/correctness/noUnsafeOptionalChaining: external is optional
					...frontendConfig.build?.rollupOptions.external,
					...localFiles,
				},
				output: {
					...output,
					// manualChunks(id) {
					// 	if (id.includes('json'))
					// 		return id.split('/').reverse()[0].split('.')[0];
					// },
				},
			},
		},
		resolve: {
			...frontendConfig.resolve,
			alias: [
				{
					find: /@prosopo\/locale\/locales\/.*\.json"/,
					replacement: "./locale/",
				},
			],
		},
		//assetsInclude: [new RegExp(`${workspaceRoot}/packages/locale/src/locales/.*.json`)],
		plugins: [
			{
				name: "copy-locale-files",
				async writeBundle() {
					if (copyOptionsLocale) {
						for (const destDir of copyOptionsLocale.destDir) {
							for (const file of fs.readdirSync(copyOptionsLocale.srcDir)) {
								fs.mkdirSync(`${destDir}/locale/`, { recursive: true });
								fs.copyFileSync(
									path.join(copyOptionsLocale.srcDir, file),
									path.join(`${destDir}/locale/`, file),
								);
							}
						}
					}
				},
			},
			...frontendConfig.plugins,
		],
	};
});
