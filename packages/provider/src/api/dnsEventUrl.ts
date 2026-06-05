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

import { createHmac } from "node:crypto";

const EXTENSIONS = ["gif", "png", "webp"] as const;

export const buildDnsEventUrl = (sessionId: string): string | undefined => {
	const subzone = process.env.DNS_EVENT_SUBZONE;
	const secret = process.env.DNS_EVENT_HMAC_SECRET;
	if (!subzone || !secret) {
		return undefined;
	}
	const path = derivePath(sessionId, secret);
	// Optional port override — used on hosts where Caddy already owns
	// 443 and the sidecar can't bind it directly. Omit for the
	// hide-in-plain-sight case (URL looks like a normal tracker).
	const port = process.env.DNS_EVENT_PORT;
	const host = port ? `${sessionId}.${subzone}:${port}` : `${sessionId}.${subzone}`;
	return `https://${host}${path}?sid=${sessionId}`;
};

// Mirrors the HMAC path algorithm in the dns sidecar
// (protect repo, crates/dns/src/hmac_path.rs). Any change must be made
// in both places; the sidecar's unit tests pin the byte-for-byte output.
export const derivePath = (sessionId: string, secret: string): string => {
	const mac = createHmac("sha256", secret);
	mac.update(sessionId);
	const digest = mac.digest();
	const name = digest.subarray(0, 8).toString("hex");
	const ext = EXTENSIONS[(digest.at(8) ?? 0) % EXTENSIONS.length];
	return `/${name}.${ext}`;
};
