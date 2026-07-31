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

import path from "node:path";
import deepmerge from "deepmerge";
import type { LibraryFormats, UserConfig } from "vite";
import dts, { type PluginOptions as DtsPluginOptions } from "vite-plugin-dts";

export interface IntegrationConfigSettings {
	/** Absolute path of the integration package being built. */
	directory: string;
	/** Global name for the built library. */
	name: string;
	viteSettings?: UserConfig;
	dtsPluginOptions?: DtsPluginOptions;
}

/**
 * Where the shared .env sits relative to an integration package: every one of
 * them lives at integration/frameworks/<framework>/<package>.
 */
export const ENV_DIR_RELATIVE_PATH = "../.." as const;

/**
 * The file each library format is written to.
 *
 * `es` keeps the bare `index.js` that the package exports point at. Anything
 * else gets the format in its name: the format used to be ignored entirely, so
 * a package that asked for a second format quietly wrote both builds over the
 * same file.
 */
export const buildFileName = (format: string): string =>
	format === "es" ? "index.js" : `index.${format}.js`;

/**
 * Merge without cloning. deepmerge copies plain objects by default, and a vite
 * plugin is a plain object: cloning one detaches the copy from the state the
 * plugin closed over and breaks plugins that compare themselves by identity.
 *
 * Arrays are concatenated rather than replaced, which is what makes
 * `viteSettings.plugins` an addition to the dts plugin instead of a
 * replacement for it.
 */
const mergeOptions: deepmerge.Options = {
	clone: false,
	arrayMerge: (target: unknown[], source: unknown[]): unknown[] => [
		...target,
		...source,
	],
};

export function createIntegrationViteConfig(
	configSettings: IntegrationConfigSettings,
): UserConfig {
	if (configSettings.directory.trim() === "") {
		// Left empty, every path below silently resolves against the process cwd,
		// which is wherever the build happened to be started from.
		throw new Error("An integration build needs the package directory");
	}
	if (configSettings.name.trim() === "") {
		throw new Error("An integration build needs a library name");
	}

	const formats: LibraryFormats[] = ["es"];
	const defaultConfig: UserConfig = {
		envDir: path.resolve(configSettings.directory, ENV_DIR_RELATIVE_PATH),
		plugins: [dts(configSettings.dtsPluginOptions)],
		build: {
			outDir: path.resolve(configSettings.directory, "./dist"),
			// The declarations and the bundle are written by separate runs, so
			// clearing the directory here would delete whichever ran first.
			emptyOutDir: false,
			lib: {
				name: configSettings.name,
				entry: path.resolve(configSettings.directory, "./src/index.ts"),
				fileName: buildFileName,
				formats,
			},
		},
	};

	return deepmerge(
		defaultConfig,
		configSettings.viteSettings || {},
		mergeOptions,
	);
}
