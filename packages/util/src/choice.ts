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
type ChoiceOptions = {
	withReplacement?: boolean;
};
export function choice<T>(
	items: T[],
	n: number,
	random: () => number,
	options?: ChoiceOptions,
): T[] {
	if (n > items.length) {
		throw new Error(
			`Cannot choose ${n} items from array of length ${items.length}`,
		);
	}

	const result: T[] = [];
	const indices: number[] = [];
	for (let i = 0; i < n; i++) {
		let index: number;
		do {
			index = Math.floor(Math.abs(random()) * items.length) % items.length;
		} while (options?.withReplacement === false && indices.includes(index));
		indices.push(index);
		result.push(items[index] as T);
	}
	return result;
}
