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

import type { ApiJsonError } from "@prosopo/types";
import { ERROR_CODES, type ErrorCode } from "./errorCodes.js";

/**
 * Every throw site id, e.g. `PROV-12`. Each package declares its own in
 * `src/errorSites.ts` by augmenting this interface, so a typo is a type error.
 * Uniqueness across packages is checked by the `error-sites` unit test in
 * `@prosopo/scripts`, because declaration merging silently accepts duplicates.
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmented per package
export interface ErrorSites {}

export type ErrorSite = Extract<keyof ErrorSites, string>;

export type ErrorId<C extends string = ErrorCode> = `${C}:${ErrorSite}`;

export type ErrorOrigin = "BACKEND_ERROR" | "FRONTEND_ERROR";

export type ErrorContext = Readonly<Record<string, unknown>>;

export interface ProsopoErrorOptions<C extends ErrorCode> {
	readonly code: C;
	readonly errorSite: ErrorSite;
	/** Defaults to the code's English text. */
	readonly message?: string;
	readonly cause?: unknown;
	/** For logs only, never sent to a client. */
	readonly context?: ErrorContext;
	/** Sent to a client when the error is public. */
	readonly data?: ErrorContext;
	readonly status?: number;
	readonly public?: boolean;
}

const DEFAULT_STATUS = 500;

const frozenCopy = (value: ErrorContext | undefined): ErrorContext =>
	Object.freeze({ ...value });

/**
 * An immutable snapshot of a failure. It neither logs nor translates: whoever
 * catches it decides whether it is worth logging, and only a frontend
 * translates, by `code`.
 */
export class ProsopoError<C extends ErrorCode = ErrorCode> extends Error {
	readonly code: C;
	readonly errorSite: ErrorSite;
	readonly errorId: ErrorId<C>;
	readonly status: number;
	readonly isPublic: boolean;
	readonly context: ErrorContext;
	readonly data: ErrorContext;
	readonly cause: unknown;

	constructor(options: ProsopoErrorOptions<C>) {
		const definition: { message: string; status?: number; public?: boolean } =
			ERROR_CODES[options.code];
		super(options.message ?? definition.message);
		this.name = "ProsopoError";
		this.code = options.code;
		this.cause = options.cause;
		this.errorSite = options.errorSite;
		this.errorId = `${options.code}:${options.errorSite}`;
		this.status = options.status ?? definition.status ?? DEFAULT_STATUS;
		this.isPublic = options.public ?? definition.public ?? false;
		this.context = frozenCopy(options.context);
		this.data = frozenCopy(options.data);
		Object.freeze(this);
	}
}

/**
 * Narrows to a ProsopoError, optionally of the given codes. Checks the name as
 * well as the prototype, so an error from a second copy of this package (a
 * bundled widget beside a host page's copy) still matches.
 */
export function isProsopoError(err: unknown): err is ProsopoError;
export function isProsopoError<C extends ErrorCode>(
	err: unknown,
	...codes: readonly C[]
): err is ProsopoError<C>;
export function isProsopoError(
	err: unknown,
	...codes: readonly ErrorCode[]
): err is ProsopoError {
	const matches =
		err instanceof ProsopoError ||
		(err instanceof Error &&
			err.name === "ProsopoError" &&
			"errorSite" in err &&
			"code" in err);
	if (!matches) return false;
	return codes.length === 0 || codes.some((code) => code === err.code);
}

/**
 * The part of a zod error this module reads. Declared structurally so that
 * @prosopo/common, which is on the widget's critical path, does not import zod
 * — 14KB gzipped — for a type and an `instanceof`.
 */
export interface ZodLikeError {
	name: string;
	message: string;
	issues?: unknown[];
}

/**
 * Recognised by `name` rather than `instanceof`. The name is the only signal
 * that survives an error crossing a realm boundary or arriving from a second
 * copy of zod, both of which `instanceof` misses.
 */
export const isZodError = (err: unknown): err is ZodLikeError =>
	typeof err === "object" &&
	err !== null &&
	"name" in err &&
	err.name === "ZodError";

/**
 * A request body of up to 1MB can fail validation with one zod issue per array
 * element, i.e. tens of thousands of issues. Echoing or logging all of them
 * turned a 1MB request into a ~20MB response plus a multi-MB log line, built
 * synchronously on the event loop. Only the first few are reported.
 */
export const MAX_REPORTED_ISSUES = 10;

const parseIssues = (message: string): unknown => {
	try {
		return JSON.parse(message);
	} catch {
		return message;
	}
};

export const boundedIssues = (
	err: ZodLikeError,
): { issueCount: number; issues: unknown[] } => {
	// Prefer `issues`: zod builds `message` by serialising every issue.
	const all: unknown = Array.isArray(err.issues)
		? err.issues
		: parseIssues(err.message);
	if (!Array.isArray(all)) return { issueCount: 1, issues: [all] };
	return {
		issueCount: all.length,
		issues: all.slice(0, MAX_REPORTED_ISSUES),
	};
};

const MIN_CLIENT_ERROR = 400;
const MAX_CLIENT_ERROR = 499;

/**
 * body-parser and other http-errors raise a 4xx with `expose: true` for a
 * malformed request (bad JSON, too large, wrong charset).
 */
const clientHttpErrorStatus = (err: unknown): number | undefined => {
	if (typeof err !== "object" || err === null) return undefined;
	const status = "status" in err ? err.status : undefined;
	if (
		typeof status === "number" &&
		status >= MIN_CLIENT_ERROR &&
		status <= MAX_CLIENT_ERROR &&
		"expose" in err &&
		err.expose === true
	)
		return status;
	return undefined;
};

/**
 * Turns anything thrown into a ProsopoError: a ProsopoError is returned as is,
 * a zod error, a JSON SyntaxError or a 4xx http-error becomes INVALID_REQUEST,
 * anything else becomes UNEXPECTED at `fallbackSite`.
 */
export const toProsopoError = (
	err: unknown,
	fallbackSite: ErrorSite,
): ProsopoError => {
	if (isProsopoError(err)) return err;
	if (isZodError(err))
		return new ProsopoError({
			code: "INVALID_REQUEST",
			errorSite: fallbackSite,
			cause: err,
			data: boundedIssues(err),
		});
	const clientStatus = clientHttpErrorStatus(err);
	if (clientStatus !== undefined || err instanceof SyntaxError)
		return new ProsopoError({
			code: "INVALID_REQUEST",
			errorSite: fallbackSite,
			cause: err,
			status: clientStatus,
		});
	return new ProsopoError({
		code: "UNEXPECTED",
		errorSite: fallbackSite,
		cause: err,
	});
};

/**
 * What a client is allowed to see. A public error carries its code, message
 * and data; any other is reduced to the origin label and its site, enough for
 * a user to quote and for us to find the throw.
 */
export const toPublicError = (
	err: ProsopoError,
	origin: ErrorOrigin,
): ApiJsonError => {
	if (err.isPublic)
		return {
			code: err.code,
			errorId: err.errorId,
			status: err.status,
			message: err.message,
			...(Object.keys(err.data).length > 0 ? { data: { ...err.data } } : {}),
		};
	return {
		code: origin,
		errorId: `${origin}:${err.errorSite}`,
		status: err.status,
	};
};

export const toApiError = (
	err: unknown,
	fallbackSite: ErrorSite,
): { error: ProsopoError; status: number; body: { error: ApiJsonError } } => {
	const error = toProsopoError(err, fallbackSite);
	return {
		error,
		status: error.status,
		body: { error: toPublicError(error, "BACKEND_ERROR") },
	};
};

const MAX_CAUSE_DEPTH = 5;

export interface ErrorDescription {
	readonly name: string;
	readonly message: string;
	readonly code?: string;
	readonly errorId?: string;
	readonly status?: number;
	readonly context?: Readonly<Record<string, unknown>>;
	readonly data?: Readonly<Record<string, unknown>>;
	readonly issues?: { issueCount: number; issues: unknown[] };
	readonly stack?: string;
	readonly cause?: ErrorDescription | string;
}

const describeContext = (
	context: ErrorContext,
): Readonly<Record<string, unknown>> | undefined => {
	if (Object.keys(context).length === 0) return undefined;
	return Object.fromEntries(
		Object.entries(context).map(([key, value]) => [
			key,
			isZodError(value) ? boundedIssues(value) : value,
		]),
	);
};

/** A plain, bounded record of an error and its causes, for a log line. */
export const describeError = (
	err: unknown,
	depth = 0,
): ErrorDescription | string => {
	if (!(err instanceof Error)) return String(err);
	const cause: unknown = "cause" in err ? err.cause : undefined;
	const issues = isZodError(err) ? boundedIssues(err) : undefined;
	const described: ErrorDescription = {
		name: err.name,
		message: issues ? "Validation failed" : err.message,
		...(issues ? { issues } : {}),
		...(isProsopoError(err)
			? {
					code: err.code,
					errorId: err.errorId,
					status: err.status,
					context: describeContext(err.context),
					data: describeContext(err.data),
				}
			: {}),
		stack: err.stack,
		...(cause !== undefined && depth < MAX_CAUSE_DEPTH
			? { cause: describeError(cause, depth + 1) }
			: {}),
	};
	return described;
};

const SEVERE_STATUS = 500;

/** Whether an edge should log this error: faults, not a client's mistakes. */
export const isSevereError = (err: ProsopoError): boolean =>
	err.status >= SEVERE_STATUS;
