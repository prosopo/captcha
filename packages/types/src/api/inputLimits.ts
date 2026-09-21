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
// Deliberately free of imports. `INPUT_LIMITS` is read by widget code on the
// critical path, and living alongside the zod builders in `sanitise.ts` put
// the whole of zod there with it.

/**
 * Centralised input length limits for request payloads. Generous enough not to
 * reject legitimate input, but bounded so an oversized field cannot bloat
 * storage, logs, downstream API calls, or act as a cheap DoS vector. The
 * express body-size cap (provider startProviderApi.ts) is the coarse backstop;
 * these are the per-field limits.
 */
export const INPUT_LIMITS = {
	/** Identifiers, keys, slugs (accounts, site keys, dataset ids, …). */
	ID: 256,
	/** Names, labels, titles. */
	NAME: 256,
	/** Email addresses (treated as opaque strings — no format validation). */
	EMAIL: 320,
	/** URLs. */
	URL: 2048,
	/** General short freetext. Default for `boundedString` / `safeText`. */
	TEXT: 16384,
	/** Longer freetext: messages, descriptions, decision-machine source. */
	LONG_TEXT: 65536,
	/** Tokens, signatures, base64 payloads, behavioural/simd readings. */
	TOKEN: 131072,
} as const;
