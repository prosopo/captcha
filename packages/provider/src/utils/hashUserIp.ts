// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import { createHash } from "node:crypto";

/**
 * Hash a user and IP address combination to create a unique session identifier
 *
 * @param user - The user identifier
 * @param ip - The IP address
 * @returns A 64-character hex string representing the hash
 */
export function hashUserIp(user: string, ip: string): string {
	// Create SHA-256 hash of user:ip combination
	const hash = createHash("sha256");
	hash.update(`${user}:${ip}`, "utf8");
	return hash.digest("hex");
}
