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
 * Hash a user agent to a fixed 32-character hex string (the first 128 bits of
 * its SHA-256) so it stays within RSA-OAEP encryption size limits while
 * remaining unique enough to compare.
 */
export function hashUserAgent(userAgent: string): string {
	const hash = createHash("sha256");
	hash.update(userAgent, "utf8");
	return hash.digest("hex").substring(0, 32);
}
