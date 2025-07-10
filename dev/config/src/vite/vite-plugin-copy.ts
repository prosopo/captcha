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
import type { Plugin } from "vite";
import fg from "fast-glob";

interface CopyPluginOptions {
	srcDir: string;
	destDir: string;
	include?: string[]; // Optional: glob patterns for files to include
	exclude?: string[]; // Optional: glob patterns for files to exclude
}

function ensureDirExists(filePath: string) {
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

export default function VitePluginCopy(options: CopyPluginOptions): Plugin {
	const __dirname = path.resolve();
	return {
		name: "copy-plugin",
		async closeBundle() {
			const srcAbs = path.resolve(__dirname, options.srcDir);
			const destAbs = path.resolve(__dirname, options.destDir);
			const include = options.include && options.include.length > 0 ? options.include : undefined;
			const exclude = options.exclude || [];
			if (!include) {
				console.info(`[copy-plugin] No include globs specified, nothing to copy.`);
				return;
			}
			const files = await fg(include, {
				cwd: srcAbs,
				ignore: exclude,
				onlyFiles: true,
				absolute: false,
			});
			for (const relFile of files) {
				const srcFile = path.join(srcAbs, relFile);
				const destFile = path.join(destAbs, relFile);
				ensureDirExists(destFile);
				console.info(`[copy-plugin] copying ${srcFile} to ${destFile}`);
				fs.copyFileSync(srcFile, destFile);
			}
		},
	};
}
