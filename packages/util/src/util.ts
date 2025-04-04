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

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
export const kebabCase = (str: string) =>
	str.replace(
		/[A-Z]+(?![a-z])|[A-Z]/g,
		($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
	);
