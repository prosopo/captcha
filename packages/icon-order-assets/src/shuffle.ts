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

import type { Prng } from "@prosopo/puzzle-assets";

/** Fisher-Yates, so every ordering is equally likely. */
export const shuffle = <T>(prng: Prng, items: readonly T[]): T[] => {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = prng.int(0, i);
		const a = out[i];
		const b = out[j];
		if (a === undefined || b === undefined) {
			throw new Error("icon-order-assets: shuffle index out of range");
		}
		out[i] = b;
		out[j] = a;
	}
	return out;
};
