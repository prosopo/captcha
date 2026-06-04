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
//
// Per-session DNS observation URL builder.
//
// Mirrors the HMAC path algorithm in the dns-event sidecar's Rust
// `hmac_path::derive` (see protect repo
// crates/dns-trap/src/hmac_path.rs). Both sides compute the same path
// from `(sessionId, secret)` so the sidecar can validate the request
// without per-session state and the URL looks like a random tracking
// pixel rather than a recognisable trap signature.

import { createHmac } from "node:crypto";

const EXTENSIONS = ["gif", "png", "webp"] as const;

/**
 * Returns `<dns_url>` for `sessionId` when the host has both
 * DNS_EVENT_SUBZONE and DNS_EVENT_HMAC_SECRET set (i.e. a dns-event
 * sidecar is deployed alongside this pronode). Returns undefined
 * otherwise — the response field on the wire is optional.
 *
 * The URL shape is
 *   https://{sessionId}.{subzone}/{hmac_hex}.{ext}?sid={sessionId}
 *
 * Subdomain carries sessionId so the auth DNS query (and therefore
 * the resolver source IP) can be attributed to the session. Path is
 * HMAC-SHA256(sessionId, secret)[:8] in hex + a deterministic
 * extension picked from the HMAC's 9th byte; query string is
 * decorative for the HTTP-side log.
 */
export const buildDnsEventUrl = (sessionId: string): string | undefined => {
	const subzone = process.env.DNS_EVENT_SUBZONE;
	const secret = process.env.DNS_EVENT_HMAC_SECRET;
	if (!subzone || !secret) {
		return undefined;
	}
	const path = derivePath(sessionId, secret);
	return `https://${sessionId}.${subzone}${path}?sid=${sessionId}`;
};

/**
 * The path-derivation core. Exported so the admin endpoint can validate
 * incoming events against the same HMAC if needed in future, and so the
 * unit test can pin the algorithm against the Rust implementation.
 */
export const derivePath = (sessionId: string, secret: string): string => {
	const mac = createHmac("sha256", secret);
	mac.update(sessionId);
	const digest = mac.digest();
	const name = digest.subarray(0, 8).toString("hex");
	const ext = EXTENSIONS[digest[8]! % EXTENSIONS.length];
	return `/${name}.${ext}`;
};
