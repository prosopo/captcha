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
 * fetch wrappers that return a Result instead of throwing.
 *
 * fetch fails in two ways that are easy to handle only half of: it rejects on
 * network errors and aborts, but resolves normally on a 4xx or 5xx. Reading
 * the body can then fail too. FetchError covers all of these, with `kind`
 * saying which one happened.
 */

import { type Result, err, ok } from "@prosopo/result";
import { type ParseJsonOptions, parseJson } from "./parse.js";

export type FetchErrorKind = "network" | "timeout" | "status" | "body" | "json";

/** Longest response body kept on an error, so a huge page can't flood logs. */
const BODY_PREVIEW_LENGTH = 500;

export type FetchErrorDetails = {
	status?: number;
	body?: string;
	cause?: unknown;
};

export class FetchError extends Error {
	readonly kind: FetchErrorKind;
	readonly url: string;
	/** Only set once the server has responded. */
	readonly status: number | undefined;
	/** Start of the response body, for "status" and "json" failures. */
	readonly body: string | undefined;
	/** Declared here because the shared tsconfig's lib predates ES2022's Error.cause. */
	readonly cause: unknown;

	constructor(
		kind: FetchErrorKind,
		url: string,
		reason: string,
		details: FetchErrorDetails = {},
	) {
		super(`fetch ${url} failed (${kind}): ${reason}`);
		this.name = "FetchError";
		this.kind = kind;
		this.url = url;
		this.status = details.status;
		this.body = details.body?.slice(0, BODY_PREVIEW_LENGTH);
		this.cause = details.cause;
	}
}

export type FetchResult<T> = Result<T, FetchError>;

const describe = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

const isTimeout = (error: unknown): boolean =>
	error instanceof Error &&
	(error.name === "TimeoutError" || error.name === "AbortError");

const urlOf = (input: RequestInfo | URL): string =>
	input instanceof Request ? input.url : String(input);

/** The body of a failed response is diagnostic only, so unreadable is fine. */
const readBodyPreview = async (
	response: Response,
): Promise<string | undefined> => {
	try {
		return await response.text();
	} catch {
		return undefined;
	}
};

/**
 * Runs fetch, failing on network errors, timeouts and non-2xx responses. Use
 * fetchResponse instead when a non-2xx status is an expected answer.
 */
export const safeFetch = async (
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<FetchResult<Response>> => {
	const response = await fetchResponse(input, init);
	if (!response.ok || response.value.ok) {
		return response;
	}
	const { status, statusText } = response.value;
	return err(
		new FetchError("status", urlOf(input), `${status} ${statusText}`.trim(), {
			status,
			body: await readBodyPreview(response.value),
		}),
	);
};

/** Runs fetch, failing only when no response arrived. */
export const fetchResponse = async (
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<FetchResult<Response>> => {
	try {
		return ok(await fetch(input, init));
	} catch (cause) {
		return err(
			new FetchError(
				isTimeout(cause) ? "timeout" : "network",
				urlOf(input),
				describe(cause),
				{ cause },
			),
		);
	}
};

/** safeFetch, then the body as text. */
export const fetchText = async (
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<FetchResult<string>> => {
	const response = await safeFetch(input, init);
	if (!response.ok) {
		return err(response.error);
	}
	const { status } = response.value;
	try {
		return ok(await response.value.text());
	} catch (cause) {
		return err(
			new FetchError(
				isTimeout(cause) ? "timeout" : "body",
				urlOf(input),
				describe(cause),
				{ status, cause },
			),
		);
	}
};

/**
 * safeFetch, then the body parsed with parseJson, so bigints survive. The type
 * parameter is not checked at runtime: validate untrusted responses.
 */
export const fetchJson = async <T = unknown>(
	input: RequestInfo | URL,
	init?: RequestInit,
	options?: ParseJsonOptions,
): Promise<FetchResult<T>> => {
	const text = await fetchText(input, init);
	if (!text.ok) {
		return err(text.error);
	}
	const parsed = parseJson(text.value, options);
	return parsed.ok
		? ok(parsed.value as T)
		: err(
				new FetchError("json", urlOf(input), parsed.error.message, {
					body: text.value,
					cause: parsed.error,
				}),
			);
};
