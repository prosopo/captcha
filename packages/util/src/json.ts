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

export const jsonEncode = (
	obj: unknown,
	// biome-ignore lint/suspicious/noExplicitAny: has to be any to represent object prototype
	replacer?: ((this: any, key: string, value: any) => any) | null,
	space?: string | number,
): string => {
	return JSON.stringify(
		obj,
		(key, value) =>
			typeof value === "bigint"
				? {
						type: "bigint",
						value: value.toString(),
					}
				: replacer
					? replacer.call(this, key, value)
					: value,
		space,
	);
};

export const jsonDecode = (
	str: string,
	// biome-ignore lint/suspicious/noExplicitAny: has to be any to represent object prototype
	reviver?: ((this: any, key: string, value: any) => any) | null,
): unknown => {
	return JSON.parse(str, (key, value) => {
		if (
			typeof value === "object" &&
			value !== null &&
			value.type === "bigint"
		) {
			return BigInt(value.value);
		}
		return reviver ? reviver.call(this, key, value) : value;
	});
};
