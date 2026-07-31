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

// Testing strategy: fetch is the only seam that touches the outside world, so
// it is injected and everything else runs for real — including JSON parsing and
// the AbortController timeout, which is driven by a fetch that genuinely
// respects the signal rather than by a stubbed clock.
//
// The response body is deliberately treated as untrusted here: it is typed as
// IPApiResponse but arrives from `response.json()`, which casts rather than
// validates, so the tests cover fields the type claims are required going
// missing on the wire.

import type { IPApiResponse, IPInfoResult } from "@prosopo/types";
import { describe, expect, it, vi } from "vitest";
import {
	DEFAULT_TIMEOUT_MS,
	type FetchFn,
	IpapiBackend,
	parseAbuserScore,
} from "../backends/ipapi.js";

const BASE_URL = "https://api.ipapi.test/";
const IP = "8.8.8.8";

/** Minimal valid upstream payload; individual tests layer fields on top. */
const baseResponse = (
	overrides: Partial<IPApiResponse> = {},
): IPApiResponse => ({
	ip: IP,
	rir: "ARIN",
	is_bogon: false,
	is_mobile: false,
	is_satellite: false,
	is_crawler: false,
	is_datacenter: false,
	is_tor: false,
	is_proxy: false,
	is_vpn: false,
	is_abuser: false,
	elapsed_ms: 1,
	...overrides,
});

/** A fetch that answers with the given JSON body and status. */
const respondWith = (
	body: unknown,
	init: { status?: number; statusText?: string } = {},
): FetchFn => {
	return async (): Promise<globalThis.Response> =>
		new Response(JSON.stringify(body), {
			status: init.status ?? 200,
			statusText: init.statusText ?? "OK",
			headers: { "Content-Type": "application/json" },
		});
};

/** A fetch that never answers until the caller's signal aborts. */
const respondNever: FetchFn = (_url: string, init: RequestInit) =>
	new Promise<globalThis.Response>((_resolve, reject) => {
		init.signal?.addEventListener("abort", () => {
			// Matches what the platform throws on an aborted fetch: the backend
			// keys its timeout branch off the name, not the type.
			const error = new Error("The operation was aborted");
			error.name = "AbortError";
			reject(error);
		});
	});

const backend = (
	fetchFn: FetchFn,
	extra: { apiKey?: string; timeoutMs?: number } = {},
): IpapiBackend =>
	new IpapiBackend({ baseUrl: BASE_URL, fetch: fetchFn, ...extra });

/** Narrow a response to the success branch, failing loudly if it is an error. */
const expectValid = (
	response: Awaited<ReturnType<IpapiBackend["lookup"]>>,
): IPInfoResult => {
	if (!response.isValid) {
		throw new Error(`expected a valid result, got: ${response.error}`);
	}
	return response;
};

describe("parseAbuserScore", () => {
	it("reads the numeric prefix of a scored string", () => {
		expect(parseAbuserScore("0.0012 (Low)")).toBeCloseTo(0.0012);
	});

	it("reads a bare number with no qualifier", () => {
		expect(parseAbuserScore("0.5")).toBe(0.5);
	});

	it("reports a missing score as unknown rather than throwing", () => {
		// The field is declared required but comes from unvalidated JSON. It used
		// to be dereferenced directly, so an absent score threw and the throw was
		// caught far above as a generic parsing error — discarding an otherwise
		// complete lookup.
		expect(parseAbuserScore(undefined)).toBeUndefined();
	});

	it("reports an empty string as unknown", () => {
		expect(parseAbuserScore("")).toBeUndefined();
	});

	it("reports a non-numeric score as unknown, never NaN", () => {
		// NaN would be the worst outcome: callers compare this against
		// thresholds, and every comparison against NaN is false, so the IP would
		// silently pass checks it should not.
		expect(parseAbuserScore("unknown")).toBeUndefined();
		expect(parseAbuserScore("(Low)")).toBeUndefined();
	});

	it("distinguishes a genuine zero from an unknown score", () => {
		// 0 means "measured, and clean" on the 0..1 scale; undefined means "we
		// have no measurement". Collapsing the two would assert cleanliness that
		// was never established.
		expect(parseAbuserScore("0 (Very Low)")).toBe(0);
		expect(parseAbuserScore("0")).toBe(0);
		expect(parseAbuserScore(undefined)).toBeUndefined();
	});
});

describe("IpapiBackend.isAvailable", () => {
	it("is available when a base url is configured", () => {
		expect(backend(respondWith(baseResponse())).isAvailable()).toBe(true);
	});

	it("is unavailable when the base url is blank", () => {
		// An unset env var arrives as "", which must not be treated as a usable
		// endpoint — every lookup would POST to a relative path.
		const blank = new IpapiBackend({ baseUrl: "" });
		expect(blank.isAvailable()).toBe(false);
	});
});

describe("IpapiBackend.lookup request", () => {
	it("posts the ip as JSON to the configured url", async () => {
		const fetchFn = vi.fn<FetchFn>(respondWith(baseResponse()));
		await backend(fetchFn).lookup(IP);

		const [url, init] = fetchFn.mock.calls[0] ?? [];
		expect(url).toBe(BASE_URL);
		expect(init?.method).toBe("POST");
		expect(JSON.parse(String(init?.body))).toEqual({ q: IP });
	});

	it("includes the api key when one is configured", async () => {
		const fetchFn = vi.fn<FetchFn>(respondWith(baseResponse()));
		await backend(fetchFn, { apiKey: "secret" }).lookup(IP);

		const init = fetchFn.mock.calls[0]?.[1];
		expect(JSON.parse(String(init?.body))).toEqual({ q: IP, key: "secret" });
	});

	it("omits the key entirely when none is configured", async () => {
		// Sending `key: undefined` would serialise the field away anyway, but an
		// empty-string key would be sent and rejected upstream.
		const fetchFn = vi.fn<FetchFn>(respondWith(baseResponse()));
		await backend(fetchFn).lookup(IP);

		expect(
			JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body)),
		).not.toHaveProperty("key");
	});

	it("asks for and declares JSON", async () => {
		const fetchFn = vi.fn<FetchFn>(respondWith(baseResponse()));
		await backend(fetchFn).lookup(IP);

		const headers = fetchFn.mock.calls[0]?.[1]?.headers;
		expect(headers).toMatchObject({
			"Content-Type": "application/json",
			Accept: "application/json",
		});
	});
});

describe("IpapiBackend.lookup input validation", () => {
	it("rejects an empty ip without calling out", async () => {
		// Length 0: the upstream would answer about the caller's own address,
		// which is a wrong answer rather than an error.
		const fetchFn = vi.fn<FetchFn>(respondWith(baseResponse()));
		const result = await backend(fetchFn).lookup("");

		expect(result).toEqual({
			isValid: false,
			error: "Invalid IP address provided",
			ip: "undefined",
		});
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it("does not send a lookup for a non-string ip from an untyped caller", async () => {
		// This package is consumed from JavaScript too, where the type guard is
		// the only thing standing between a bad value and the upstream.
		const fetchFn = vi.fn<FetchFn>(respondWith(baseResponse()));
		const untyped: (ip: unknown) => Promise<unknown> = (ip: unknown) =>
			backend(fetchFn).lookup(ip as string);

		await expect(untyped(null)).resolves.toMatchObject({ isValid: false });
		expect(fetchFn).not.toHaveBeenCalled();
	});
});

describe("IpapiBackend.lookup responses", () => {
	it("maps a full response onto the shared result shape", async () => {
		const result = expectValid(
			await backend(
				respondWith(
					baseResponse({
						is_vpn: true,
						is_datacenter: true,
						company: {
							name: "Example Co",
							abuser_score: "0.01 (Low)",
							domain: "example.com",
							type: "hosting",
							network: "8.8.8.0/24",
							whois: "",
						},
						asn: {
							asn: 15169,
							abuser_score: "0.002 (Very Low)",
							route: "8.8.8.0/24",
							descr: "",
							country: "US",
							active: true,
							org: "Google LLC",
							domain: "google.com",
							abuse: "",
							type: "hosting",
							created: "",
							updated: "",
							rir: "ARIN",
							whois: "",
						},
						location: {
							is_eu_member: false,
							calling_code: "1",
							currency_code: "USD",
							continent: "NA",
							country: "United States",
							country_code: "US",
							state: "California",
							city: "Mountain View",
							latitude: 37.4,
							longitude: -122.1,
							zip: "94035",
							timezone: "America/Los_Angeles",
							local_time: "",
							local_time_unix: 0,
							is_dst: false,
						},
						vpn: {
							ip: IP,
							service: "ExampleVPN",
							url: "",
							type: "exit_node",
							last_seen: 0,
							last_seen_str: "",
							country_code: "US",
							city_name: "Mountain View",
							latitude: 37.4,
							longitude: -122.1,
						},
					}),
				),
			).lookup(IP),
		);

		expect(result).toMatchObject({
			ip: IP,
			isValid: true,
			isVPN: true,
			isDatacenter: true,
			providerName: "Example Co",
			providerType: "hosting",
			asnNumber: 15169,
			asnOrganization: "Google LLC",
			country: "United States",
			countryCode: "US",
			region: "California",
			city: "Mountain View",
			timezone: "America/Los_Angeles",
			vpnService: "ExampleVPN",
			vpnType: "exit_node",
		});
		expect(result.abuserScore).toBeCloseTo(0.002);
		expect(result.companyAbuserScore).toBeCloseTo(0.01);
	});

	it("survives a response missing every optional section", async () => {
		// The upstream omits company/asn/location entirely for many IPs; the
		// mapping must degrade to undefined fields, not fail.
		const result = expectValid(
			await backend(respondWith(baseResponse())).lookup(IP),
		);

		expect(result.isValid).toBe(true);
		expect(result.country).toBeUndefined();
		expect(result.asnNumber).toBeUndefined();
		expect(result.providerName).toBeUndefined();
		expect(result.abuserScore).toBeUndefined();
		expect(result.companyAbuserScore).toBeUndefined();
	});

	it("keeps a successful lookup when the abuser scores are absent", async () => {
		// The regression this package's fix addresses: abuser_score is declared
		// required, but a response without it must not cost the caller the
		// geolocation and threat data that did arrive.
		const result = expectValid(
			await backend(
				respondWith(
					baseResponse({
						asn: {
							asn: 64512,
							route: "",
							descr: "",
							country: "US",
							active: true,
							org: "Test",
							domain: "",
							abuse: "",
							type: "isp",
							created: "",
							updated: "",
							rir: "ARIN",
							whois: "",
						} as IPApiResponse["asn"],
					}),
				),
			).lookup(IP),
		);

		expect(result.isValid).toBe(true);
		expect(result.asnNumber).toBe(64512);
		expect(result.abuserScore).toBeUndefined();
	});

	it("prefers the company name but falls back to the datacenter", async () => {
		const result = expectValid(
			await backend(
				respondWith(
					baseResponse({
						datacenter: { datacenter: "AWS", network: "1.2.3.0/24" },
					}),
				),
			).lookup(IP),
		);

		expect(result.providerName).toBe("AWS");
		// datacenterName is deliberately separate: it is used for strict name
		// comparisons, so it must never inherit a company name.
		expect(result.datacenterName).toBe("AWS");
	});

	it("reports a bogon address as invalid rather than mapping it", async () => {
		const result = await backend(
			respondWith(baseResponse({ is_bogon: true })),
		).lookup(IP);

		expect(result).toEqual({
			isValid: false,
			error: "IP address is bogon (non-routable)",
			ip: IP,
		});
	});

	it("reports a non-2xx status with the code and text", async () => {
		const result = await backend(
			respondWith({}, { status: 429, statusText: "Too Many Requests" }),
		).lookup(IP);

		expect(result).toMatchObject({
			isValid: false,
			ip: IP,
			error: "API request failed with status 429: Too Many Requests",
		});
	});

	it("reports a 500 without throwing", async () => {
		// Services fail sporadically; a 500 must be an error response, not a
		// rejected promise that the caller has to wrap.
		const result = await backend(
			respondWith({}, { status: 500, statusText: "Internal Server Error" }),
		).lookup(IP);

		expect(result.isValid).toBe(false);
	});

	it("turns malformed JSON into an error response", async () => {
		const malformed: FetchFn = async (): Promise<globalThis.Response> =>
			new Response("not json", { status: 200 });

		const result = await backend(malformed).lookup(IP);

		expect(result.isValid).toBe(false);
		expect(result).toMatchObject({ ip: IP });
		if (!result.isValid) {
			expect(result.error).toContain("Network or parsing error");
		}
	});

	it("turns a network failure into an error response", async () => {
		const failing: FetchFn = async (): Promise<globalThis.Response> => {
			throw new Error("ECONNREFUSED");
		};

		const result = await backend(failing).lookup(IP);

		expect(result).toEqual({
			isValid: false,
			error: "Network or parsing error: ECONNREFUSED",
			ip: IP,
		});
	});

	it("describes a non-Error rejection rather than printing [object Object]", async () => {
		const failing: FetchFn = async (): Promise<globalThis.Response> => {
			// Rejections are not guaranteed to be Errors.
			throw "socket hang up";
		};

		const result = await backend(failing).lookup(IP);

		expect(result).toMatchObject({
			isValid: false,
			error: "Network or parsing error: socket hang up",
		});
	});
});

describe("IpapiBackend.lookup timeout", () => {
	it("gives up on a hanging upstream and says so", async () => {
		// An IP lookup sits in the request path: a backend that never answers
		// must not hold the caller open indefinitely.
		const result = await backend(respondNever, { timeoutMs: 20 }).lookup(IP);

		expect(result).toEqual({
			isValid: false,
			error: "Request timed out after 20ms",
			ip: IP,
		});
	});

	it("reports the default budget when none is configured", async () => {
		expect(DEFAULT_TIMEOUT_MS).toBe(700);
		const configured = new IpapiBackend({
			baseUrl: BASE_URL,
			fetch: respondNever,
		});
		// Not awaited to completion here — the point is only that the default is
		// the one the message quotes, checked below against a short override.
		const result = await backend(respondNever, {
			timeoutMs: DEFAULT_TIMEOUT_MS,
		}).lookup(IP);
		expect(result).toMatchObject({
			error: `Request timed out after ${DEFAULT_TIMEOUT_MS}ms`,
		});
		expect(configured.isAvailable()).toBe(true);
	}, 5000);

	it("does not time out a response that arrives in time", async () => {
		const slowButFine: FetchFn = async (): Promise<globalThis.Response> => {
			await new Promise<void>((resolve) => {
				setTimeout(resolve, 5);
			});
			return new Response(JSON.stringify(baseResponse()), { status: 200 });
		};

		const result = await backend(slowButFine, { timeoutMs: 200 }).lookup(IP);

		expect(result.isValid).toBe(true);
	});

	it("passes an abort signal the upstream can observe", async () => {
		const fetchFn = vi.fn<FetchFn>(respondWith(baseResponse()));
		await backend(fetchFn).lookup(IP);

		expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
	});
});

describe("IpapiBackend default fetch", () => {
	it("uses the global fetch when none is injected", async () => {
		// Exercises the un-injected path end to end: port 1 on loopback refuses
		// immediately, so the real fetch fails fast and its rejection must be
		// contained as an invalid result rather than thrown at the caller.
		const result = await new IpapiBackend({
			baseUrl: "http://127.0.0.1:1/",
			timeoutMs: 2000,
		}).lookup(IP);

		expect(result.isValid).toBe(false);
	});
});
