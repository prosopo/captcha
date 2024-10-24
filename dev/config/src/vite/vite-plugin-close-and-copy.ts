import fs from "node:fs";
import path from "node:path";
import { getLogger } from "@prosopo/common";
// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type { Plugin } from "vite";

export interface ClosePluginOptions {
	srcDir: string;
	destDir: string[];
}

const log = getLogger("Info", "config.vite.vite-plugin-close.js");

/**
 *   description: Closes Vite after the bundle has been build. Optionally copies the bundle to a different directory.
 *   @param { ClosePluginOptions } options - The options object
 **/
export default function VitePluginCloseAndCopy(
	options?: ClosePluginOptions,
): Plugin {
	const __dirname = path.resolve();
	return {
		name: "close-plugin", // required, will show up in warnings and errors
		buildStart() {
			log.info("Bundle build started");
		},
		buildEnd(error) {
			log.info("Build end");
			if (error) {
				console.log(error);
				log.error(error);
			}
		},
		closeBundle() {
			if (options) {
				for (const destDir of options.destDir) {
					clearOutputDirJS(__dirname, destDir);
					log.info(`Bundle cleared from ${options.destDir}`);
					copyBundle(__dirname, options.srcDir, destDir);
					log.info(`Bundle copied to ${options.destDir}`);
				}
				log.info("Bundle closed");
			}
		},
	};
}

const clearOutputDirJS = (__dirname: string, destDir: string) =>
	fs
		.readdirSync(path.resolve(__dirname, destDir))
		.filter((file) => file.endsWith("js"))
		.map((file) => {
			fs.rmSync(path.resolve(__dirname, destDir, file));
		});

const copyBundle = (__dirname: string, srcDir: string, destDir: string) => {
	log.info(
		"Copying",
		path.resolve(__dirname, srcDir),
		"to",
		path.resolve(__dirname, destDir),
	);
	fs.cpSync(path.resolve(__dirname, srcDir), path.resolve(__dirname, destDir), {
		recursive: true,
	});
};
