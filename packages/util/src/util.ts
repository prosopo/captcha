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
// sleep for some milliseconds

export const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export function getCurrentFileDirectory(url: string) {
	return new URL(url).pathname.split("/").slice(0, -1).join("/");
}

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

export const unflatten = (obj: Record<string, string>, prefix = "") => {
	// biome-ignore lint/suspicious/noExplicitAny: <We dont know>
	const unflattenedObj: Record<string, any> = {};

	// Iterate through the entries of the object
	for (const [key, value] of Object.entries(obj)) {
		// Remove the prefix and split the key by "."
		const keyParts = key.replace(prefix, "").split(".");

		// Start with the outermost object
		let currentObj = unflattenedObj;

		// Loop through each part of the key
		for (let i = 0; i < keyParts.length - 1; i++) {
			// Create nested objects as needed
			const accessor1 = keyParts[i];
			if (accessor1 === undefined) {
				continue;
			}

			if (!currentObj[accessor1]) {
				currentObj[accessor1] = {};
			}
			// Move deeper into the object
			currentObj = currentObj[accessor1];
		}

		const accessor2 = keyParts[keyParts.length - 1];

		if (accessor2 === undefined) {
			continue;
		}

		// Assign the value to the last key part
		currentObj[accessor2] = value;
	}

	return unflattenedObj;
};

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
export const kebabCase = (str: string) =>
	str.replace(
		/[A-Z]+(?![a-z])|[A-Z]/g,
		($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
	);
