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

import * as fs from "node:fs";
import * as path from "node:path";
import {
	ViteFrontendConfig,
	VitePluginRemoveUnusedTranslations,
} from "@prosopo/config";
import { loadEnv } from "@prosopo/dotenv";
import { at, flatten } from "@prosopo/util";
import fg from "fast-glob";
import { defineConfig } from "vite";

// IIFE / classic-script build of the procaptcha bundle.
// Used as a `<script nomodule>` fallback so crawlers and runtimes that do not
// execute `type="module"` scripts (notably Ahrefs' renderer) still mount the
// widget and expose the outbound link in the rendered DOM.

loadEnv();
process.env.TS_NODE_PROJECT = path.resolve("./tsconfig.json");

const bundleName = "procaptcha";
const packageName = "@prosopo/procaptcha-bundle";
const entry = "./src/index.ts";
const tsConfigPaths = [path.resolve("./tsconfig.json")];
const packagesDir = path.resolve("..");
const workspaceRoot = path.resolve("../../");
const packages = fs
	.readdirSync(packagesDir)
	.filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory());
for (const p of packages) {
	tsConfigPaths.push(path.resolve(`../${p}/tsconfig.json`));
}

const copyDir = {
	srcDir: `${workspaceRoot}/packages/locale/src/locales`,
	destDir: `${workspaceRoot}/packages/procaptcha-bundle/dist/bundle/iife/locales`,
};

const localeFiles = await fg.glob(
	`${workspaceRoot}/packages/locale/src/locales/**/*.json`,
);

const translationKeys = Object.keys(
	flatten(JSON.parse(fs.readFileSync(at(localeFiles, 0), "utf-8"))),
);

export default defineConfig(async ({ command, mode }) => {
	const frontendConfig = await ViteFrontendConfig(
		packageName,
		bundleName,
		path.resolve(),
		entry,
		command,
		mode,
		undefined,
		tsConfigPaths,
		workspaceRoot,
	);

	return {
		...frontendConfig,
		worker: {
			format: "es",
		},
		build: {
			...frontendConfig.build,
			outDir: path.resolve("./dist/bundle/iife"),
			assetsDir: "",
			emptyOutDir: false,
			lib: {
				...frontendConfig.build?.lib,
				entry: path.resolve(entry),
				name: bundleName,
				fileName: () => "procaptcha.bundle.iife.js",
				formats: ["iife"],
			},
			rollupOptions: {
				...frontendConfig.build?.rollupOptions,
				output: {
					...frontendConfig.build?.rollupOptions?.output,
					entryFileNames: "procaptcha.bundle.iife.js",
					inlineDynamicImports: true,
					manualChunks: undefined,
				},
			},
		},
		plugins: [
			{
				name: "copy-locales-iife",
				async writeBundle() {
					const containingFolder = path.dirname(copyDir.destDir);
					if (!fs.existsSync(containingFolder)) {
						fs.mkdirSync(containingFolder, { recursive: true });
					}
					if (!fs.existsSync(copyDir.destDir)) {
						fs.cpSync(copyDir.srcDir, copyDir.destDir, { recursive: true });
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
