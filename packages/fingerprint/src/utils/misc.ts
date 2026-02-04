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
/**
 * Converts an error object to a plain object that can be used with `JSON.stringify`.
 * If you just run `JSON.stringify(error)`, you'll get `'{}'`.
 */
export function errorToObject(error: Readonly<Error>): Record<string, unknown> {
	return {
		name: error.name,
		message: error.message,
		stack: error.stack?.split("\n"),
		// The fields are not enumerable, so TS is wrong saying that they will be overridden
		...(error as Omit<Error, "name" | "message">),
	};
}

export function isFunctionNative(
	func: (...args: unknown[]) => unknown,
): boolean {
	return /^function\s.*?\{\s*\[native code]\s*}$/.test(String(func));
}
