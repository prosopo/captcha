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
import deepmerge from "deepmerge";
import type { UserConfig } from "vite";
import dts, { type PluginOptions as DtsPluginOptions } from "vite-plugin-dts";

interface IntegrationConfigSettings {
	directory: string;
	name: string;
	viteSettings?: UserConfig;
	dtsPluginOptions?: DtsPluginOptions;
}

function createIntegrationViteConfig(
	configSettings: IntegrationConfigSettings,
): UserConfig {
	const defaultConfig: UserConfig = {
		envDir: path.resolve(configSettings.directory, "../.."),
		plugins: [dts(configSettings.dtsPluginOptions)],
		build: {
			outDir: path.resolve(configSettings.directory, "./dist"),
			emptyOutDir: false,
			lib: {
				name: configSettings.name,
				entry: path.resolve(configSettings.directory, "./src/index.ts"),
				fileName: (format) => "index.js",
				formats: ["es"],
			},
		},
	};

	return deepmerge(defaultConfig, configSettings.viteSettings || {});
}

export { createIntegrationViteConfig };
