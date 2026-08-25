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
	return (
		parsed.type === sessionIp.type &&
		parsed.lower === sessionIp.lower &&
		(parsed.upper ?? undefined) === (sessionIp.upper ?? undefined)
	);
};
