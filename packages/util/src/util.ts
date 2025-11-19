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
// sleep for some milliseconds

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function getCurrentFileDirectory(url: string) {
    return new URL(url).pathname.split('/').slice(0, -1).join('/')
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


/**
 * @param ob Object                 The object to flatten
 * @param prefix String (Optional)  The prefix to add before each key, also used for recursion
 * @param result
 * Taken from https://stackoverflow.com/a/59787588/1178971 user @Tofandel
 **/

export function flattenObject(ob: { [key: string]: any }, prefix?: string, result: { [key: string]: any } = {}) {
    // Preserve empty objects and arrays, they are lost otherwise
    if (prefix && typeof ob === 'object' && ob !== null && Object.keys(ob).length === 0) {
        result[prefix] = Array.isArray(ob) ? [] : {}
        return result
    }

    prefix = prefix ? prefix + '.' : ''

    for (const i in ob) {
        if (Object.prototype.hasOwnProperty.call(ob, i)) {
            // Only recurse on true objects and arrays, ignore custom classes like dates
            if (
                typeof ob[i] === 'object' &&
                (Array.isArray(ob[i]) || Object.prototype.toString.call(ob[i]) === '[object Object]') &&
                ob[i] !== null
            ) {
                // Recursion on deeper objects
                flattenObject(ob[i], prefix + i, result)
            } else {
                result[prefix + i] = ob[i]
            }
        }
    }
    return result
}

/**
 * Bonus function to unflatten an object
 *
 * @param ob Object     The object to unflatten
 * Taken from https://stackoverflow.com/a/59787588/1178971 user @Tofandel
 */
export function unflattenObject(ob: { [key: string]: any }) {
    const result: { [key: string]: any } = {}
    for (const i in ob) {
        if (Object.prototype.hasOwnProperty.call(ob, i)) {
            const keys = i.match(/(?:^\.+)?(?:\.{2,}|[^.])+(?:\.+$)?/g) // Just a complicated regex to only match a single dot in the middle of the string
            if (keys) {
                keys.reduce((r, e, j) => {
                    return r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 === j ? ob[i] : {}) : [])
                }, result)
            }
        }
    }
    return result
}

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
export const kebabCase = (str: string) =>
    str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase())
