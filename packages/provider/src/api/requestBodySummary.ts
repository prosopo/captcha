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
import type { IncomingHttpHeaders } from "node:http";

// Request bodies can be up to the express.json limit (1MB) and carry tokens,
// signatures and other client secrets, so logs get a bounded, redacted
// summary instead of the body itself.

const SENSITIVE_KEY =
	/signature|token|secret|proof|procaptcha|salt|mnemonic|password|email|behavioral|detectorKey|^ip$/i;
const REDACTED = "[redacted]";
const MAX_DEPTH = 3;
const MAX_KEYS = 20;
const MAX_ARRAY_ITEMS = 5;
const MAX_STRING_CHARS = 64;
export const MAX_PREVIEW_CHARS = 512;

export type RequestBodySummary = {
	type: string;
	bytes?: number;
	keys?: string[];
	keyCount?: number;
	preview: string;
};

const truncateString = (value: string): string =>
	value.length > MAX_STRING_CHARS
		? `${value.slice(0, MAX_STRING_CHARS)}...(+${value.length - MAX_STRING_CHARS} chars)`
		: value;

const redact = (value: unknown, depth: number): unknown => {
	if (typeof value === "string") {
		return truncateString(value);
	}
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (depth >= MAX_DEPTH) {
		return Array.isArray(value) ? `[array(${value.length})]` : "[object]";
	}
	if (Array.isArray(value)) {
		const items = value
			.slice(0, MAX_ARRAY_ITEMS)
			.map((item) => redact(item, depth + 1));
		return value.length > MAX_ARRAY_ITEMS
			? [...items, `...(+${value.length - MAX_ARRAY_ITEMS} items)`]
			: items;
	}
	const entries = Object.entries(value);
	const out: Record<string, unknown> = {};
	for (const [key, child] of entries.slice(0, MAX_KEYS)) {
		out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(child, depth + 1);
	}
	if (entries.length > MAX_KEYS) {
		out["..."] = `+${entries.length - MAX_KEYS} keys`;
	}
	return out;
};

const contentLength = (headers: IncomingHttpHeaders): number | undefined => {
	const bytes = Number(headers["content-length"]);
	return Number.isFinite(bytes) ? bytes : undefined;
};

export const summariseRequestBody = (req: {
	body?: unknown;
	headers: IncomingHttpHeaders;
}): RequestBodySummary => {
	const { body } = req;
	const type =
		body === null ? "null" : Array.isArray(body) ? "array" : typeof body;
	const bytes = contentLength(req.headers);
	const preview = (JSON.stringify(redact(body, 0)) ?? "").slice(
		0,
		MAX_PREVIEW_CHARS,
	);
	if (type !== "object" || body === null || body === undefined) {
		return { type, ...(bytes !== undefined && { bytes }), preview };
	}
	const keys = Object.keys(body);
	return {
		type,
		...(bytes !== undefined && { bytes }),
		keys: keys.slice(0, MAX_KEYS),
		keyCount: keys.length,
		preview,
	};
};
