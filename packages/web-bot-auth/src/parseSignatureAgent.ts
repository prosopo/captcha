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

// Two Signature-Agent header forms are seen in production today:
//
//   Bare quoted string (draft ≤ 03, still what OpenAI ships):
//     Signature-Agent: "https://chatgpt.com"
//
//   Structured Fields dictionary (draft-meunier-web-bot-auth-04+, what Google
//   ships as of 2026):
//     Signature-Agent: g="https://agent.bot.goog"
//
// The verifier accepts either. When the dictionary form carries multiple
// entries the first one wins; the spec doesn't define ordering and no live
// deployment ships more than one entry yet.

const BARE_QUOTED = /^"(https?:\/\/[^"]+)"$/;
const DICT_ENTRY = /^\s*[a-zA-Z][a-zA-Z0-9_-]*="(https?:\/\/[^"]+)"/;

// Canonicalise per Cloudflare's Web Bot Auth reference implementation
// (lowercase scheme + host, no trailing slash) so downstream string equality
// works against `userAttributesInput.webBotAuthAgent`, which normalises the
// same way at rule-authoring time.
export const normaliseSignatureAgentUrl = (raw: string): string => {
	const url = new URL(raw);
	url.hostname = url.hostname.toLowerCase();
	url.protocol = url.protocol.toLowerCase();
	if (url.pathname === "/") url.pathname = "";
	return url.toString().replace(/\/$/, "");
};

export const parseSignatureAgentHeader = (raw: string): string | null => {
	const trimmed = raw.trim();
	const bare = BARE_QUOTED.exec(trimmed);
	if (bare?.[1]) return normaliseSignatureAgentUrl(bare[1]);
	const dict = DICT_ENTRY.exec(trimmed);
	if (dict?.[1]) return normaliseSignatureAgentUrl(dict[1]);
	return null;
};
