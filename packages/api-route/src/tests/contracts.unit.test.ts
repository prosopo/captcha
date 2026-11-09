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

import {
	AdminApiPaths,
	ClientApiPaths,
	PublicApiPaths,
	type VerificationResponse,
} from "@prosopo/types";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { ApiRouteContract } from "../apiRouteContract.js";
import * as contracts from "../contracts/.export.js";
import type { ApiRouteRequest, ApiRouteResponseData } from "../index.js";

const allContracts: ApiRouteContract[] = Object.values(contracts);

// Declared in ClientApiPaths and called by ProviderApi, but no provider
// router serves them.
const unservedClientPaths: string[] = [
	ClientApiPaths.GetProviderStatus,
	ClientApiPaths.SubmitUserEvents,
];

describe("provider route contracts", () => {
	it("gives every path one contract", () => {
		const paths = allContracts.map((contract) => contract.path);
		expect(new Set(paths).size).toBe(paths.length);
	});

	it("covers every served client, admin and public path", () => {
		const declared = [
			...Object.values(ClientApiPaths),
			...Object.values(AdminApiPaths),
			...Object.values(PublicApiPaths),
		].filter((path) => !unservedClientPaths.includes(path));
		expect(allContracts.map((contract) => contract.path).sort()).toEqual(
			declared.sort(),
		);
	});

	it("serves admin and client routes over POST and public routes over GET", () => {
		const publicPaths: string[] = Object.values(PublicApiPaths);
		for (const contract of allContracts) {
			expect(contract.method).toBe(
				publicPaths.includes(contract.path) ? "get" : "post",
			);
		}
	});

	it("accepts a body the request schema allows and rejects one it does not", () => {
		const body = { sessionId: "s" };
		expect(
			contracts.getSessionRoute.requestSchema.safeParse(body).success,
		).toBe(true);
		expect(contracts.getSessionRoute.requestSchema.safeParse({}).success).toBe(
			false,
		);
	});

	it("types the request and response from the contract", () => {
		expectTypeOf<
			ApiRouteRequest<typeof contracts.getSessionRoute>
		>().toEqualTypeOf<{ sessionId: string }>();
		expectTypeOf<
			ApiRouteResponseData<typeof contracts.verifyPowCaptchaSolutionRoute>
		>().toEqualTypeOf<VerificationResponse>();
		expectTypeOf<
			ApiRouteResponseData<typeof contracts.registerSiteKeyRoute>
		>().toBeUndefined();
		expectTypeOf(
			contracts.healthzRoute.path,
		).toEqualTypeOf<PublicApiPaths.Healthz>();
	});
});
