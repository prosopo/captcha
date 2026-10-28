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

/**
 * Parsers for untrusted text — JSON, numbers, bigints, dates — that return a
 * Result instead of throwing or quietly producing NaN / Invalid Date.
 *
 * The built-ins fail in ways that are easy to miss:
 * - JSON.parse throws on bad input, and silently rounds integers past 2^53.
 * - JSON.stringify throws on bigints and cycles, and returns undefined (not a
 *   string) for undefined, functions and symbols.
 * - parseInt("12abc") is 12, Number("") is 0, Number("abc") is NaN.
 * - BigInt("1.5") and BigInt(1.5) throw.
 * - new Date("nonsense") is an Invalid Date whose getTime() is NaN.
 *
 * Callers pick the failure mode: `.unwrapOr(fallback)` where a default is
 * genuinely fine, `.expect("what was being parsed")` to fail loudly, or branch
 * on `.ok` to report the error.
 */

import { type Result, err, ok } from "@prosopo/result";

export type ParseErrorKind =
	| "json"
	| "stringify"
	| "number"
	| "integer"
	| "bigint"
	| "date";

/** Longest input echoed into an error, so a huge payload can't flood logs. */
const INPUT_PREVIEW_LENGTH = 100;

const preview = (input: unknown): string => {
	let text: string;
	try {
		text = typeof input === "string" ? input : String(input);
	} catch {
		// String() throws on objects with a throwing toString and on symbols
		// inside template literals; the preview is best-effort.
		text = Object.prototype.toString.call(input);
	}
	return text.length > INPUT_PREVIEW_LENGTH
		? `${text.slice(0, INPUT_PREVIEW_LENGTH)}…`
		: text;
};

/**
 * Why a value could not be parsed. Extends Error so it logs with a message and
 * stack, and so `.unwrap()` / `.expect()` surface it as the cause.
 */
export class ParseError extends Error {
	readonly kind: ParseErrorKind;
	/** The offending input, truncated to INPUT_PREVIEW_LENGTH characters. */
	readonly input: string;
	/**
	 * What the underlying API threw, if anything. Declared here because the
	 * shared tsconfig's lib predates ES2022's Error.cause.
	 */
	readonly cause: unknown;

	constructor(
		kind: ParseErrorKind,
		input: unknown,
		reason: string,
		cause?: unknown,
	) {
		const shown = preview(input);
		super(`cannot parse ${kind} from "${shown}": ${reason}`);
		this.cause = cause;
		this.name = "ParseError";
		this.kind = kind;
		this.input = shown;
	}
}

export type ParseResult<T> = Result<T, ParseError>;

export type BigIntJsonMode =
	/** Integers outside ±(2^53 - 1) become bigint, keeping every digit. */
	| "bigint"
	/** Integers outside ±(2^53 - 1) become their exact decimal string. */
	| "string"
	/** JSON.parse's behaviour: the nearest double, losing precision. */
	| "number";

export type ParseJsonOptions = {
	/** How to read integer literals too large for a double. Default "bigint". */
	bigints?: BigIntJsonMode;
};

/** Third reviver argument, from the JSON.parse source text access proposal. */
type ReviverContext = { source?: string };

const INTEGER_LITERAL = /^-?\d+$/;

/**
 * JSON.parse that returns a Result instead of throwing, and keeps integers
 * past Number.MAX_SAFE_INTEGER exact (as bigint by default).
 *
 * Exactness needs the reviver's source-text argument: Node 21+, Chrome 114+,
 * Firefox 135+. Where it is missing the value is the rounded number, as
 * JSON.parse would give, rather than an error.
 */
export const parseJson = (
	text: string,
	options: ParseJsonOptions = {},
): ParseResult<unknown> => {
	const mode = options.bigints ?? "bigint";
	const reviver = (
		_key: string,
		value: unknown,
		context?: ReviverContext,
	): unknown => {
		if (
			mode === "number" ||
			typeof value !== "number" ||
			Number.isSafeInteger(value)
		) {
			return value;
		}
		const source = context?.source;
		// 1e300 and 1.5 are not integer literals: leave them as numbers.
		if (source === undefined || !INTEGER_LITERAL.test(source)) {
			return value;
		}
		return mode === "bigint" ? BigInt(source) : source;
	};
	try {
		return ok(JSON.parse(text, reviver));
	} catch (error) {
		return err(
			new ParseError(
				"json",
				text,
				error instanceof Error ? error.message : String(error),
				error,
			),
		);
	}
};

/**
 * JSON.stringify that returns a Result instead of throwing. Bigints become
 * decimal strings (as stringifyBigInts does), so values parsed by parseJson
 * with the default options can always be written back out. Cycles and
 * values JSON cannot represent at the top level (undefined, functions,
 * symbols) are errors.
 */
export const stringifyJson = (
	value: unknown,
	space?: string | number,
): ParseResult<string> => {
	try {
		const text = JSON.stringify(
			value,
			(_key, entry: unknown) =>
				typeof entry === "bigint" ? entry.toString() : entry,
			space,
		);
		// JSON.stringify's typings say string, but undefined, functions and
		// symbols at the top level produce undefined.
		if (typeof text !== "string") {
			return err(
				new ParseError(
					"stringify",
					typeof value,
					"value has no JSON representation",
				),
			);
		}
		return ok(text);
	} catch (error) {
		return err(
			new ParseError(
				"stringify",
				typeof value,
				error instanceof Error ? error.message : String(error),
				error,
			),
		);
	}
};

export type NumberBounds = {
	/** Inclusive lower bound. */
	min?: number;
	/** Inclusive upper bound. */
	max?: number;
};

const checkBounds = (
	kind: ParseErrorKind,
	input: unknown,
	value: number,
	{ min, max }: NumberBounds,
): ParseResult<number> => {
	if (min !== undefined && value < min) {
		return err(new ParseError(kind, input, `below minimum ${min}`));
	}
	if (max !== undefined && value > max) {
		return err(new ParseError(kind, input, `above maximum ${max}`));
	}
	return ok(value);
};

export type NumericInput = string | number | null | undefined;

/**
 * A finite number from a string or number. Unlike Number(), the empty or
 * whitespace-only string is an error rather than 0, and NaN / ±Infinity are
 * errors rather than values. Accepts everything else Number() does, e.g.
 * "1e3", " 4.5 ", "0x10".
 */
export const parseNumber = (
	input: NumericInput,
	bounds: NumberBounds = {},
): ParseResult<number> => {
	if (input === null || input === undefined) {
		return err(new ParseError("number", input, "missing"));
	}
	if (typeof input === "string" && input.trim() === "") {
		return err(new ParseError("number", input, "empty"));
	}
	const value = typeof input === "number" ? input : Number(input);
	if (!Number.isFinite(value)) {
		return err(new ParseError("number", input, "not a finite number"));
	}
	return checkBounds("number", input, value, bounds);
};

export type ParseIntegerOptions = NumberBounds & {
	/** 10 (default) or 16. Hex input may carry a 0x prefix. */
	radix?: 10 | 16;
};

const INTEGER_PATTERNS: Record<10 | 16, RegExp> = {
	10: /^[+-]?\d+$/,
	16: /^[+-]?(0x)?[0-9a-f]+$/i,
};

/**
 * A safe integer from a string or number. Unlike parseInt, the whole string
 * must be the integer: "12abc", "1.5", "1e3" and "" are errors, not 12, 1,
 * 1 and NaN. Values beyond ±(2^53 - 1) are errors since they cannot be held
 * exactly; use parseBigInt for those.
 */
export const parseInteger = (
	input: NumericInput,
	options: ParseIntegerOptions = {},
): ParseResult<number> => {
	const radix = options.radix ?? 10;
	if (input === null || input === undefined) {
		return err(new ParseError("integer", input, "missing"));
	}
	let value: number;
	if (typeof input === "number") {
		value = input;
	} else {
		const trimmed = input.trim();
		if (!INTEGER_PATTERNS[radix].test(trimmed)) {
			return err(
				new ParseError("integer", input, `not a base-${radix} integer`),
			);
		}
		// parseInt rejects a sign before 0x, so strip the sign first.
		const negative = trimmed.startsWith("-");
		const digits = trimmed.replace(/^[+-]/, "").replace(/^0x/i, "");
		value = Number.parseInt(digits, radix) * (negative ? -1 : 1);
	}
	if (!Number.isSafeInteger(value)) {
		return err(
			new ParseError(
				"integer",
				input,
				Number.isInteger(value)
					? "outside the safe integer range"
					: "not an integer",
			),
		);
	}
	// -0 from "-0" is still zero; normalise so callers never see it.
	return checkBounds("integer", input, value === 0 ? 0 : value, options);
};

/**
 * A bigint from a string, number or bigint. Unlike BigInt(), never throws:
 * non-integers ("1.5", 1.5), NaN and non-numeric strings are errors.
 * Accepts what BigInt() does for strings, including "0x" / "0o" / "0b"
 * prefixes and surrounding whitespace; the empty string is an error rather
 * than 0n.
 */
export const parseBigInt = (
	input: string | number | bigint | null | undefined,
): ParseResult<bigint> => {
	if (input === null || input === undefined) {
		return err(new ParseError("bigint", input, "missing"));
	}
	if (typeof input === "bigint") {
		return ok(input);
	}
	if (typeof input === "string" && input.trim() === "") {
		return err(new ParseError("bigint", input, "empty"));
	}
	if (typeof input === "number" && !Number.isInteger(input)) {
		return err(new ParseError("bigint", input, "not an integer"));
	}
	try {
		return ok(BigInt(input));
	} catch (error) {
		return err(
			new ParseError(
				"bigint",
				input,
				error instanceof Error ? error.message : String(error),
				error,
			),
		);
	}
};

/**
 * A valid Date from a Date, epoch milliseconds or a date string. Unlike
 * new Date(), an unparseable input is an error, not an Invalid Date that
 * later throws from toISOString() or compares false against everything.
 * A numeric string is read as epoch milliseconds, since `new Date("1700000000000")`
 * would otherwise be Invalid Date.
 */
export const parseDate = (
	input: string | number | Date | null | undefined,
): ParseResult<Date> => {
	if (input === null || input === undefined) {
		return err(new ParseError("date", input, "missing"));
	}
	if (typeof input === "string" && input.trim() === "") {
		return err(new ParseError("date", input, "empty"));
	}
	const date =
		input instanceof Date
			? new Date(input.getTime())
			: typeof input === "string" && INTEGER_LITERAL.test(input.trim())
				? new Date(Number(input.trim()))
				: new Date(input);
	if (Number.isNaN(date.getTime())) {
		return err(new ParseError("date", input, "invalid date"));
	}
	return ok(date);
};
