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
import { type ZodTypeAny, array, custom, type input, string } from "zod";
import { INPUT_LIMITS } from "./inputLimits.js";

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

/**
 * An array capped at `max` elements. The length is checked before any element
 * is parsed: `array().max()` alone still validates every element, so a huge
 * array of invalid items produces one issue per item before the cap rejects it.
 */
export const boundedArray = <T extends ZodTypeAny>(item: T, max: number) =>
	custom<input<T>[]>(
		(value: unknown) => !Array.isArray(value) || value.length <= max,
		{ message: `Array must contain at most ${max} element(s)` },
	).pipe(array(item).max(max));
