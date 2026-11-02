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

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	FetchError,
	fetchJson,
	fetchResponse,
	fetchText,
	safeFetch,
} from "../safeFetch.js";

const URL_UNDER_TEST = "https://example.test/data";

const stubFetch = (impl: typeof fetch): void => {
	vi.stubGlobal("fetch", vi.fn<typeof fetch>(impl));
};

const respondWith =
	(body: string, status = 200): typeof fetch =>
	async () =>
		new Response(body, { status });

const failure = (result: {
	ok: boolean;
	unwrapErr: () => FetchError;
}): FetchError => {
	expect(result.ok).toBe(false);
	return result.unwrapErr();
};

describe("safeFetch", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the response on 2xx", async () => {
		stubFetch(respondWith("hello"));
		const result = await safeFetch(URL_UNDER_TEST);
		expect(result.unwrap().status).toBe(200);
	});

	it("passes the request options through", async () => {
		stubFetch(respondWith("hello"));
		const init: RequestInit = { method: "POST" };
		await safeFetch(URL_UNDER_TEST, init);
		expect(fetch).toHaveBeenCalledWith(URL_UNDER_TEST, init);
	});

	it("reports a non-2xx response with status and body", async () => {
		stubFetch(respondWith("nope", 503));
		const error = failure(await safeFetch(URL_UNDER_TEST));
		expect(error).toBeInstanceOf(FetchError);
		expect(error.kind).toBe("status");
		expect(error.status).toBe(503);
		expect(error.body).toBe("nope");
		expect(error.url).toBe(URL_UNDER_TEST);
	});

	it("truncates a long error body", async () => {
		stubFetch(respondWith("x".repeat(10_000), 500));
		const error = failure(await safeFetch(URL_UNDER_TEST));
		expect(error.body).toHaveLength(500);
	});

	it("reports a rejected fetch as a network error", async () => {
		const cause = new TypeError("fetch failed");
		stubFetch(async () => {
			throw cause;
		});
		const error = failure(await safeFetch(URL_UNDER_TEST));
		expect(error.kind).toBe("network");
		expect(error.status).toBeUndefined();
		expect(error.cause).toBe(cause);
	});

	it("handles a thrown non-Error value", async () => {
		stubFetch(async () => {
			throw "boom";
		});
		const error = failure(await safeFetch(URL_UNDER_TEST));
		expect(error.message).toContain("boom");
	});

	it.each(["TimeoutError", "AbortError"])(
		"reports %s as a timeout",
		async (name) => {
			stubFetch(async () => {
				throw new DOMException("stopped", name);
			});
			const error = failure(await safeFetch(URL_UNDER_TEST));
			expect(error.kind).toBe("timeout");
		},
	);

	it("uses the url of a Request input", async () => {
		stubFetch(respondWith("nope", 404));
		const error = failure(await safeFetch(new Request(URL_UNDER_TEST)));
		expect(error.url).toBe(URL_UNDER_TEST);
	});
});

describe("fetchResponse", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("treats a non-2xx response as an answer", async () => {
		stubFetch(respondWith("gone", 404));
		const result = await fetchResponse(URL_UNDER_TEST);
		expect(result.unwrap().status).toBe(404);
	});
});

describe("fetchText", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the body", async () => {
		stubFetch(respondWith("hello"));
		expect((await fetchText(URL_UNDER_TEST)).unwrap()).toBe("hello");
	});

	it("reports an unreadable body", async () => {
		const response = new Response("hello");
		vi.spyOn(response, "text").mockRejectedValue(new Error("cut off"));
		stubFetch(async () => response);
		const error = failure(await fetchText(URL_UNDER_TEST));
		expect(error.kind).toBe("body");
		expect(error.status).toBe(200);
	});
});

describe("fetchJson", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("parses the body", async () => {
		stubFetch(respondWith('{"a":1}'));
		const result = await fetchJson<{ a: number }>(URL_UNDER_TEST);
		expect(result.unwrap()).toEqual({ a: 1 });
	});

	it("keeps large integers exact", async () => {
		stubFetch(respondWith('{"a":9007199254740993}'));
		const result = await fetchJson<{ a: bigint }>(URL_UNDER_TEST);
		expect(result.unwrap().a).toBe(9007199254740993n);
	});

	it("reports malformed json with the body", async () => {
		stubFetch(respondWith("<html>"));
		const error = failure(await fetchJson(URL_UNDER_TEST));
		expect(error.kind).toBe("json");
		expect(error.body).toBe("<html>");
	});

	it("reports a bad status before parsing", async () => {
		stubFetch(respondWith("<html>", 502));
		const error = failure(await fetchJson(URL_UNDER_TEST));
		expect(error.kind).toBe("status");
	});
});
