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

import { builtinModules } from "node:module";
import path from "node:path";
import replace from "@rollup/plugin-replace";
import fg from "fast-glob";
import { type UserConfig, defineConfig } from "vite";
import { default as noBundlePlugin } from "vite-plugin-no-bundle";
import tsconfigPaths from "vite-tsconfig-paths";
import { getExternalsFromReferences } from "../dependencies.js";
import VitePluginCloseAndCopy from "./vite-plugin-close-and-copy.js";
import VitePluginCopy from "./vite-plugin-copy.js";

export default async function (
	name: string,
	tsConfigPath: string,
	entry?: string,
): Promise<UserConfig> {
	console.info(`ViteEsmConfig: ${name}`);
	const projectExternal = await getExternalsFromReferences(tsConfigPath, [
		/dev/,
	]);
	const allExternal = [
		...builtinModules,
		...builtinModules.map((m) => `node:${m}`),
		...projectExternal,
	];
	return defineConfig({
		ssr: { external: allExternal },
		plugins: [
			// @ts-ignore
			noBundlePlugin({
				root: "src",
				copy: "**/*.css",
			}),
			VitePluginCopy({
				srcDir: "src",
				destDir: "dist",
				include: ["**/*.json"],
			}),
			tsconfigPaths({ projects: [path.resolve(tsConfigPath)] }),
			VitePluginCloseAndCopy(),
		],
		build: {
			emptyOutDir: false,
			ssr: true,
			target: "node18",
			outDir: "dist",
			lib: {
				name,
				formats: ["es"],
				entry: entry || "src/index.ts", // required
			},
			rollupOptions: {
				treeshake: false,
				external: allExternal,
			},
		},
		esbuild: {
			jsx: "automatic",
			jsxImportSource: "@emotion/react",
			jsxDev: process.env.NODE_ENV === "development",

		}
	});
}
