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
import { stringifyJson } from "@prosopo/util";
import { HttpError } from "./HttpError.js";

// JSON.stringify throws on a bigint; send it as a decimal string instead.
// An undefined body stays undefined, as JSON.stringify would leave it.
const jsonBody = (body: unknown): string | undefined =>
	body === undefined ? undefined : stringifyJson(body).expect("request body");

export class HttpClientBase {
	protected readonly baseURL: string;
	// Undefined keeps the platform default, which for undici is ~300s of
	// silence before a stalled request fails.
	protected readonly timeoutMs: number | undefined;
	// Sent with every request, under any headers the call itself passes. The
	// widget puts its language here (languageHeaders in @prosopo/locale).
	protected readonly defaultHeaders: Readonly<Record<string, string>>;

	constructor(
		baseURL: string,
		prefix = "",
		timeoutMs?: number,
		defaultHeaders: Readonly<Record<string, string>> = {},
	) {
		this.baseURL = baseURL + prefix;
		this.timeoutMs = timeoutMs;
		this.defaultHeaders = defaultHeaders;
	}

	// Plain objects, not a Headers instance, so header names keep their case
	// for callers and tests that read them back.
	protected withDefaultHeaders(init?: RequestInit): RequestInit | undefined {
		if (Object.keys(this.defaultHeaders).length === 0) {
			return init;
		}
		return {
			...init,
			headers: { ...this.defaultHeaders, ...(init?.headers || {}) },
		};
	}

	// The signal stays attached while the body is read, so a server that sends
	// headers and then stalls is cut off too.
	protected withTimeout(init?: RequestInit): RequestInit | undefined {
		if (this.timeoutMs === undefined) {
			return init;
		}
		const timeout = AbortSignal.timeout(this.timeoutMs);
		const signal = init?.signal
			? AbortSignal.any([init.signal, timeout])
			: timeout;
		return { ...init, signal };
	}

	protected async fetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
		try {
			const response = await fetch(
				this.baseURL + input,
				this.withTimeout(this.withDefaultHeaders(init)),
			);
			if (
				!response.ok &&
				// Only throw an error if the response is not JSON and not a 400 error
				response.status !== 400 &&
				!response.headers.get("content-type")?.includes("application/json")
			) {
				throw new HttpError(response.status, response.statusText, response.url);
			}
			return this.responseHandler<T>(response);
		} catch (error) {
			return this.errorHandler(error as Error);
		}
	}

	protected async post<T, U>(
		input: RequestInfo,
		body: U,
		init?: RequestInit,
	): Promise<T> {
		const headers = {
			"Content-Type": "application/json",
			...this.defaultHeaders,
			...(init?.headers || {}),
		};
		try {
			const response = await fetch(
				this.baseURL + input,
				this.withTimeout({
					method: "POST",
					body: jsonBody(body),
					...init,
					headers,
				}),
			);
			if (
				!response.ok &&
				// Only throw an error if the response is not JSON and not a 400 error
				response.status !== 400 &&
				!response.headers.get("content-type")?.includes("application/json")
			) {
				throw new HttpError(response.status, response.statusText, response.url);
			}
			return this.responseHandler<T>(response);
		} catch (error) {
			return this.errorHandler(error as Error);
		}
	}

	// Like `post`, but also surfaces the response Headers so callers can read
	// values delivered out-of-band (e.g. the honeypot meta header). The body
	// is still parsed as JSON.
	protected async postWithHeaders<T, U>(
		input: RequestInfo,
		body: U,
		init?: RequestInit,
	): Promise<{ data: T; headers: Headers }> {
		const headers = {
			"Content-Type": "application/json",
			...this.defaultHeaders,
			...(init?.headers || {}),
		};
		try {
			const response = await fetch(
				this.baseURL + input,
				this.withTimeout({
					method: "POST",
					body: jsonBody(body),
					...init,
					headers,
				}),
			);
			if (
				!response.ok &&
				response.status !== 400 &&
				!response.headers.get("content-type")?.includes("application/json")
			) {
				throw new HttpError(response.status, response.statusText, response.url);
			}
			const data = await this.responseHandler<T>(response);
			return { data, headers: response.headers };
		} catch (error) {
			return this.errorHandler(error as Error);
		}
	}

	protected async responseHandler<T>(response: Response): Promise<T> {
		try {
			return await response.json();
		} catch (error) {
			console.error("Error parsing JSON:", error);
			throw error;
		}
	}

	protected errorHandler(error: Error): Promise<never> {
		if (error instanceof HttpError) {
			console.error("HTTP error:", error);
		} else {
			console.error("API request error:", error);
		}
		return Promise.reject(error);
	}
}

export default HttpClientBase;
