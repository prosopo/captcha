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

// Minimal RFC 8941 Structured Fields parser — only the subset needed to
// interpret Web Bot Auth's three headers:
//
//   Signature-Input: sig1=("@authority" "signature-agent");created=1;expires=2;keyid="k";alg="ed25519";tag="web-bot-auth"
//   Signature:       sig1=:base64bytes:
//   Signature-Agent: (see parseSignatureAgent.ts)
//
// Web Bot Auth uses a single signature label per request. Multi-signature
// dictionaries are legal in RFC 9421 but outside the profile's scope; the
// parser accepts the first entry and ignores the rest with a note.

import { decodeBase64 } from "./base64.js";

export type ParamValue = string | number | boolean | Uint8Array;

export type SignatureInputEntry = {
	label: string;
	// Ordered list of covered component identifiers, quotes stripped
	// (e.g. ["@authority", "signature-agent"]).
	coveredComponents: string[];
	params: Record<string, ParamValue>;
	// The raw "(...);params" substring — reused verbatim as the
	// @signature-params value when reconstructing the signature base, so
	// the caller doesn't need to re-serialise structured fields.
	serialisedValue: string;
};

// Find the position of the first non-quote character `ch` outside any
// double-quoted string. RFC 8941 allows backslash-escaping of " and \ inside
// strings; anything else terminates a param entry. Not usable for finding
// `"` itself — quotes toggle state, they never match. Callers looking for a
// closing quote use `indexOf('"', from)` directly, which is safe because
// Web Bot Auth's tokens never contain backslash-escaped quotes.
const findUnquoted = (s: string, ch: string, from: number): number => {
	if (ch === '"') {
		throw new Error("findUnquoted cannot search for '\"' — use indexOf");
	}
	let inString = false;
	for (let i = from; i < s.length; i++) {
		const c = s[i];
		if (inString) {
			if (c === "\\" && i + 1 < s.length) {
				i++;
				continue;
			}
			if (c === '"') inString = false;
			continue;
		}
		if (c === '"') {
			inString = true;
			continue;
		}
		if (c === ch) return i;
	}
	return -1;
};

const unquote = (raw: string): string => {
	if (
		raw.length < 2 ||
		raw.charCodeAt(0) !== 0x22 ||
		raw.charCodeAt(raw.length - 1) !== 0x22
	) {
		throw new Error(`not a quoted string: ${raw}`);
	}
	return raw.slice(1, -1).replace(/\\(.)/g, "$1");
};

const parseParamValue = (raw: string): ParamValue => {
	const trimmed = raw.trim();
	if (trimmed.length === 0) return true; // boolean shorthand: `;key` means true
	if (trimmed.startsWith('"')) return unquote(trimmed);
	if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
		return decodeBase64(trimmed.slice(1, -1));
	}
	if (trimmed === "?1") return true;
	if (trimmed === "?0") return false;
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
	// Token (tchar+) — return as-is. RFC 8941 permits unquoted tokens; some
	// implementations emit `alg=ed25519` without quotes.
	return trimmed;
};

// Splits "(...);p1=v1;p2=v2" into ["(...)", "p1=v1", "p2=v2"] respecting
// quoted strings. The first element is always the value; the rest are params.
const splitEntry = (value: string): [string, string[]] => {
	let inner: string;
	let cursor: number;
	const first = value.trimStart();
	if (first.startsWith("(")) {
		const closeIdx = findUnquoted(value, ")", value.indexOf("(") + 1);
		if (closeIdx === -1) throw new Error("unterminated inner list");
		inner = value.slice(value.indexOf("("), closeIdx + 1);
		cursor = closeIdx + 1;
	} else if (first.startsWith('"')) {
		const openIdx = value.indexOf('"');
		const closeIdx = value.indexOf('"', openIdx + 1);
		if (closeIdx === -1) throw new Error("unterminated quoted string");
		inner = value.slice(openIdx, closeIdx + 1);
		cursor = closeIdx + 1;
	} else {
		// Bare token or byte-sequence — read until first `;`.
		const semi = findUnquoted(value, ";", 0);
		if (semi === -1) return [value.trim(), []];
		inner = value.slice(0, semi).trim();
		cursor = semi;
	}
	const params: string[] = [];
	while (cursor < value.length) {
		if (value[cursor] === ";") {
			const next = findUnquoted(value, ";", cursor + 1);
			const end = next === -1 ? value.length : next;
			const p = value.slice(cursor + 1, end).trim();
			if (p.length > 0) params.push(p);
			cursor = end;
		} else {
			cursor++;
		}
	}
	return [inner, params];
};

const parseParams = (entries: string[]): Record<string, ParamValue> => {
	const out: Record<string, ParamValue> = {};
	for (const entry of entries) {
		const eq = findUnquoted(entry, "=", 0);
		if (eq === -1) {
			out[entry.trim()] = true;
		} else {
			const key = entry.slice(0, eq).trim();
			const val = entry.slice(eq + 1).trim();
			out[key] = parseParamValue(val);
		}
	}
	return out;
};

const parseCoveredComponents = (innerList: string): string[] => {
	// innerList looks like `("@authority" "signature-agent")`. Split on
	// whitespace between quoted items and strip the quotes. Ignores any
	// per-item parameters (Web Bot Auth doesn't use them).
	const inside = innerList.trim().replace(/^\(/, "").replace(/\)$/, "");
	const items: string[] = [];
	let i = 0;
	while (i < inside.length) {
		while (i < inside.length && /\s/.test(inside[i] ?? "")) i++;
		if (i >= inside.length) break;
		if (inside[i] === '"') {
			const end = inside.indexOf('"', i + 1);
			if (end === -1) throw new Error("unterminated quoted item");
			items.push(unquote(inside.slice(i, end + 1)));
			i = end + 1;
			// Skip any per-item parameters up to next whitespace
			while (i < inside.length && !/\s/.test(inside[i] ?? "")) i++;
		} else {
			// Unquoted token
			let end = i;
			while (end < inside.length && !/\s/.test(inside[end] ?? "")) end++;
			items.push(inside.slice(i, end));
			i = end;
		}
	}
	return items;
};

// Splits an RFC 8941 dictionary on top-level commas. Web Bot Auth requests
// carry a single entry today, but this keeps the parser correct for the
// multi-label case.
const splitDictEntries = (header: string): string[] => {
	const entries: string[] = [];
	let start = 0;
	while (start < header.length) {
		const comma = findUnquoted(header, ",", start);
		const end = comma === -1 ? header.length : comma;
		const raw = header.slice(start, end).trim();
		if (raw.length > 0) entries.push(raw);
		start = end + 1;
	}
	return entries;
};

const parseFirstDictEntry = (
	header: string,
): { label: string; rawValue: string } | null => {
	const entries = splitDictEntries(header);
	const first = entries[0];
	if (!first) return null;
	const eq = findUnquoted(first, "=", 0);
	if (eq === -1) return null;
	return {
		label: first.slice(0, eq).trim(),
		rawValue: first.slice(eq + 1).trim(),
	};
};

export const parseSignatureInput = (
	header: string,
): SignatureInputEntry | null => {
	const first = parseFirstDictEntry(header);
	if (!first) return null;
	try {
		const [innerList, params] = splitEntry(first.rawValue);
		if (!innerList.startsWith("(")) return null;
		return {
			label: first.label,
			coveredComponents: parseCoveredComponents(innerList),
			params: parseParams(params),
			serialisedValue: first.rawValue,
		};
	} catch {
		return null;
	}
};

export const parseSignature = (
	header: string,
	expectedLabel: string,
): Uint8Array | null => {
	const first = parseFirstDictEntry(header);
	if (!first || first.label !== expectedLabel) return null;
	const raw = first.rawValue.trim();
	if (!raw.startsWith(":") || !raw.endsWith(":")) return null;
	try {
		return decodeBase64(raw.slice(1, -1));
	} catch {
		return null;
	}
};
