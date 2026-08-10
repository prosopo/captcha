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

import type { IncomingHttpHeaders } from "node:http";
import type { ProcaptchaOutput } from "@prosopo/types";
import type { RequestHandler, Router } from "express";
import { assertType, describe, expectTypeOf, test } from "vitest";
import {
	type ApiNext,
	type ApiRequest,
	type ApiResponse,
	type RouterDeps,
	createDatabase,
	createTestHandler,
	createVerifyHandler,
	defaultRouterDeps,
	prosopoRouter,
	toRequestHandler,
} from "../api.js";
import type { JA4Data, JA4Database, JA4Store } from "../db.js";
import { isMain } from "../isMain.js";
import type { VerificationOutcome } from "../verify.js";
import { verifyProcaptchaOutput } from "../verify.js";

describe("the handlers", () => {
	test("are usable as express middleware once adapted", () => {
		// The narrow request and response types exist so the handlers can be
		// called with plain objects in tests; toRequestHandler is the only place
		// that has to know they are really express objects.
		assertType<RequestHandler>(
			toRequestHandler(createVerifyHandler(defaultRouterDeps())),
		);
		assertType<RequestHandler>(
			toRequestHandler(createTestHandler(defaultRouterDeps())),
		);
	});

	test("a handler that does not take a next is still adaptable", () => {
		// The test route answers everything itself, so it must not be forced to
		// declare a parameter it never uses.
		expectTypeOf(toRequestHandler).toBeCallableWith(
			async (): Promise<void> => undefined,
		);
	});

	test("resolve rather than returning a response object", () => {
		// Returning the response would let a handler accidentally reply twice.
		expectTypeOf(createVerifyHandler).returns.returns.toEqualTypeOf<
			Promise<void>
		>();
		expectTypeOf(createTestHandler).returns.returns.toEqualTypeOf<
			Promise<void>
		>();
	});

	test("treat the request body as unknown until it is parsed", () => {
		// Typing it as the parsed shape would let the schema check be skipped.
		expectTypeOf<ApiRequest["body"]>().toEqualTypeOf<unknown>();
		expectTypeOf<ApiRequest["headers"]>().toEqualTypeOf<IncomingHttpHeaders>();
		expectTypeOf<ApiRequest["t"]>().toEqualTypeOf<(key: string) => string>();
	});

	test("can only send an object as json", () => {
		expectTypeOf<ApiResponse["json"]>().parameter(0).toEqualTypeOf<object>();
		// @ts-expect-error a bare string is not a json body
		assertType<Parameters<ApiResponse["json"]>[0]>("done");
	});

	test("pass an unknown error to next, not a fixed error class", () => {
		expectTypeOf<ApiNext>().toEqualTypeOf<(error: unknown) => void>();
	});
});

describe("RouterDeps", () => {
	test("depends on the narrow store, not the mongo class", () => {
		// A test double must be able to satisfy it without a mongo connection.
		expectTypeOf<RouterDeps["db"]>().toEqualTypeOf<JA4Store>();
		expectTypeOf<JA4Database>().toExtend<JA4Store>();
	});

	test("the store's write can report that nothing was found", () => {
		expectTypeOf<JA4Store["addOrUpdateJA4Record"]>()
			.parameter(0)
			.toEqualTypeOf<JA4Data>();
		expectTypeOf<JA4Store["connect"]>().toEqualTypeOf<() => Promise<void>>();
		expectTypeOf<JA4Store["close"]>().toEqualTypeOf<() => Promise<void>>();
	});

	test("a record needs a fingerprint and a user agent, and nothing else", () => {
		assertType<JA4Data>({ ja4_fingerprint: "fp", user_agent_string: "ua" });
		// @ts-expect-error the fingerprint is what the record is keyed by
		assertType<JA4Data>({ user_agent_string: "ua" });
		// @ts-expect-error the user agent is the other half of the unique index
		assertType<JA4Data>({ ja4_fingerprint: "fp" });
	});

	test("every dependency is required", () => {
		const partial: Pick<RouterDeps, "logger"> = { logger: null as never };
		// @ts-expect-error db, getJA4 and decodeToken are not optional
		assertType<RouterDeps>(partial);
	});

	test("defaultRouterDeps takes no arguments and supplies them all", () => {
		expectTypeOf(defaultRouterDeps).toEqualTypeOf<() => RouterDeps>();
	});
});

describe("the router", () => {
	test("can be built with or without dependencies", () => {
		expectTypeOf(prosopoRouter).returns.toEqualTypeOf<Router>();
		assertType<Router>(prosopoRouter());
		assertType<Router>(prosopoRouter(defaultRouterDeps()));
	});

	test("createDatabase reads an environment, not a config object", () => {
		expectTypeOf(createDatabase).returns.toEqualTypeOf<JA4Database>();
		expectTypeOf(createDatabase)
			.parameter(0)
			.toEqualTypeOf<NodeJS.ProcessEnv | undefined>();
	});
});

describe("verifyProcaptchaOutput", () => {
	test("needs only the three fields it inspects", () => {
		// Requiring a whole ProcaptchaOutput would force callers to invent a
		// signature and a timestamp that have no bearing on the answer.
		expectTypeOf(verifyProcaptchaOutput)
			.parameter(0)
			.toEqualTypeOf<
				Pick<ProcaptchaOutput, "user" | "dapp" | "commitmentId">
			>();
		assertType<VerificationOutcome>(
			verifyProcaptchaOutput({ user: "u", dapp: "d", commitmentId: undefined }),
		);
	});

	test("reports a commitment only when there is one", () => {
		expectTypeOf<VerificationOutcome["commitmentId"]>().toEqualTypeOf<
			string | undefined
		>();
		expectTypeOf<VerificationOutcome["verified"]>().toEqualTypeOf<boolean>();
		expectTypeOf<
			VerificationOutcome["statusMessage"]
		>().toEqualTypeOf<string>();
	});
});

describe("isMain", () => {
	test("the entrypoint is optional and defaults to argv", () => {
		expectTypeOf(isMain).toBeCallableWith("file:///a.js");
		expectTypeOf(isMain).toBeCallableWith("file:///a.js", "/a.js");
		expectTypeOf(isMain).returns.toEqualTypeOf<boolean>();
	});
});
