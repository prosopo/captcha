// Copyright 2021-2026 Prosopo (UK) Ltd.
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

const isObject = (value: unknown): value is Record<string, unknown> =>
	Object === value?.constructor;

/**
 * Recursively converts BigInt values to strings throughout an object, array, or primitive value.
 *
 * BigInts must be cast to strings before applying JSON.stringify(), as it cannot serialize BigInt values and will
 * throw "TypeError: Do not know how to serialize a BigInt".
 *
 * Returns a copy, so frozen or shared values are left untouched.
 *
 * @param value - The value to process (can be a primitive, object, or array)
 * @returns The value with all BigInt instances converted to strings
 */
export const stringifyBigInts = (value: unknown): unknown => {
	if ("bigint" === typeof value) {
		return value.toString();
	}

	if (Array.isArray(value)) {
		return value.map(stringifyBigInts);
	}

	if (isObject(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [
				key,
				stringifyBigInts(entry),
			]),
		);
	}

	return value;
};
