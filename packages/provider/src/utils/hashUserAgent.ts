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
import { createHash } from "node:crypto";

/**
 * Hash a user agent string to a fixed-length string to prevent RSA-OAEP encryption size limits
 * Uses SHA-256 and returns first 32 characters of the hex digest (128 bits)
 * This provides a good balance between uniqueness and size constraints
 *
 * @param userAgent - The user agent string to hash
 * @returns A 32-character hex string representing the hash
 */
export function hashUserAgent(userAgent: string): string {
	// Create SHA-256 hash
	const hash = createHash("sha256");
	hash.update(userAgent, "utf8");
	const hashHex = hash.digest("hex");

	// Return first 32 characters (128 bits) for a good balance of uniqueness and size
	return hashHex.substring(0, 32);
}
