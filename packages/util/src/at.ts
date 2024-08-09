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
export type AtOptions = {
	optional?: boolean; // whether to allow undefined elements in the array (true == optional, false == mandatory)
	noWrap?: boolean; // whether to wrap the index around the bounds of the array (true == no wrap, false == wrap indices)
};
// Get an element from an array, throwing an error if it's index is out of bounds or if the element is undefined or null (can be overridden with the options)

export function at(
	str: string,
	index: number,
	options: AtOptions & { optional: true },
): string | undefined;
export function at(str: string, index: number, options?: AtOptions): string;
export function at<T extends readonly unknown[]>(
	items: T,
	index: number,
	options: AtOptions & { optional: true },
): T[number] | undefined;
export function at<T extends readonly unknown[]>(
	items: T,
	index: number,
	options?: AtOptions,
): Exclude<T[number], undefined>;
export function at<T extends readonly unknown[]>(
	items: T | string,
	index: number,
	options?: AtOptions,
): T[number] {
	if (items.length === 0) {
		throw new Error("Array is empty");
	}

	if (!Number.isFinite(index)) {
		throw new Error(`Index ${index} is not a finite number`);
	}

	if (!options?.noWrap) {
		if (index > 0) {
			index = index % items.length;
		} else {
			// negative index, so index wraps in reverse
			// e.g. say the index is -25 and the items length is 10
			// ceil(25 / 10) = 3 * 10 = 30 + -25 = 5
			index = Math.ceil(Math.abs(index) / items.length) * items.length + index;
		}
	}

	if (index >= items.length) {
		throw new Error(`Index ${index} larger than array length ${items.length}`);
	}
	if (index < 0) {
		throw new Error(`Index ${index} smaller than 0`);
	}

	return items[index] as unknown as T;
}
