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

import { parseInteger } from "@prosopo/util";

/**
 * Normalise "x.y.z" (e.g. "01.2.3" → "1.2.3"). Each part must be a whole
 * non-negative integer: parseInt alone let "1x.2.3" through as "1.2.3".
 */
export const parseVersion = (version: string): string => {
	const parts = version.split(".");
	const numbers = parts.map((part) => parseInteger(part, { min: 0 }));
	if (parts.length !== 3 || numbers.some((n) => !n.ok)) {
		throw new Error("Version must be in the format of x.y.z");
	}
	return numbers.map((n) => n.unwrap()).join(".");
};
