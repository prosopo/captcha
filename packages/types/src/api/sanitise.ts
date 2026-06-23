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
import { string } from "zod";

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

// Anchored negated character classes: a string is valid only if it contains
// NONE of these. Implemented as a `.regex()` (rather than `.refine()`) so the
// result stays a `ZodString` and callers can still chain `.min()` / `.max()`.
// C0 control chars + DEL (U+007F) are rejected; tab/newline/carriage-return are
// allowed in safeText. C1 (U+0080–U+009F) is intentionally not rejected, to
// avoid false positives on legitimate international text.
// biome-ignore lint/suspicious/noControlCharactersInRegex: deliberately matching control chars in order to reject them
const NO_CONTROL_CHARS = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]*$/;
// Single-line variant: additionally rejects tab/CR/LF.
// biome-ignore lint/suspicious/noControlCharactersInRegex: deliberately matching control chars in order to reject them
const NO_CONTROL_OR_NEWLINE = /^[^\u0000-\u001f\u007f]*$/;

/**
 * A length-bounded string. Use for structured values (ids, keys, tokens) where
 * the character set is already constrained by format.
 */
export const boundedString = (max: number = INPUT_LIMITS.TEXT) =>
	string().max(max);

/**
 * Length-bounded freetext that rejects control characters (null bytes etc.).
 * Use for human-entered, multi-line text (messages, descriptions). Typing the
 * field as a string already blocks Mongo operator injection (an object such as
 * `{$gt:…}` fails the string check); this additionally rejects the control
 * characters used for log/terminal injection.
 */
export const safeText = (max: number = INPUT_LIMITS.TEXT) =>
	string()
		.max(max)
		.regex(NO_CONTROL_CHARS, "must not contain control characters");

/**
 * Single-line variant of {@link safeText}: also rejects line breaks. Use for
 * short freetext that flows into headers/subjects (names, titles) to prevent
 * header injection.
 */
export const safeLine = (max: number = INPUT_LIMITS.NAME) =>
	string()
		.max(max)
		.regex(
			NO_CONTROL_OR_NEWLINE,
			"must not contain control characters or line breaks",
		);
