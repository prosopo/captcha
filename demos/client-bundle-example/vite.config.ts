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
import path from "node:path";
import { loadEnv } from "@prosopo/dotenv";
import { type UserConfig, defineConfig } from "vite";
import explanationInjector from "./src/plugins/explanation-injector.js";
import formFillerInjector from "./src/plugins/form-filler-injector.js";
import navigationInjector from "./src/plugins/navigation-injector.js";
import statusLogInjector from "./src/plugins/status-log-injector.js";

loadEnv();

// Function to copy contents of a directory to another directory
function copyDirContents(src: string, dest: string) {
	if (!fs.existsSync(dest)) {
		fs.mkdirSync(dest, { recursive: true });
	}

	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDirContents(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

// This is like close and copy but for output /dist/src to just /dist
function moveDirectoryContents(
	srcDir: string,
	destDir: string,
	deleteSource = false,
) {
	if (!fs.existsSync(srcDir)) {
		return;
	}

	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}

	const entries = fs.readdirSync(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(srcDir, entry.name);
		const destPath = path.join(destDir, entry.name);

		if (entry.isDirectory()) {
			moveDirectoryContents(srcPath, destPath, deleteSource);
			if (deleteSource) {
				try {
					fs.rmdirSync(srcPath);
				} catch (err) {
					console.warn(`Could not remove directory ${srcPath}:`, err);
				}
			}
		} else {
			try {
				fs.copyFileSync(srcPath, destPath);
				if (deleteSource) {
					fs.unlinkSync(srcPath);
				}
			} catch (err) {
				console.warn(`Error moving file ${srcPath} to ${destPath}:`, err);
			}
		}
	}
}

export default defineConfig(({ command, mode }) => {
	return {
		watch: false,
		mode: "development",
		server: {
			host: true,
			cors: true,
		},
		define: {
			"import.meta.env.PROSOPO_SITE_KEY": JSON.stringify(
				process.env.PROSOPO_SITE_KEY,
			),
			"import.meta.env.PROSOPO_SITE_KEY_IMAGE": JSON.stringify(
				process.env.PROSOPO_SITE_KEY_IMAGE,
			),
			"import.meta.env.PROSOPO_SITE_KEY_SLIDER": JSON.stringify(
				process.env.PROSOPO_SITE_KEY_SLIDER,
			),
			"import.meta.env.PROSOPO_SITE_KEY_POW": JSON.stringify(
				process.env.PROSOPO_SITE_KEY_POW,
			),
			"import.meta.env.PROSOPO_SITE_KEY_FRICTIONLESS": JSON.stringify(
				process.env.PROSOPO_SITE_KEY_FRICTIONLESS,
			),
			"import.meta.env.PROSOPO_SERVER_URL": JSON.stringify(
				process.env.PROSOPO_SERVER_URL,
			),
			"import.meta.env.VITE_BUNDLE_URL": JSON.stringify(
				process.env.VITE_BUNDLE_URL ||
					"http://localhost:9269/procaptcha.bundle.js",
			),
			"import.meta.env.PROSOPO_WEB2": JSON.stringify(
				process.env.PROSOPO_WEB2 || "true",
			),
			process: {
				env: {
					PROSOPO_LOG_LEVEL: JSON.stringify(
						process.env.PROSOPO_LOG_LEVEL || "info",
					),
				},
			},
		},
		optimizeDeps: {
			noDiscovery: true,
			include: [
				"void-elements",
				"react",
				"bn.js",
				"@polkadot/wasm-crypto-wasm",
			],
		},
		build: {
			commonjsOptions: {
				transformMixedEsModules: true,
			},
			outDir: "dist",
			emptyOutDir: true,
			rollupOptions: {
				input: {
					index: path.resolve(__dirname, "src/index.html"),
					"pow-explicit": path.resolve(__dirname, "src/pow-explicit.html"),
					"image-explicit": path.resolve(__dirname, "src/image-explicit.html"),
					"pow-implicit": path.resolve(__dirname, "src/pow-implicit.html"),
					"image-implicit": path.resolve(__dirname, "src/image-implicit.html"),
					"frictionless-implicit": path.resolve(
						__dirname,
						"src/frictionless-implicit.html",
					),
					"frictionless-explicit": path.resolve(
						__dirname,
						"src/frictionless-explicit.html",
					),
					"invisible-pow-explicit": path.resolve(
						__dirname,
						"src/invisible-pow-explicit.html",
					),
					"invisible-image-explicit": path.resolve(
						__dirname,
						"src/invisible-image-explicit.html",
					),
					"invisible-pow-implicit": path.resolve(
						__dirname,
						"src/invisible-pow-implicit.html",
					),
					"invisible-image-implicit": path.resolve(
						__dirname,
						"src/invisible-image-implicit.html",
					),
					"invisible-frictionless-implicit": path.resolve(
						__dirname,
						"src/invisible-frictionless-implicit.html",
					),
					"invisible-frictionless-explicit": path.resolve(
						__dirname,
						"src/invisible-frictionless-explicit.html",
					),
				},
			},
		},
		plugins: [
			navigationInjector(),
			formFillerInjector(),
			explanationInjector(),
			statusLogInjector(),
			{
				name: "copy-files",
				closeBundle() {
					// This runs after all other plugins have processed files
					console.log("Copying additional files from src to dist...");
					// Only copy assets and other non-HTML files since HTML files are processed by Vite
					const srcAssetsDir = path.resolve(__dirname, "src/assets");
					const destAssetsDir = path.resolve(__dirname, "dist/assets");
					if (fs.existsSync(srcAssetsDir)) {
						copyDirContents(srcAssetsDir, destAssetsDir);
					}

					// Copy any other necessary directories
					const srcPluginsDir = path.resolve(__dirname, "src/plugins");
					const destPluginsDir = path.resolve(__dirname, "dist/plugins");
					if (fs.existsSync(srcPluginsDir)) {
						copyDirContents(srcPluginsDir, destPluginsDir);
					}

					// Final step: move any content from dist/src to dist root
					const distSrcDir = path.resolve(__dirname, "dist/src");
					const distDir = path.resolve(__dirname, "dist");
					if (fs.existsSync(distSrcDir)) {
						console.log("Moving files from dist/src to dist root...");
						moveDirectoryContents(distSrcDir, distDir, true);

						// Try to remove the now-empty dist/src directory
						try {
							fs.rmdirSync(distSrcDir);
							console.log("Removed empty dist/src directory");
						} catch (err) {
							console.warn("Could not remove dist/src directory:", err);
						}
					}
				},
			},
		],
	} as UserConfig;
});
