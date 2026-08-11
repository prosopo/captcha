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

// This package is almost entirely types; the only runtime value it ships is the
// response status enum, and the only runtime behaviour is what its index
// re-exports. Both matter: the enum's string values travel over the wire to
// clients that compare them literally, and a dropped re-export is a breaking
// change that compiles fine inside this package. The contracts themselves are
// covered in apiRoute.test-d.ts.

import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as api from "../index.js";
import type {
	ApiEndpoint,
	ApiEndpointResponse,
	ApiRoutes,
	ApiRoutesProvider,
} from "../index.js";
import { ApiEndpointResponseStatus } from "../index.js";

describe("ApiEndpointResponseStatus", () => {
	it("keeps the exact strings clients compare against", () => {
		// These cross the wire. Renaming a member is invisible to this package's
		// own compiler but breaks every consumer reading the JSON.
		expect(ApiEndpointResponseStatus.SUCCESS).toBe("SUCCESS");
		expect(ApiEndpointResponseStatus.FAIL).toBe("FAIL");
		expect(ApiEndpointResponseStatus.PROCESSING).toBe("PROCESSING");
	});

	it("declares exactly three statuses", () => {
		// A fourth would need handling in every consumer's switch; catching the
		// addition here forces that to be a deliberate change.
		expect(Object.keys(ApiEndpointResponseStatus)).toEqual([
			"SUCCESS",
			"FAIL",
			"PROCESSING",
		]);
	});

	it("is a string enum, so it has no reverse numeric mapping", () => {
		// Numeric enums gain reverse keys, which would make Object.keys above and
		// any `key in Status` check behave differently.
		expect(Object.values(ApiEndpointResponseStatus)).toEqual([
			"SUCCESS",
			"FAIL",
			"PROCESSING",
		]);
	});

	it("distinguishes failure from a still-running request", () => {
		// PROCESSING is not a terminal state; conflating it with FAIL would have
		// callers give up on work that is still in flight.
		expect(ApiEndpointResponseStatus.PROCESSING).not.toBe(
			ApiEndpointResponseStatus.FAIL,
		);
		expect(ApiEndpointResponseStatus.PROCESSING).not.toBe(
			ApiEndpointResponseStatus.SUCCESS,
		);
	});
});

describe("public export surface", () => {
	it("re-exports the status enum from the package root", () => {
		// Consumers import from "@prosopo/api-route", not the inner paths.
		expect(api.ApiEndpointResponseStatus).toBe(ApiEndpointResponseStatus);
	});

	it("ships the enum as its only runtime export", () => {
		// Everything else is type-only and must erase completely; a stray runtime
		// value here would mean the package cannot be fully tree-shaken away.
		expect(Object.keys(api)).toEqual(["ApiEndpointResponseStatus"]);
	});
});

describe("endpoint contract", () => {
	/** An endpoint whose request carries arguments. */
	const schema = z.object({ siteKey: z.string() });

	const endpointWithArgs: ApiEndpoint<typeof schema> = {
		getRequestArgsSchema: () => schema,
		processRequest: async (
			args: z.infer<typeof schema>,
		): Promise<ApiEndpointResponse> => ({
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { siteKey: args.siteKey },
		}),
	};

	const endpointWithoutArgs: ApiEndpoint<undefined> = {
		getRequestArgsSchema: () => undefined,
		processRequest: async (): Promise<ApiEndpointResponse> => ({
			status: ApiEndpointResponseStatus.SUCCESS,
		}),
	};

	it("lets an implementation validate its own arguments with its schema", () => {
		// The point of getRequestArgsSchema: a caller can parse untrusted input
		// against it before ever invoking processRequest.
		const parsed = endpointWithArgs
			.getRequestArgsSchema()
			.safeParse({ siteKey: "abc" });
		expect(parsed.success).toBe(true);
	});

	it("rejects arguments the endpoint's own schema does not accept", () => {
		const parsed = endpointWithArgs.getRequestArgsSchema().safeParse({});
		expect(parsed.success).toBe(false);
	});

	it("allows an endpoint that takes no arguments at all", async () => {
		// The `undefined` branch exists precisely so such an endpoint does not
		// have to invent an empty schema.
		expect(endpointWithoutArgs.getRequestArgsSchema()).toBeUndefined();
		await expect(endpointWithoutArgs.processRequest()).resolves.toEqual({
			status: ApiEndpointResponseStatus.SUCCESS,
		});
	});

	it("carries the request arguments through to the response", async () => {
		await expect(
			endpointWithArgs.processRequest({ siteKey: "abc" }),
		).resolves.toEqual({
			status: ApiEndpointResponseStatus.SUCCESS,
			data: { siteKey: "abc" },
		});
	});

	it("permits a response with neither data nor error", async () => {
		// status is the only required field; a bare acknowledgement is valid.
		const response: ApiEndpointResponse =
			await endpointWithoutArgs.processRequest();
		expect(response.data).toBeUndefined();
		expect(response.error).toBeUndefined();
	});

	it("holds endpoints with differing schemas in one routes record", () => {
		// ApiRoutes is keyed by string and valued by endpoints of any schema, so
		// a provider can mix argument-taking and argument-free endpoints.
		const routes: ApiRoutes = {
			"/with": endpointWithArgs,
			"/without": endpointWithoutArgs,
		};
		const provider: ApiRoutesProvider = { getRoutes: () => routes };

		expect(Object.keys(provider.getRoutes())).toEqual(["/with", "/without"]);
	});

	it("tolerates a provider that exposes no routes", () => {
		// Length 0: a provider registered before its endpoints exist must not be
		// a special case for whatever iterates the record.
		const provider: ApiRoutesProvider = { getRoutes: () => ({}) };
		expect(Object.keys(provider.getRoutes())).toHaveLength(0);
	});

	it("surfaces a rejection rather than swallowing it into a FAIL response", async () => {
		// Nothing in this contract catches; a throwing endpoint rejects, and the
		// layer that mounts it is responsible for turning that into a response.
		const throwing: ApiEndpoint<undefined> = {
			getRequestArgsSchema: () => undefined,
			processRequest: async (): Promise<ApiEndpointResponse> => {
				throw new Error("boom");
			},
		};
		await expect(throwing.processRequest()).rejects.toThrow("boom");
	});
});
