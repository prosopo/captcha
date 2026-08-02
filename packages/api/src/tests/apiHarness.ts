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

import { POW_SEPARATOR, type PoWChallengeId } from "@prosopo/types";
import { vi } from "vitest";

export interface RecordedRequest {
	url: string;
	init: RequestInit | undefined;
	body: unknown;
	headers: Record<string, string>;
}

export interface FetchStub {
	/** Every request the client made, in order. */
	requests: RecordedRequest[];
	/** The single request, when a test only makes one. */
	last: () => RecordedRequest;
	/** Resolve the next (and every subsequent) call with this body. */
	respond: (body: unknown, init?: ResponseInit) => void;
	/** Resolve the next call only; later calls fall back to the default. */
	respondOnce: (body: unknown, init?: ResponseInit) => void;
	/** Reject the next (and every subsequent) call, as a network failure does. */
	fail: (error: Error) => void;
	/** Hand control of the next call's outcome to the test. */
	defer: () => { resolve: (body: unknown) => void; reject: (e: Error) => void };
	restore: () => void;
}

const headersOf = (init: RequestInit | undefined): Record<string, string> => {
	const headers = init?.headers;
	if (!headers) return {};
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return { ...headers };
};

const parseBody = (init: RequestInit | undefined): unknown => {
	const body = init?.body;
	if (typeof body !== "string") return undefined;
	try {
		return JSON.parse(body);
	} catch {
		return body;
	}
};

/**
 * Replaces global fetch. The client under test only ever talks to the network
 * through it, so this is the whole seam — no transport code is stubbed out.
 */
export const stubFetch = (
	defaultBody: unknown = { status: "ok" },
): FetchStub => {
	const requests: RecordedRequest[] = [];
	type Outcome = () => Promise<Response>;
	const queue: Outcome[] = [];
	let fallback: Outcome = () =>
		Promise.resolve(
			new Response(JSON.stringify(defaultBody), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);

	const original = globalThis.fetch;
	const impl = (input: RequestInfo | URL, init?: RequestInit) => {
		requests.push({
			url: String(input),
			init,
			body: parseBody(init),
			headers: headersOf(init),
		});
		const next = queue.shift();
		return (next ?? fallback)();
	};
	globalThis.fetch = vi.fn(impl) as unknown as typeof globalThis.fetch;

	const responseOf = (body: unknown, init?: ResponseInit): Outcome => {
		return () =>
			Promise.resolve(
				new Response(typeof body === "string" ? body : JSON.stringify(body), {
					status: 200,
					headers: { "content-type": "application/json" },
					...init,
				}),
			);
	};

	return {
		requests,
		last: (): RecordedRequest => {
			const request = requests[requests.length - 1];
			if (!request) throw new Error("no request was made");
			return request;
		},
		respond: (body: unknown, init?: ResponseInit): void => {
			fallback = responseOf(body, init);
		},
		respondOnce: (body: unknown, init?: ResponseInit): void => {
			queue.push(responseOf(body, init));
		},
		fail: (error: Error): void => {
			fallback = () => Promise.reject(error);
		},
		defer: (): {
			resolve: (body: unknown) => void;
			reject: (e: Error) => void;
		} => {
			let settle: (outcome: Outcome) => void = () => undefined;
			const gate = new Promise<Outcome>((resolve) => {
				settle = resolve;
			});
			queue.push(() => gate.then((outcome) => outcome()));
			return {
				resolve: (body: unknown): void => settle(responseOf(body)),
				reject: (e: Error): void => settle(() => Promise.reject(e)),
			};
		},
		restore: (): void => {
			globalThis.fetch = original;
		},
	};
};

export const BASE_URL = "https://provider.prosopo.io";
export const SITE_KEY = "5site000000000000000000000000000000000000000000000000";
export const USER = "5user000000000000000000000000000000000000000000000000";

/** A challenge id has to be four `___`-separated parts, starting with a time. */
export const CHALLENGE: PoWChallengeId = `1753900000000${POW_SEPARATOR}${USER}${POW_SEPARATOR}${SITE_KEY}${POW_SEPARATOR}salt`;
