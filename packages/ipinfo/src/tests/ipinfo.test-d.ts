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

// These assert the shape consumers actually import — the package entrypoint —
// rather than the internal modules, so a barrel that stops re-exporting
// something fails here rather than at a downstream build.

import type { IPInfoResponse } from "@prosopo/types";
import { assertType, describe, expectTypeOf, it } from "vitest";
// Not re-exported: an internal helper, asserted here because the response type
// declares the field it parses as required while the wire does not supply it.
import { parseAbuserScore } from "../backends/ipapi.js";
import {
	IpInfoService,
	IpapiBackend,
	MaxMindBackend,
	isNonRoutable,
} from "../index.js";
import type {
	FetchFn,
	IIpInfoService,
	IpInfoBackends,
	IpInfoServiceConfig,
	OpenReader,
} from "../index.js";

describe("IpInfoService", () => {
	it("satisfies the interface it claims to implement", () => {
		expectTypeOf<IpInfoService>().toMatchTypeOf<IIpInfoService>();
	});

	it("takes a config and optional injected backends", () => {
		expectTypeOf(IpInfoService).toBeConstructibleWith({});
		expectTypeOf(IpInfoService).toBeConstructibleWith({}, {});
		expectTypeOf(IpInfoService).toBeConstructibleWith(
			{ ipapiUrl: "https://api.ipapi.is" },
			{ maxmind: null, ipapi: null },
		);
	});

	it("resolves lookup to the shared response union, never a bare result", () => {
		// The union is the point: a consumer must be forced to check isValid
		// before reading any geolocation field.
		expectTypeOf<IpInfoService["lookup"]>().returns.toEqualTypeOf<
			Promise<IPInfoResponse>
		>();
	});

	it("exposes initialize and isAvailable with no arguments", () => {
		expectTypeOf<IpInfoService["initialize"]>().parameters.toEqualTypeOf<[]>();
		expectTypeOf<IpInfoService["initialize"]>().returns.toEqualTypeOf<
			Promise<void>
		>();
		expectTypeOf<
			IpInfoService["isAvailable"]
		>().returns.toEqualTypeOf<boolean>();
	});

	it("keeps every config field optional", () => {
		// An entirely unconfigured service is a supported state — it degrades to
		// "no backend available" rather than failing to compile.
		assertType<IpInfoServiceConfig>({});
	});

	it("rejects an unknown config key", () => {
		// Catches a renamed option silently becoming a no-op.
		// @ts-expect-error maxmindDbPath is not an option
		assertType<IpInfoServiceConfig>({ maxmindDbPath: "/city.mmdb" });
	});

	it("rejects a config value of the wrong type", () => {
		// @ts-expect-error the url is a string, not a URL
		assertType<IpInfoServiceConfig>({ ipapiUrl: new URL("https://x.test") });
	});
});

describe("IpInfoBackends", () => {
	it("accepts null for a backend that is deliberately absent", () => {
		// null and undefined must both be spellable: a test that wants exactly
		// one backend needs to say so without a cast.
		assertType<IpInfoBackends>({ maxmind: null, ipapi: null });
		assertType<IpInfoBackends>({});
	});

	it("does not accept an arbitrary object as a backend", () => {
		// The seam is typed to the real classes so a stub cannot drift out of
		// step with them unnoticed.
		// @ts-expect-error a plain object is not a MaxMindBackend
		assertType<IpInfoBackends>({ maxmind: { lookup: () => undefined } });
	});
});

describe("isNonRoutable", () => {
	it("takes exactly one string and returns a boolean", () => {
		expectTypeOf(isNonRoutable).parameters.toEqualTypeOf<[string]>();
		expectTypeOf(isNonRoutable).returns.toEqualTypeOf<boolean>();
	});
});

describe("parseAbuserScore", () => {
	it("accepts the optional upstream field and always yields a number", () => {
		// undefined must be in the parameter type: the wire does not guarantee
		// the field even though the response type declares it required.
		expectTypeOf(parseAbuserScore).parameters.toEqualTypeOf<
			[string | undefined]
		>();
		expectTypeOf(parseAbuserScore).returns.toEqualTypeOf<number>();
	});

	it("never returns undefined for a missing score", () => {
		expectTypeOf(parseAbuserScore(undefined)).toEqualTypeOf<number>();
	});
});

describe("FetchFn", () => {
	it("matches the global fetch closely enough to be its default", () => {
		// If it did not, the `?? globalThis.fetch` fallback would need a cast,
		// and the seam would stop describing what actually runs in production.
		expectTypeOf<typeof globalThis.fetch>().toMatchTypeOf<FetchFn>();
	});

	it("returns the global Response, not a hand-rolled shape", () => {
		expectTypeOf<FetchFn>().returns.toEqualTypeOf<
			Promise<globalThis.Response>
		>();
	});

	it("takes a url and an init", () => {
		expectTypeOf<FetchFn>().parameters.toEqualTypeOf<[string, RequestInit]>();
	});
});

describe("OpenReader", () => {
	it("takes a path and resolves to a reader", () => {
		expectTypeOf<OpenReader>().parameters.toEqualTypeOf<[string]>();
		expectTypeOf<OpenReader>().returns.toMatchTypeOf<Promise<unknown>>();
	});
});

describe("backend constructors", () => {
	it("require a base url for ipapi and accept the injection seams", () => {
		expectTypeOf(IpapiBackend).toBeConstructibleWith({
			baseUrl: "https://x.test",
		});
		expectTypeOf(IpapiBackend).toBeConstructibleWith({
			baseUrl: "https://x.test",
			apiKey: "k",
			timeoutMs: 100,
			fetch: async (): Promise<globalThis.Response> => new Response(),
		});
	});

	it("leave every MaxMind option optional", () => {
		// A backend with neither database path is legal and simply unavailable.
		expectTypeOf(MaxMindBackend).toBeConstructibleWith({});
		expectTypeOf(MaxMindBackend).toBeConstructibleWith({
			cityDbPath: "/city.mmdb",
			asnDbPath: "/asn.mmdb",
		});
	});

	it("give both backends the same lookup signature as the service", () => {
		// The service routes between them, so any divergence would show up as a
		// runtime surprise rather than a compile error.
		expectTypeOf<MaxMindBackend["lookup"]>().parameters.toEqualTypeOf<
			[string]
		>();
		expectTypeOf<IpapiBackend["lookup"]>().parameters.toEqualTypeOf<[string]>();
		expectTypeOf<IpapiBackend["lookup"]>().returns.toEqualTypeOf<
			Promise<IPInfoResponse>
		>();
	});
});
