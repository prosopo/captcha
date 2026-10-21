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


// Records the server-side HTTP client's requests and outcomes into vectors.json, which
// equivalence.rs replays against the Rust.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ClientApiPaths, ClientSettingsSchema, type Tier } from "@prosopo/types";
import HttpClientBase from "../../src/api/HttpClientBase.js";
import ProviderApi from "../../src/api/ProviderApi.js";
import { ApiClient } from "../../src/api/apiClient.js";

// The vectors are what Node 24, the production runtime, produces.
if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

class TestClient extends HttpClientBase {
	public get(input: string, init?: RequestInit): Promise<unknown> {
		return this.fetch(input, init);
	}
	public send(input: string, body: unknown, init?: RequestInit): Promise<unknown> {
		return this.post(input, body, init);
	}
	public url(): string {
		return this.baseURL;
	}
}

class TestApiClient extends ApiClient {
	public get(input: string): Promise<unknown> {
		return this.fetch(input);
	}
	public url(): string {
		return this.baseURL;
	}
}

type ClientSpec = { kind: "base" | "apiClient" | "providerApi"; baseUrl: string; prefix?: string; timeoutMs?: number; defaultHeaders?: { [key: string]: string }; account?: string };
type Init = { method?: string; headers?: { [key: string]: string } };
type CallSpec =
	| { op: "fetch"; input: string; init?: Init }
	| { op: "post"; input: string; body?: Json; init?: Init }
	| { op: "forwardVerify"; path: string; body: Json; user: string }
	| { op: "registerSiteKey"; siteKey: string; tier: string; settings: Json; jwt: string };
type ResponseSpec = { status: number; statusText: string; contentType?: string; body: string } | { networkError: string };

const ok = (body: Json): ResponseSpec => ({ status: 200, statusText: "OK", contentType: "application/json", body: JSON.stringify(body) });

const settings = ClientSettingsSchema.parse({ captchaType: "pow", domains: ["example.com"], frictionlessThreshold: 0.5 }) as unknown as Json;

const base: ClientSpec = { kind: "base", baseUrl: "https://provider.prosopo.io" };
const providerApi: ClientSpec = { kind: "providerApi", baseUrl: "https://provider.prosopo.io", account: "5site" };

const SCENARIOS: { label: string; client: ClientSpec; call: CallSpec; response: ResponseSpec }[] = [
	{ label: "get", client: base, call: { op: "fetch", input: "/status" }, response: ok({ registered: true }) },
	{ label: "get with a prefix", client: { ...base, prefix: "/v1" }, call: { op: "fetch", input: "/status" }, response: ok({}) },
	{ label: "get with an empty path", client: base, call: { op: "fetch", input: "" }, response: ok({}) },
	{ label: "get passes init through", client: base, call: { op: "fetch", input: "/status", init: { headers: { "X-Test": "1" } } }, response: ok({}) },
	{ label: "get with a method", client: base, call: { op: "fetch", input: "/thing", init: { method: "DELETE" } }, response: ok({}) },
	{ label: "get with default headers", client: { ...base, defaultHeaders: { "Accept-Language": "fr", "X-A": "default" } }, call: { op: "fetch", input: "/s", init: { headers: { "X-A": "call", "X-B": "2" } } }, response: ok({}) },
	{ label: "get with default headers and no init", client: { ...base, defaultHeaders: { "Accept-Language": "fr" } }, call: { op: "fetch", input: "/s" }, response: ok({}) },
	{ label: "502 text", client: base, call: { op: "fetch", input: "/s" }, response: { status: 502, statusText: "Bad Gateway", contentType: "text/plain", body: "gateway down" } },
	{ label: "429 json", client: base, call: { op: "fetch", input: "/s" }, response: { status: 429, statusText: "Too Many Requests", contentType: "application/json", body: '{"error":{"message":"rate limited"}}' } },
	{ label: "400 text", client: base, call: { op: "fetch", input: "/s" }, response: { status: 400, statusText: "Bad Request", contentType: "text/plain", body: '{"error":"bad request"}' } },
	{ label: "500 no content type", client: base, call: { op: "fetch", input: "/s" }, response: { status: 500, statusText: "Internal Server Error", body: "" } },
	{ label: "500 json with charset", client: base, call: { op: "fetch", input: "/s" }, response: { status: 500, statusText: "Internal Server Error", contentType: "application/json; charset=utf-8", body: '{"status":"error"}' } },
	{ label: "500 json uppercase", client: base, call: { op: "fetch", input: "/s" }, response: { status: 500, statusText: "Internal Server Error", contentType: "Application/JSON", body: '{"status":"error"}' } },
	{ label: "301 text", client: base, call: { op: "fetch", input: "/s" }, response: { status: 299, statusText: "Odd", contentType: "text/html", body: '{"ok":1}' } },
	{ label: "300 text", client: base, call: { op: "fetch", input: "/s" }, response: { status: 300, statusText: "Multiple Choices", contentType: "text/html", body: '{"ok":1}' } },
	{ label: "network failure", client: base, call: { op: "fetch", input: "/s" }, response: { networkError: "fetch failed" } },
	{ label: "not json", client: base, call: { op: "fetch", input: "/s" }, response: { status: 200, statusText: "OK", contentType: "application/json", body: "<html>not json</html>" } },
	{ label: "empty 200", client: base, call: { op: "fetch", input: "/s" }, response: { status: 200, statusText: "OK", contentType: "application/json", body: "" } },
	{ label: "200 json with a byte order mark", client: base, call: { op: "fetch", input: "/s" }, response: { status: 200, statusText: "OK", contentType: "application/json", body: '\ufeff{"ok":true}' } },
	{ label: "200 json without a content type", client: base, call: { op: "fetch", input: "/s" }, response: { status: 200, statusText: "OK", body: "[1,2]" } },
	{ label: "post", client: base, call: { op: "post", input: "/solve", body: { nonce: 1 } }, response: ok({ verified: true }) },
	{ label: "post merges headers", client: base, call: { op: "post", input: "/solve", body: {}, init: { headers: { "Prosopo-Site-Key": "key" } } }, response: ok({}) },
	{ label: "post overrides the content type", client: base, call: { op: "post", input: "/solve", body: {}, init: { headers: { "Content-Type": "text/*" } } }, response: ok({}) },
	{ label: "post with a differently cased content type", client: base, call: { op: "post", input: "/solve", body: {}, init: { headers: { "content-type": "text/*" } } }, response: ok({}) },
	{ label: "post with a method", client: base, call: { op: "post", input: "/solve", body: { a: 1 }, init: { method: "PUT" } }, response: ok({}) },
	{ label: "post without a body", client: base, call: { op: "post", input: "/solve" }, response: ok({}) },
	{ label: "post a null body", client: base, call: { op: "post", input: "/solve", body: null }, response: ok({}) },
	{ label: "post an empty array", client: base, call: { op: "post", input: "/events", body: [] }, response: ok({}) },
	{ label: "post nested", client: base, call: { op: "post", input: "/x", body: { s: "é\u0001\"", n: [0.5, -2, 1e-7, 12345678901234], o: { b: true, z: null } } }, response: ok({}) },
	{ label: "post with default headers", client: { ...base, defaultHeaders: { "Accept-Language": "de", "Content-Type": "text/plain" } }, call: { op: "post", input: "/x", body: {}, init: { headers: { "Accept-Language": "en" } } }, response: ok({}) },
	{ label: "post 503 empty", client: base, call: { op: "post", input: "/solve", body: {} }, response: { status: 503, statusText: "Service Unavailable", body: "nope" } },
	{ label: "post 400 json", client: base, call: { op: "post", input: "/solve", body: {} }, response: { status: 400, statusText: "Bad Request", contentType: "application/json", body: '{"error":"bad"}' } },
	{ label: "post network failure", client: base, call: { op: "post", input: "/solve", body: {} }, response: { networkError: "fetch failed" } },
	{ label: "api client keeps its protocol", client: { kind: "apiClient", baseUrl: "http://provider.prosopo.io", account: "5a" }, call: { op: "fetch", input: "/x" }, response: ok({}) },
	{ label: "api client assumes https", client: { kind: "apiClient", baseUrl: "provider.prosopo.io", account: "5a" }, call: { op: "fetch", input: "/x" }, response: ok({}) },
	{ label: "api client with an empty url", client: { kind: "apiClient", baseUrl: "", account: "5a" }, call: { op: "fetch", input: "/x" }, response: ok({}) },
	{ label: "api client with httpish host", client: { kind: "apiClient", baseUrl: "httpbin.org", account: "5a" }, call: { op: "fetch", input: "/x" }, response: ok({}) },
	{ label: "api client default headers", client: { kind: "apiClient", baseUrl: "https://p", account: "5a", defaultHeaders: { "Accept-Language": "fr" } }, call: { op: "fetch", input: "/x" }, response: ok({}) },
	{ label: "forward verify", client: providerApi, call: { op: "forwardVerify", path: ClientApiPaths.VerifyPowCaptchaSolution, body: { token: "t", dappSignature: "0xs", ip: "1.2.3.4", nested: { a: [1, "b"] } }, user: "5user" }, response: ok({ status: "ok", verified: true, score: 0.5 }) },
	{ label: "forward verify json error", client: providerApi, call: { op: "forwardVerify", path: ClientApiPaths.VerifyPowCaptchaSolution, body: {}, user: "5user" }, response: { status: 500, statusText: "Internal Server Error", contentType: "application/json", body: '{"status":"error","error":{"message":"x","code":500}}' } },
	{ label: "forward verify text error", client: providerApi, call: { op: "forwardVerify", path: ClientApiPaths.VerifyPuzzleCaptchaSolution, body: {}, user: "5user" }, response: { status: 502, statusText: "Bad Gateway", contentType: "text/html", body: "<html>" } },
	{ label: "forward verify with default headers", client: { ...providerApi, defaultHeaders: { "Prosopo-User": "default", "X-D": "d" } }, call: { op: "forwardVerify", path: ClientApiPaths.VerifyPowCaptchaSolution, body: {}, user: "5user" }, response: ok({}) },
	{ label: "forward verify to a hostname", client: { kind: "providerApi", baseUrl: "pronode2.prosopo.io", account: "5site" }, call: { op: "forwardVerify", path: ClientApiPaths.VerifyPowCaptchaSolution, body: {}, user: "5user" }, response: ok({}) },
	{ label: "register site key", client: providerApi, call: { op: "registerSiteKey", siteKey: "5new", tier: "professional", settings, jwt: "a.b.c" }, response: ok({ status: "ok" }) },
	{ label: "register site key 401", client: providerApi, call: { op: "registerSiteKey", siteKey: "5new", tier: "free", settings, jwt: "a.b.c" }, response: { status: 401, statusText: "Unauthorized", contentType: "text/plain", body: "Unauthorized" } },
];

const recorded: Json[] = [];
for (const scenario of SCENARIOS) {
	const requests: Json[] = [];
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const headers = init?.headers as { [key: string]: string } | undefined;
		requests.push({
			url: String(input),
			method: init?.method ?? "GET",
			headers: Object.entries(headers ?? {}),
			body: typeof init?.body === "string" ? init.body : null,
		});
		const response = scenario.response;
		if ("networkError" in response) throw new TypeError(response.networkError);
		const responseHeaders: { [key: string]: string } = response.contentType ? { "content-type": response.contentType } : {};
		const built = new Response(response.body === "" && response.status === 204 ? null : response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
		Object.defineProperty(built, "url", { value: String(input) });
		return built;
	}) as typeof fetch;
	const { client: spec, call } = scenario;
	let outcome: Json;
	try {
		let result: unknown;
		if (spec.kind === "base") {
			const client = new TestClient(spec.baseUrl, spec.prefix, spec.timeoutMs, spec.defaultHeaders);
			if (call.op === "fetch") result = await client.get(call.input, call.init);
			else if (call.op === "post") result = await client.send(call.input, "body" in call ? call.body : undefined, call.init);
		} else if (spec.kind === "apiClient") {
			const client = new TestApiClient(spec.baseUrl, spec.account ?? "", spec.timeoutMs, spec.defaultHeaders);
			if (call.op === "fetch") result = await client.get(call.input);
		} else {
			const client = new ProviderApi(spec.baseUrl, spec.account ?? "", spec.timeoutMs, spec.defaultHeaders);
			if (call.op === "forwardVerify") result = await client.forwardVerify(call.path as ClientApiPaths, call.body as object, call.user);
			else if (call.op === "registerSiteKey") result = await client.registerSiteKey(call.siteKey, call.tier as Tier, call.settings as never, call.jwt);
		}
		outcome = { result: result as Json };
	} catch (e) {
		outcome = { error: (e as Error).message, name: (e as Error).name };
	}
	recorded.push({ ...scenario, requests, ...(outcome as object) } as unknown as Json);
}

// HttpClientBase logs failures with console.error; the vectors do not depend on it.
const output = fileURLToPath(new URL("./vectors.json", import.meta.url));
writeFileSync(output, `${JSON.stringify({ scenarios: recorded }, null, "\t")}\n`);
process.stdout.write(`wrote ${recorded.length} request vectors\n`);
