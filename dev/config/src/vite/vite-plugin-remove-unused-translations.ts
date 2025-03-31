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
import fs from "node:fs/promises";
import { flatten, unflatten } from "@prosopo/util";
import glob from "fast-glob";
import type { Logger, Plugin } from "vite";

const used = new Set<string>();
let logger: Logger | Console;

export default function VitePluginRemoveUnusedTranslations(
	translationKeys: string[],
	jsonPattern: string,
): Plugin {
	return {
		name: "remove-unused-translations",
		configResolved(config) {
			logger = config.logger;
			config.logger.info("Remove-Unused-Translations", { timestamp: true });
		},
		transform(code: string) {
			// Collect translation keys used in the source files
			for (const key of translationKeys) {
				if (code.includes(key)) {
					logger.info(`Found key: ${key}`);
					used.add(key);
				}
			}
			return { code };
		},
		enforce: "post",

		async closeBundle() {
			if (logger) {
				logger.info("Build is done!");
			} else {
				console.log("Build is done!");
			}

			// Find all matching JSON files
			const jsonFiles = await glob(jsonPattern, { absolute: true });

			console.log(`Found ${jsonFiles.length} JSON files at ${jsonPattern}`);

			for (const filePath of jsonFiles) {
				try {
					const content = await fs.readFile(filePath, "utf-8");
					const jsonData = JSON.parse(content);
					const jsonDataFlattened = flatten(jsonData);

					// Remove keys that are not in `used`
					const filteredData = Object.fromEntries(
						Object.entries(jsonDataFlattened).filter(([key]) => used.has(key)),
					);

					const unflattened = unflatten(filteredData);

					// Write back the filtered JSON
					await fs.writeFile(
						filePath,
						JSON.stringify(unflattened, null, 2),
						"utf-8",
					);
					logger.info(`Updated: ${filePath}`);
				} catch (error: unknown) {
					// @ts-ignore
					logger.error(`Failed to process ${filePath}:`, error);
				}
			}
		},
	};
}
