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
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { wasm } from "@rollup/plugin-wasm";
import { default as viteReact } from "@vitejs/plugin-react";
import type { Drop } from "esbuild";
import type { ExternalOption } from "rollup";
import css from "rollup-plugin-import-css";
import { visualizer } from "rollup-plugin-visualizer";
import type { UserConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { filterDependencies, getDependencies } from "../dependencies.js";
import { VitePluginCloseAndCopy } from "./index.js";
import type { ClosePluginOptions } from "./vite-plugin-close-and-copy.js";

export default async function (
	packageName: string,
	bundleName: string,
	dir: string,
	entry: string,
	command?: string,
	mode?: string,
	copyOptions?: ClosePluginOptions,
	tsConfigPaths?: string[],
	workspaceRoot?: string,
): Promise<UserConfig> {
	// Only development and production modes are allowed
	if (mode !== "production") {
		mode = "development";
	}
	// We don't have a default environment of, for example, `test` so we use the `mode` as the default
	const allowedEnvironments = ["development", "staging", "production"];
	const defaultEnvironment =
		process.env.NODE_ENV && allowedEnvironments.includes(process.env.NODE_ENV)
			? process.env.NODE_ENV
			: mode;

	console.info(`Running at ${dir} in ${mode} mode`);
	const isProduction = mode === "production";
	// NODE_ENV must be wrapped in quotes.
	// If NODE_ENV ends up out of sync (one set to development and the other set to production), it causes
	// issues like this: https://github.com/hashicorp/next-mdx-remote/pull/323
	process.env.NODE_ENV = `${process.env.NODE_ENV || mode}`;
	console.info(`NODE_ENV: ${process.env.NODE_ENV}`);

	// Set the env vars that we want to be available in the browser
	const define = {
		// used to stop websockets package from breaking
		"process.env.WS_NO_BUFFER_UTIL": JSON.stringify("true"),
		"process.env.WS_NO_UTF_8_VALIDATE": JSON.stringify("true"),
		"process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
		"process.env.PROSOPO_DEFAULT_ENVIRONMENT":
			JSON.stringify(defaultEnvironment),
		"process.env.PROSOPO_SERVER_URL": JSON.stringify(
			process.env.PROSOPO_SERVER_URL,
		),
		"process.env._DEV_ONLY_WATCH_EVENTS": JSON.stringify(
			process.env._DEV_ONLY_WATCH_EVENTS,
		),
		"process.env.PROSOPO_MONGO_EVENTS_URI": JSON.stringify(
			process.env.PROSOPO_MONGO_EVENTS_URI,
		),
		"process.env.PROSOPO_PACKAGE_VERSION": JSON.stringify(
			process.env.PROSOPO_PACKAGE_VERSION,
		),
		"process.env.PROSOPO_DOCS_URL": JSON.stringify(
			process.env.PROSOPO_DOCS_URL,
		),
		"process.env.PROSOPO_LOG_LEVEL": JSON.stringify(
			process.env.PROSOPO_LOG_LEVEL,
		),
		// only needed if bundling with a site key
		"process.env.PROSOPO_SITE_KEY": JSON.stringify(
			process.env.PROSOPO_SITE_KEY,
		),
	};

	console.info(`Env vars: ${JSON.stringify(define, null, 4)}`);

	// Get all dependencies of the current package
	const { dependencies: deps, optionalPeerDependencies } =
		await getDependencies(packageName, isProduction);

	// Get rid of any dependencies we don't want to bundle
	const { external, internal } = filterDependencies(deps, [
		"pm2",
		"nodejs-polars",
		"aws",
		"webpack",
		"vite",
		"i18next-fs-backend",
	]);

	// Add the node builtins (path, fs, os, etc.) to the external list
	const allExternal = [
		...builtinModules,
		...builtinModules.map((m) => `node:${m}`),
		...external,
		...optionalPeerDependencies,
	];
	console.debug(
		`Bundling. ${JSON.stringify(internal.slice(0, 10), null, 2)}... ${internal.length} deps`,
	);

	// Required to print RegExp in console (e.g. alias keys)
	// biome-ignore lint/suspicious/noExplicitAny: has to be any to represent object prototype
	const proto = RegExp.prototype as any;
	proto.toJSON = RegExp.prototype.toString;

	// drop console logs if in production mode
	let drop: undefined | Drop[];
	let pure: string[] = [];
	if (isProduction) {
		drop = ["debugger"];
		pure = ["console.log", "console.warn", "console.info", "console.debug"];
	}

	const rollupExternal: ExternalOption = allExternal;

	console.info({ bundleName }, "Bundle name");
	return {
		server: {
			host: "127.0.0.1",
		},
		mode: mode || "development",
		optimizeDeps: {
			include: ["node_modules"],
			force: true,
		},
		esbuild: {
			platform: "browser",
			target: [
				"es2020",
				"chrome60",
				"edge18",
				"firefox60",
				"node22",
				"safari11",
			],
			drop,
			pure,
			legalComments: "none",
		},
		define,

		build: {
			outDir: path.resolve(dir, "dist/bundle"),
			minify: isProduction,
			ssr: false,
			lib: {
				entry: path.resolve(dir, entry),
				name: bundleName,
				fileName: `${bundleName}.bundle.js`,
				formats: ["es"],
			},
			modulePreload: { polyfill: true },
			commonjsOptions: {
				exclude: ["mongodb/*"],
				transformMixedEsModules: true,
				strictRequires: "debug",
			},

			rollupOptions: {
				treeshake: {
					annotations: false,
					propertyReadSideEffects: false,
					tryCatchDeoptimization: false,
					moduleSideEffects: "no-external", //true,
					preset: "smallest",
					unknownGlobalSideEffects: false,
				},
				experimentalLogSideEffects: false,
				external: rollupExternal,
				watch: false,

				output: {
					dir: path.resolve(dir, "dist/bundle"),
					entryFileNames: `${bundleName}.bundle.js`,
				},

				plugins: [
					nodePolyfills({
						include: ["crypto"],
					}),
					// biome-ignore lint/suspicious/noExplicitAny: has to be any to represent object prototype
					css() as any,
					// biome-ignore lint/suspicious/noExplicitAny: has to be any to represent object prototype
					wasm() as any,
					// @ts-ignore
					nodeResolve({
						browser: true,
						preferBuiltins: false,
						rootDir: path.resolve(dir, "../../"),
						dedupe: ["react", "react-dom"],
						modulesOnly: true,
						// biome-ignore lint/suspicious/noExplicitAny: has to be any to represent object prototype
					}) as any,
					// String replacement plugin for fingerprinting code
					{
						name: "string-replace-fingerprint",
						generateBundle(_, bundle) {
							for (const fileName in bundle) {
								const chunk = bundle[fileName];
								if (
									chunk &&
									chunk.type === "chunk" &&
									"code" in chunk &&
									chunk.code
								) {
									chunk.code = chunk.code.replace(
										/var request = new XMLHttpRequest\(\);\s*request\.open\("get", "https:\/\/m1\.openfpcdn\.io\/fingerprintjs\/v"\.concat\(version, "\/npm-monitoring"\), true\);\s*request\.send\(\);/g,
										"",
									);
								}
							}
						},
					},
					visualizer({
						open: true,
						template: "treemap", //'list',
						gzipSize: true,
						brotliSize: true,
					}),
					// I think we can use this plugin to build all packages instead of relying on the tsc step that's
					// currently a precursor in package.json. However, it fails for the following reason:
					// https://github.com/rollup/plugins/issues/243
					// @ts-ignore
					typescript({
						tsconfig: path.resolve("./tsconfig.json"),
						compilerOptions: { rootDir: path.resolve("./src") },
						outDir: path.resolve(dir, "dist/bundle"),
					}),
				],
			},
		},
		plugins: [
			// Not sure if we need this plugin or not, it works without it
			// @ts-ignore
			viteReact(),
			// Closes the bundler and copies the bundle to the client-bundle-example project unless we're in serve
			// mode, in which case we don't want to close the bundler because it will close the server
			command !== "serve" ? VitePluginCloseAndCopy(copyOptions) : undefined,
		],
	};
}
