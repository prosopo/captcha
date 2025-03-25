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
import navigationInjector from "./src/plugins/navigation-injector.js";

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

export default defineConfig(({ command, mode }) => {
	loadEnv();
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
			"import.meta.env.PROSOPO_SERVER_URL": JSON.stringify(
				process.env.PROSOPO_SERVER_URL,
			),
			"import.meta.env.VITE_BUNDLE_URL": JSON.stringify(
				process.env.VITE_BUNDLE_URL || "./assets/procaptcha.bundle.js",
			),
		},
		optimizeDeps: {
			noDiscovery: true,
			include: ["void-elements", "react", "bn.js"],
		},
		build: {
			outDir: "dist",
			emptyOutDir: true,
			rollupOptions: {
				input: {
					index: path.resolve(__dirname, "src/index.html"),
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
					pow: path.resolve(__dirname, "src/pow.html"),
					frictionless: path.resolve(__dirname, "src/frictionless.html"),
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
			write: false,
		},
		plugins: [
			navigationInjector(),
			{
				name: "copy-files",
				closeBundle() {
					const srcDir = path.resolve(__dirname, "src");
					const destDir = path.resolve(__dirname, "dist");
					copyDirContents(srcDir, destDir);
				},
			},
		],
	} as UserConfig;
});
