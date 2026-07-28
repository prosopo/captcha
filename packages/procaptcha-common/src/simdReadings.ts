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

export const SIMD_READINGS_SUBMIT_TIMEOUT_MS = 5000;

export interface SimdReadingsSource {
	getSimdReadings?: (timeoutMs?: number) => Promise<string | undefined>;
}

export const getSimdReadingsForSubmit = async (
	source: SimdReadingsSource | undefined,
	timeoutMs: number = SIMD_READINGS_SUBMIT_TIMEOUT_MS,
): Promise<string | undefined> => {
	if (!source?.getSimdReadings) return undefined;
	const { getSimdReadings } = source;

	let readings: Promise<string | undefined>;
	try {
		readings = Promise.resolve(getSimdReadings.call(source, timeoutMs));
	} catch {
		return undefined;
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<undefined>((resolve) => {
		timeoutId = setTimeout(() => resolve(undefined), timeoutMs);
	});

	try {
		return await Promise.race([readings.catch(() => undefined), timeout]);
	} finally {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
	}
};
