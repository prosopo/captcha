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

import type { Logger } from "@prosopo/common";

/**
 * Normalizes a request IP address from various formats to a string
 *
 * Handles different IP formats:
 * - Direct string
 * - Object with address property (e.g., IPv6 format)
 * - Other objects by converting to string
 *
 * @param rawIp - The raw IP value from the request
 * @param logger - Logger instance for debugging
 * @returns Normalized IP address as a string
 */
export const normalizeRequestIp = (rawIp: unknown, logger: Logger): string => {
	let normalizedIp = "";
	const rawType = typeof rawIp;
	const rawCtor =
		rawIp && rawType === "object"
			? (rawIp as { constructor?: { name?: string } }).constructor?.name
			: undefined;
	const addressProp =
		rawIp && rawType === "object"
			? (rawIp as { address?: unknown }).address
			: undefined;

	if (rawType === "string") {
		normalizedIp = rawIp as string;
	} else if (typeof addressProp === "string") {
		normalizedIp = addressProp;
	} else if (rawIp != null) {
		normalizedIp = String(rawIp);
	}

	logger.debug(() => ({
		msg: "Normalized request IP",
		data: {
			rawIpType: rawType,
			rawIpCtor: rawCtor,
			rawIpString: rawType === "string" ? rawIp : undefined,
			addressPropType: typeof addressProp,
			normalizedIp,
		},
	}));

	return normalizedIp;
};
