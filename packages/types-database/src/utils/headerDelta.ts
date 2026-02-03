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

import type { RequestHeaders } from "@prosopo/types";

/**
 * Special value indicating a header was removed (not present in current headers)
 */
export const HEADER_REMOVED = "__REMOVED__";

/**
 * Calculate the delta between base headers and current headers.
 * Returns only the headers that have changed or been added.
 * Headers that were removed are marked with HEADER_REMOVED value.
 *
 * @param baseHeaders - The original headers from the session request
 * @param currentHeaders - The headers from the current request
 * @returns An object containing only changed/added headers, or undefined if no changes
 */
export function calculateHeaderDelta(
	baseHeaders: RequestHeaders,
	currentHeaders: RequestHeaders,
): Partial<RequestHeaders> | undefined {
	const delta: Partial<RequestHeaders> = {};
	let hasChanges = false;

	// Find headers that are new or changed
	for (const [key, value] of Object.entries(currentHeaders)) {
		if (!(key in baseHeaders) || baseHeaders[key] !== value) {
			delta[key] = value;
			hasChanges = true;
		}
	}

	// Find headers that were removed
	for (const key of Object.keys(baseHeaders)) {
		if (!(key in currentHeaders)) {
			delta[key] = HEADER_REMOVED;
			hasChanges = true;
		}
	}

	return hasChanges ? delta : undefined;
}

/**
 * Reconstruct full headers from base headers and a delta.
 * Applies the delta to the base headers to get the complete headers for a request.
 *
 * @param baseHeaders - The original headers from the session request
 * @param headersDelta - The delta containing changed/added headers
 * @returns The reconstructed complete headers
 */
export function reconstructHeaders(
	baseHeaders: RequestHeaders,
	headersDelta?: Partial<RequestHeaders>,
): RequestHeaders {
	if (!headersDelta) {
		return { ...baseHeaders };
	}

	const reconstructed: RequestHeaders = { ...baseHeaders };

	for (const [key, value] of Object.entries(headersDelta)) {
		if (value === HEADER_REMOVED) {
			delete reconstructed[key];
		} else if (value !== undefined) {
			reconstructed[key] = value;
		}
	}

	return reconstructed;
}

/**
 * Estimate the storage savings from using header delta compression.
 * Useful for monitoring the effectiveness of the compression.
 *
 * @param baseHeaders - The original headers from the session request
 * @param headersDelta - The delta containing changed/added headers
 * @returns Object with original size, delta size, and savings percentage
 */
export function estimateHeaderSavings(
	baseHeaders: RequestHeaders,
	headersDelta?: Partial<RequestHeaders>,
): { originalSize: number; deltaSize: number; savingsPercent: number } {
	const originalSize = JSON.stringify(baseHeaders).length;
	const deltaSize = headersDelta ? JSON.stringify(headersDelta).length : 0;

	const savingsPercent =
		originalSize > 0 ? ((originalSize - deltaSize) / originalSize) * 100 : 0;

	return {
		originalSize,
		deltaSize,
		savingsPercent: Math.round(savingsPercent * 100) / 100,
	};
}
