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
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { wasm } from "@rollup/plugin-wasm";
import type { Drop } from "esbuild";
import css from "rollup-plugin-import-css";
import type { UserConfig } from "vite";
import { filterDependencies, getDependencies } from "../dependencies.js";
import { default as ClosePlugin } from "./vite-plugin-close-and-copy.js";
import VitePluginFixAbsoluteImports from "./vite-plugin-fix-absolute-imports.js";

export default async function (
	packageName: string,
	packageVersion: string,
	bundleName: string,
	packageDir: string,
	entry: string | string[],
	command?: string,
	mode?: string,
	outputDir?: string,
): Promise<UserConfig> {
	const isProduction = mode === "production";

	// Get all dependencies of the current package
	const { dependencies: deps, optionalPeerDependencies } =
		await getDependencies(packageName, true);

	// Output directory is custom or relative to directory of the package
	const outDir = outputDir
		? path.resolve(outputDir)
		: path.resolve(packageDir, "dist/bundle");

	// Get rid of any dependencies we don't want to bundle
	const { external, internal } = filterDependencies(deps, [
		"aws",
		"webpack",
		"vite",
		"biome",
	]);

	// Add the node builtins (path, fs, os, etc.) to the external list
	const allExternal = [
		...builtinModules,
		...builtinModules.map((m) => `node:${m}`),
		...external,
		...optionalPeerDependencies,
	];

	console.info(
		`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`,
	);

	const define = {
		"process.env.WS_NO_BUFFER_UTIL": "true",
		"process.env.WS_NO_UTF_8_VALIDATE": "true",
		"process.env.PROSOPO_PACKAGE_VERSION": JSON.stringify(packageVersion),
		"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || mode),
		...(process.env.PROSOPO_DEFAULT_ENVIRONMENT && {
			"process.env.PROSOPO_DEFAULT_ENVIRONMENT": JSON.stringify(
				process.env.PROSOPO_DEFAULT_ENVIRONMENT,
			),
		}),
	};

	console.info(`Defined vars ${JSON.stringify(define, null, 2)}`);

	let entriesAbsolute: string[];
	if (typeof entry === "string") {
		entriesAbsolute = [path.resolve(packageDir, entry)];
	} else {
		entriesAbsolute = entry.map((e) => path.resolve(packageDir, e));
	}

	// drop console logs if in production mode
	const drop: Drop[] | undefined =
		mode === "production" ? ["console", "debugger"] : undefined;

	return {
		ssr: {
			noExternal: internal,
			external: allExternal,
		},
		optimizeDeps: {
			include: ["linked-dep", "node_modules"],
			esbuildOptions: {
				loader: {
					".node": "file",
				},
			},
		},
		esbuild: {
			platform: "node",
			target: "node18",
			// drop,
			legalComments: "none",
		},
		define,
		build: {
			outDir,
			minify: isProduction,
			ssr: true,
			target: "node18",
			lib: {
				entry: entriesAbsolute,
				name: bundleName,
				fileName: `${bundleName}.[name].bundle.js`,
				formats: ["es"],
			},
			modulePreload: { polyfill: false },
			rollupOptions: {
				treeshake: "smallest",
				external: allExternal,
				watch: false,
				output: {
					entryFileNames: `${bundleName}.[name].bundle.js`,
				},
				// biome-ignore lint/suspicious/noExplicitAny: has to be any to represent object prototype
				plugins: [css() as any, wasm() as any, nodeResolve() as any],
			},
		},
		plugins: [
			// plugin to replace stuff like import blah from string_encoder/lib/string_encoder.js with import blah from string_encoder
			VitePluginFixAbsoluteImports(),
			// plugin to close the bundle after build if not in serve mode
			command !== "serve" ? ClosePlugin() : undefined,
		],
	};
}
