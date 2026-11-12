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

import type { DetectorData } from "@prosopo/types";

const SAFE_KEY = /^[A-Za-z0-9_]+$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The `$set` that merges `data` into a session's `dSubmit` one level deep:
 * `{ b: { x: [1] } }` becomes `{ "dSubmit.b.x": [1] }`, so two submissions
 * that report different keys under `b` both survive. Keys that could address
 * another path (dots, `$`) are dropped.
 */
export const submitDetectorDataSets = (
	data: DetectorData,
): Record<string, unknown> => {
	const sets: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (!SAFE_KEY.test(key)) continue;
		if (!isPlainObject(value)) {
			sets[`dSubmit.${key}`] = value;
			continue;
		}
		for (const [subKey, subValue] of Object.entries(value)) {
			if (SAFE_KEY.test(subKey)) sets[`dSubmit.${key}.${subKey}`] = subValue;
		}
	}
	return sets;
};

/**
 * `submitted` over `detected`, one level deep: a key both hold as objects is
 * merged, anything else is replaced. The mirror of {@link submitDetectorDataSets}.
 */
export const mergeSubmitDetectorData = (
	detected: DetectorData | undefined,
	submitted: DetectorData,
): DetectorData => {
	const merged: DetectorData = { ...detected };
	for (const [key, value] of Object.entries(submitted)) {
		const current = merged[key];
		merged[key] =
			isPlainObject(current) && isPlainObject(value)
				? { ...current, ...value }
				: value;
	}
	return merged;
};
