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

import type {
	ApiResponse,
	CaptchaResponseBody,
	GetFrictionlessCaptchaResponse,
	GetPowCaptchaResponse,
	ProviderApiInterface,
	VerificationResponse,
} from "@prosopo/types";
import { assertType, describe, expectTypeOf, test } from "vitest";
import HttpClientBase from "../api/HttpClientBase.js";
import type { HttpError } from "../api/HttpError.js";
import ProviderApi, { VERIFY_FORWARDED_HEADER } from "../api/ProviderApi.js";
import { ApiClient } from "../api/apiClient.js";
import type * as entrypoint from "../index.js";

describe("the package entrypoint", () => {
	test("exports exactly the client surface", () => {
		expectTypeOf<typeof entrypoint.ProviderApi>().toEqualTypeOf<
			typeof ProviderApi
		>();
		expectTypeOf<typeof entrypoint.ApiClient>().toEqualTypeOf<
			typeof ApiClient
		>();
		expectTypeOf<typeof entrypoint.HttpError>().toEqualTypeOf<
			typeof HttpError
		>();
		expectTypeOf<typeof entrypoint.HttpClientBase>().toEqualTypeOf<
			typeof HttpClientBase
		>();
		expectTypeOf<
			typeof entrypoint.VERIFY_FORWARDED_HEADER
		>().toExtend<string>();
	});

	test("the forwarded marker is a string constant callers can set as a header", () => {
		expectTypeOf(VERIFY_FORWARDED_HEADER).toExtend<string>();
	});
});

describe("HttpClientBase's types", () => {
	test("takes a base URL and an optional prefix", () => {
		expectTypeOf<ConstructorParameters<typeof HttpClientBase>>().toEqualTypeOf<
			[baseURL: string, prefix?: string]
		>();
	});

	test("the transport methods are not part of the public surface", () => {
		// They are protected: only subclasses may call them.
		// @ts-expect-error - fetch is protected.
		expectTypeOf(new HttpClientBase("url").fetch).toBeCallableWith("/path");
	});
});

describe("HttpError's types", () => {
	test("carries the status, text and URL", () => {
		expectTypeOf<ConstructorParameters<typeof HttpError>>().toEqualTypeOf<
			[status: number, statusText: string, url: string]
		>();
		expectTypeOf<HttpError["status"]>().toEqualTypeOf<number>();
		expectTypeOf<HttpError["statusText"]>().toEqualTypeOf<string>();
		expectTypeOf<HttpError["url"]>().toEqualTypeOf<string>();
		expectTypeOf<HttpError>().toExtend<Error>();
	});
});

describe("ApiClient's types", () => {
	test("needs both a URL and the account it speaks for", () => {
		expectTypeOf<ConstructorParameters<typeof ApiClient>>().toEqualTypeOf<
			[baseUrl: string, account: string]
		>();
		// @ts-expect-error - a client with no account cannot set the site key
		// header, so every request would be unattributable.
		assertType<ApiClient>(new ApiClient("https://provider.prosopo.io"));
	});
});

describe("ProviderApi's types", () => {
	test("implements the shared provider interface", () => {
		expectTypeOf<ProviderApi>().toExtend<ProviderApiInterface>();
		expectTypeOf<ProviderApi>().toExtend<ApiClient>();
	});

	test("the challenge fetchers take optional session and simd arguments", () => {
		expectTypeOf<
			Parameters<ProviderApi["getPowCaptchaChallenge"]>
		>().toEqualTypeOf<
			[user: string, dapp: string, sessionId?: string, simdReadings?: string]
		>();
		expectTypeOf<
			ReturnType<ProviderApi["getPowCaptchaChallenge"]>
		>().toEqualTypeOf<Promise<GetPowCaptchaResponse>>();
	});

	test("challenge responses all extend the shared ApiResponse", () => {
		expectTypeOf<GetPowCaptchaResponse>().toExtend<ApiResponse>();
		expectTypeOf<GetFrictionlessCaptchaResponse>().toExtend<ApiResponse>();
	});

	test("the image challenge returns the captcha body", () => {
		expectTypeOf<
			ReturnType<ProviderApi["getCaptchaChallenge"]>
		>().toEqualTypeOf<Promise<CaptchaResponseBody>>();
	});

	test("verification calls resolve to a verification response", () => {
		expectTypeOf<
			ReturnType<ProviderApi["submitPowCaptchaVerify"]>
		>().toEqualTypeOf<Promise<VerificationResponse>>();
		expectTypeOf<
			ReturnType<ProviderApi["submitPuzzleCaptchaVerify"]>
		>().toEqualTypeOf<Promise<VerificationResponse>>();
		expectTypeOf<ReturnType<ProviderApi["forwardVerify"]>>().toEqualTypeOf<
			Promise<VerificationResponse>
		>();
	});

	test("the in-flight dedupe map is private, not part of the contract", () => {
		const client = new ProviderApi("url", "account");
		// @ts-expect-error - callers must not reach into the dedupe state.
		client.inFlightChallenges;
	});
});
