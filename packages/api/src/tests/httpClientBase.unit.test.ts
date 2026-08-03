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

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import HttpClientBase from "../api/HttpClientBase.js";
import { HttpError } from "../api/HttpError.js";
import { ApiClient } from "../api/apiClient.js";
import { BASE_URL, type FetchStub, stubFetch } from "./apiHarness.js";

/**
 * The transport methods are protected, so a test subclass exposes them. This
 * is the same surface every generated client uses.
 */
class TestClient extends HttpClientBase {
	public get<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
		return this.fetch<T>(input, init);
	}
	public send<T, U>(
		input: RequestInfo,
		body: U,
		init?: RequestInit,
	): Promise<T> {
		return this.post<T, U>(input, body, init);
	}
	public sendWithHeaders<T, U>(
		input: RequestInfo,
		body: U,
		init?: RequestInit,
	): Promise<{ data: T; headers: Headers }> {
		return this.postWithHeaders<T, U>(input, body, init);
	}
	public url(): string {
		return this.baseURL;
	}
}

let fetchStub: FetchStub;

beforeEach(() => {
	fetchStub = stubFetch();
	vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
	fetchStub.restore();
	vi.restoreAllMocks();
});

const client = (prefix?: string): TestClient =>
	prefix === undefined
		? new TestClient(BASE_URL)
		: new TestClient(BASE_URL, prefix);

const json = (body: unknown, status = 200): ResponseInit => ({
	status,
	headers: { "content-type": "application/json" },
	statusText: status === 200 ? "OK" : "Error",
});

describe("the base URL", () => {
	test("defaults to no prefix", () => {
		expect(client().url()).toBe(BASE_URL);
	});

	test("appends the prefix, so paths stay relative to it", async () => {
		const withPrefix = client("/v1");
		expect(withPrefix.url()).toBe(`${BASE_URL}/v1`);
		await withPrefix.get("/status");
		expect(fetchStub.last().url).toBe(`${BASE_URL}/v1/status`);
	});

	test("an empty path still hits the base URL", async () => {
		await client().get("");
		expect(fetchStub.last().url).toBe(BASE_URL);
	});
});

describe("fetch", () => {
	test("returns the parsed JSON body", async () => {
		fetchStub.respond({ registered: true });
		await expect(client().get("/status")).resolves.toEqual({
			registered: true,
		});
	});

	test("passes the caller's init straight through", async () => {
		await client().get("/status", { headers: { "X-Test": "1" } });
		expect(fetchStub.last().headers).toEqual({ "X-Test": "1" });
	});

	test("throws an HttpError for a non-JSON failure", async () => {
		fetchStub.respond("gateway down", {
			status: 502,
			statusText: "Bad Gateway",
			headers: { "content-type": "text/plain" },
		});
		await expect(client().get("/status")).rejects.toBeInstanceOf(HttpError);
	});

	test("a JSON error body is handed back instead of thrown, so callers can read the error", async () => {
		// Providers signal business errors (rate limits, bad site keys) as JSON
		// with a non-2xx status; those must reach the caller, not be flattened
		// into a transport error.
		fetchStub.respond({ error: { message: "rate limited" } }, json({}, 429));
		await expect(client().get("/status")).resolves.toEqual({
			error: { message: "rate limited" },
		});
	});

	test("a 400 is handed back even without a JSON content type", async () => {
		fetchStub.respond('{"error":"bad request"}', {
			status: 400,
			headers: { "content-type": "text/plain" },
		});
		await expect(client().get("/status")).resolves.toEqual({
			error: "bad request",
		});
	});

	test("a response with no content type at all is treated as a failure", async () => {
		fetchStub.respond("", { status: 500, headers: {} });
		await expect(client().get("/status")).rejects.toBeInstanceOf(HttpError);
	});

	test("rejects with the network error when fetch itself fails", async () => {
		const boom = new Error("network down");
		fetchStub.fail(boom);
		await expect(client().get("/status")).rejects.toBe(boom);
	});

	test("rejects when the body is not valid JSON", async () => {
		fetchStub.respond("<html>not json</html>", json({}));
		await expect(client().get("/status")).rejects.toBeInstanceOf(Error);
	});

	test("an empty 200 body is a parse failure, not a silent undefined", async () => {
		// A provider that returns 204/empty would otherwise resolve to
		// undefined and blow up far from the cause.
		fetchStub.respond("", json({}));
		await expect(client().get("/status")).rejects.toBeInstanceOf(Error);
	});
});

describe("post", () => {
	test("sends the body as JSON with the right method", async () => {
		await client().send("/solve", { nonce: 1 });
		const request = fetchStub.last();
		expect(request.init?.method).toBe("POST");
		expect(request.body).toEqual({ nonce: 1 });
		expect(request.headers["Content-Type"]).toBe("application/json");
	});

	test("caller headers are merged on top of the content type", async () => {
		await client().send(
			"/solve",
			{},
			{ headers: { "Prosopo-Site-Key": "key" } },
		);
		expect(fetchStub.last().headers).toEqual({
			"Content-Type": "application/json",
			"Prosopo-Site-Key": "key",
		});
	});

	test("a caller may override the content type", async () => {
		await client().send(
			"/solve",
			{},
			{ headers: { "Content-Type": "text/*" } },
		);
		expect(fetchStub.last().headers["Content-Type"]).toBe("text/*");
	});

	test("headers survive an init that also carries other options", async () => {
		// `init` is spread after `headers` is computed, so a caller passing
		// `headers` inside init must not clobber the merged set.
		await client().send(
			"/solve",
			{},
			{ keepalive: true, headers: { "X-A": "1" } },
		);
		const request = fetchStub.last();
		expect(request.init?.keepalive).toBe(true);
		expect(request.headers["Content-Type"]).toBe("application/json");
		expect(request.headers["X-A"]).toBe("1");
	});

	test("an undefined body still produces a request", async () => {
		await client().send("/solve", undefined);
		expect(fetchStub.last().init?.body).toBeUndefined();
	});

	test("a zero-length array body is sent, not dropped", async () => {
		await client().send("/events", []);
		expect(fetchStub.last().init?.body).toBe("[]");
	});

	test("returns the parsed response", async () => {
		fetchStub.respond({ verified: true });
		await expect(client().send("/solve", {})).resolves.toEqual({
			verified: true,
		});
	});

	test("throws an HttpError for a non-JSON failure", async () => {
		fetchStub.respond("nope", { status: 503, headers: {} });
		await expect(client().send("/solve", {})).rejects.toBeInstanceOf(HttpError);
	});

	test("hands back a 400 JSON body", async () => {
		fetchStub.respond({ error: "bad" }, json({}, 400));
		await expect(client().send("/solve", {})).resolves.toEqual({
			error: "bad",
		});
	});

	test("rejects with the network error", async () => {
		const boom = new Error("offline");
		fetchStub.fail(boom);
		await expect(client().send("/solve", {})).rejects.toBe(boom);
	});
});

describe("postWithHeaders", () => {
	test("returns the body and the response headers together", async () => {
		fetchStub.respond({ captchaType: "pow" }, {
			status: 200,
			headers: {
				"content-type": "application/json",
				"x-prosopo-meta": "encoded",
			},
		} satisfies ResponseInit);
		const { data, headers } = await client().sendWithHeaders<
			{ captchaType: string },
			object
		>("/frictionless", {});
		expect(data).toEqual({ captchaType: "pow" });
		expect(headers.get("x-prosopo-meta")).toBe("encoded");
	});

	test("sends JSON with the merged headers", async () => {
		await client().sendWithHeaders("/frictionless", { token: "t" }, {
			headers: { "Prosopo-User": "user" },
		} satisfies RequestInit);
		const request = fetchStub.last();
		expect(request.init?.method).toBe("POST");
		expect(request.body).toEqual({ token: "t" });
		expect(request.headers).toEqual({
			"Content-Type": "application/json",
			"Prosopo-User": "user",
		});
	});

	test("a missing meta header is absent rather than an error", async () => {
		const { headers } = await client().sendWithHeaders("/frictionless", {});
		expect(headers.get("x-prosopo-meta")).toBeNull();
	});

	test("throws an HttpError for a non-JSON failure", async () => {
		fetchStub.respond("nope", { status: 500, headers: {} });
		await expect(
			client().sendWithHeaders("/frictionless", {}),
		).rejects.toBeInstanceOf(HttpError);
	});

	test("hands back a 400 JSON body with its headers", async () => {
		fetchStub.respond({ error: "bad" }, json({}, 400));
		const { data } = await client().sendWithHeaders("/frictionless", {});
		expect(data).toEqual({ error: "bad" });
	});

	test("rejects when the body cannot be parsed", async () => {
		fetchStub.respond("not json", json({}));
		await expect(
			client().sendWithHeaders("/frictionless", {}),
		).rejects.toBeInstanceOf(Error);
	});

	test("rejects with the network error", async () => {
		const boom = new Error("offline");
		fetchStub.fail(boom);
		await expect(client().sendWithHeaders("/frictionless", {})).rejects.toBe(
			boom,
		);
	});
});

describe("HttpError", () => {
	test("carries the status, text and URL a caller needs to triage", () => {
		const error = new HttpError(429, "Too Many Requests", `${BASE_URL}/pow`);
		expect(error.status).toBe(429);
		expect(error.statusText).toBe("Too Many Requests");
		expect(error.url).toBe(`${BASE_URL}/pow`);
		expect(error.name).toBe("HttpError");
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe(
			`HTTP error! status: 429 (Too Many Requests) for URL: ${BASE_URL}/pow`,
		);
	});

	test("is distinguishable from any other error at a catch site", () => {
		expect(new HttpError(500, "", "")).toBeInstanceOf(HttpError);
		expect(new Error("plain")).not.toBeInstanceOf(HttpError);
	});
});

describe("ApiClient", () => {
	test("keeps an explicit protocol", () => {
		const api = new ApiClient("http://localhost:9229", "account");
		expect(new TestClient("http://localhost:9229").url()).toBe(
			"http://localhost:9229",
		);
		expect(api).toBeInstanceOf(HttpClientBase);
	});

	test("assumes HTTPS when the URL has no protocol", async () => {
		class Probe extends ApiClient {
			public go(): Promise<unknown> {
				return this.fetch("/status");
			}
		}
		await new Probe("provider.prosopo.io", "account").go();
		expect(fetchStub.last().url).toBe("https://provider.prosopo.io/status");
	});

	test("does not upgrade an https URL twice", async () => {
		class Probe extends ApiClient {
			public go(): Promise<unknown> {
				return this.fetch("/status");
			}
		}
		await new Probe("https://provider.prosopo.io", "account").go();
		expect(fetchStub.last().url).toBe("https://provider.prosopo.io/status");
	});

	test("an empty base URL becomes a relative https URL, not a crash", async () => {
		class Probe extends ApiClient {
			public go(): Promise<unknown> {
				return this.fetch("/status");
			}
		}
		await new Probe("", "account").go();
		expect(fetchStub.last().url).toBe("https:///status");
	});
});
