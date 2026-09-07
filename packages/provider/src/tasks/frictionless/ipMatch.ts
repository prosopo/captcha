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

import type { CompositeIpAddress } from "@prosopo/types";
import { getCompositeIpAddress } from "../../compositeIpAddress.js";

/**
 * `CompositeIpAddress` types its halves as `bigint`, but that is only true of
 * a value just built by `getCompositeIpAddress`. Read back off a session the
 * halves are whatever BSON stored — a `Decimal128`, or a `Long` on records
 * written before the Decimal128 migration — so `===` against a real bigint is
 * false for every session that has been through Mongo. Both BSON types
 * stringify to plain digits at IP magnitudes (≤ 2^64, well inside
 * Decimal128's 34 significant digits), so a string round-trip is exact.
 *
 * `null` for anything unparseable rather than a 0n default: two unparseable
 * halves must not compare equal, or garbage would match garbage.
 */
const asBigInt = (half: unknown): bigint | null => {
	if (typeof half === "bigint") return half;
	if (half === undefined || half === null) return 0n;
	try {
		return BigInt(String(half));
	} catch {
		return null;
	}
};

/**
 * Compare an operator-supplied plain-string IP against the CompositeIpAddress
 * captured on a session. Returns true iff the parsed IP has the same type
 * (v4/v6) and numeric halves.
 *
 * Load-bearing for Web Bot Auth IP binding — a leaked authenticated token
 * replayed from a different IP fails here. Malformed operator IPs degrade
 * to {lower: 0n, type: v4} inside getCompositeIpAddress and can never match
 * a real session (a real v4 session has a non-zero `lower`; a real v6 has
 * type=v6). That degradation is deliberate: silently treating garbage as a
 * match would nullify the whole binding.
 */
export const ipMatchesSession = (
	operatorIp: string,
	sessionIp: CompositeIpAddress,
): boolean => {
	const parsed = getCompositeIpAddress(operatorIp);
	if (parsed.type !== sessionIp.type) return false;

	const lower = asBigInt(sessionIp.lower);
	const upper = asBigInt(sessionIp.upper);
	if (lower === null || upper === null) return false;

	return parsed.lower === lower && (parsed.upper ?? 0n) === upper;
};
