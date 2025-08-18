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
import glob from "fast-glob";
import type { Plugin } from "vite";

const used = new Set<string>();

export const flatten = (obj: object, prefix = ""): Record<string, string> => {
	const flattenedObj: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value instanceof Object) {
			Object.assign(flattenedObj, flatten(value, `${prefix + key}.`));
		} else {
			flattenedObj[prefix + key] = value;
		}
	}
	return flattenedObj;
};

type UnflattenObject =
	| Record<string, string | number | boolean | undefined>
	| string[]
	| number[]
	| boolean[];

export const unflatten = (
	obj: Record<string, string | number | boolean>,
): Record<string, string | number | boolean | UnflattenObject> => {
	const result: Record<string, string | number | boolean | UnflattenObject> =
		{};

	for (const [key, value] of Object.entries(obj)) {
		const keys = key.split(".");
		keys.reduce((acc, k, i) => {
			if (i === keys.length - 1) {
				(acc as Record<string, string | number | boolean | UnflattenObject>)[
					k
				] = value;
			} else {
				if (!acc[k]) {
					acc[k] = Number.isNaN(Number(keys[i + 1])) ? {} : [];
				}
			}
			return acc[k] as Record<
				string,
				string | number | boolean | UnflattenObject
			>;
		}, result);
	}

	return result;
};

export default function VitePluginRemoveUnusedTranslations(
	translationKeys: string[],
	jsonPattern: string,
): Plugin {
	return {
		name: "remove-unused-translations",
		transform(code: string) {
			// Collect translation keys used in the source files
			for (const key of translationKeys) {
				if (code.includes(key) && !used.has(key)) {
					console.info(`Found key: ${key}`);
					used.add(key);
				}
			}
			return { code };
		},
		enforce: "post",

		async writeBundle() {
			// Find all matching JSON files
			const jsonFiles = await glob(jsonPattern, { absolute: true });

			console.info(`Found ${jsonFiles.length} JSON files at ${jsonPattern}`);

			const filePromises = [];
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

					// log.info(unflattened);

					// Write back the filtered JSON
					filePromises.push(
						fs
							.writeFile(
								filePath,
								JSON.stringify(unflattened, null, 2),
								"utf-8",
							)
							.then(() => {
								console.info(`Updated ${filePath}`);
							})
							.catch((e) => {
								console.error(`Failed to update ${filePath}:`, e);
							}),
					);
				} catch (error: unknown) {
					console.error(`Failed to process ${filePath}:`, error);
				}
			}
			await Promise.all(filePromises);
		},
	};
}
