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

import * as fs from "node:fs";
import * as path from "node:path";
import { getLoggerDefault } from "@prosopo/common";
import {
	ViteFrontendConfig,
	VitePluginRemoveUnusedTranslations,
} from "@prosopo/config";
import { loadEnv } from "@prosopo/dotenv";
import { at, flatten } from "@prosopo/util";
import fg from "fast-glob";
import { defineConfig } from "vite";

// load env using our util because vite loadEnv is not working for .env.development
loadEnv();

const logger = getLoggerDefault();

// Vite doesn't find the tsconfig for some reason
process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

// Package specific config
const copyTo = ["../../demos/client-bundle-example/src/assets"];
const bundleName = "procaptcha";
const packageName = "@prosopo/procaptcha-bundle";
const entry = "./src/index.ts";
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

const copyDir = {
	srcDir: `${workspaceRoot}/packages/locale/src/locales`,
	destDir: `${workspaceRoot}/packages/procaptcha-bundle/dist/bundle/locales`,
};

const localeFiles = await fg.glob(
	`${workspaceRoot}/packages/locale/src/locales/**/*.json`,
);

const translationKeys = Object.keys(
	flatten(JSON.parse(fs.readFileSync(at(localeFiles, 0), "utf-8"))),
);

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

	return {
		...frontendConfig,
		plugins: [
			{
				name: "copy-dir",
				async writeBundle() {
					if (copyDir) {
						const containingFolder = path.dirname(copyDir.destDir);
						if (!fs.existsSync(containingFolder)) {
							fs.mkdirSync(containingFolder, { recursive: true });
						}
						logger.info(`Copying ${copyDir.srcDir} to ${copyDir.destDir}`);
						fs.cpSync(copyDir.srcDir, copyDir.destDir, {
							recursive: true,
						});
					}
				},
			},
			VitePluginRemoveUnusedTranslations(
				translationKeys,
				`${copyDir.destDir}/**/*.json`,
			),

			...(frontendConfig.plugins ? frontendConfig.plugins : []),
		],
	};
});
