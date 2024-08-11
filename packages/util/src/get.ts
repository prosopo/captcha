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

export function get<T>(
	obj: T,
	key: string | number | symbol,
	required?: true,
): Exclude<T[keyof T], undefined>;
export function get<T>(
	obj: T,
	key: string | number | symbol,
	required: false,
): T[keyof T] | undefined;
export function get<T, V>(obj: T, key: unknown, required = true): V {
	const value = obj[key as unknown as keyof T];
	if (required && value === undefined) {
		throw new Error(
			`Object has no property '${String(key)}': ${JSON.stringify(obj, null, 2)}`,
		);
	}
	return value as V;
}
