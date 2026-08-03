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

import type { ProviderApi } from "@prosopo/api";
import type {
	CaptchaResponseBody,
	FrictionlessState,
	ProcaptchaApiInterface,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigOutput,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
	ProsopoKeyboardEvent,
	ProsopoMouseEvent,
	ProsopoTouchEvent,
	RandomProvider,
	TCaptchaSubmitResult,
} from "@prosopo/types";
import { describe, expectTypeOf, test } from "vitest";
import type * as entrypoint from "../index.js";
import type { Manager } from "../modules/Manager.js";
import type { ProsopoCaptchaApi } from "../modules/ProsopoCaptchaApi.js";
import { startCollector } from "../modules/collector.js";

describe("public entrypoint", () => {
	test("re-exports the manager, the captcha api and the collector", () => {
		expectTypeOf<typeof entrypoint.Manager>().toEqualTypeOf<typeof Manager>();
		expectTypeOf<typeof entrypoint.ProsopoCaptchaApi>().toEqualTypeOf<
			typeof ProsopoCaptchaApi
		>();
		expectTypeOf<typeof entrypoint.startCollector>().toEqualTypeOf<
			typeof startCollector
		>();
	});
});

describe("Manager", () => {
	test("takes a parsed config, mutable state and the update hook", () => {
		type Params = Parameters<typeof Manager>;
		expectTypeOf<Params[0]>().toEqualTypeOf<ProcaptchaClientConfigOutput>();
		expectTypeOf<Params[1]>().toEqualTypeOf<ProcaptchaState>();
		expectTypeOf<Params[2]>().toEqualTypeOf<ProcaptchaStateUpdateFn>();
		expectTypeOf<Params[3]>().toEqualTypeOf<ProcaptchaCallbacks>();
	});

	test("treats the frictionless state and honeypot reader as optional", () => {
		type Params = Parameters<typeof Manager>;
		expectTypeOf<Params[4]>().toEqualTypeOf<FrictionlessState | undefined>();
		expectTypeOf<Params[5]>().toEqualTypeOf<
			(() => string | undefined) | undefined
		>();
	});

	test("returns only the six controls the widgets drive", () => {
		type Controls = keyof ReturnType<typeof Manager>;
		expectTypeOf<Controls>().toEqualTypeOf<
			"start" | "cancel" | "submit" | "select" | "nextRound" | "reload"
		>();
	});

	test("exposes start, submit, cancel and reload as async", () => {
		type Api = ReturnType<typeof Manager>;
		expectTypeOf<ReturnType<Api["start"]>>().toEqualTypeOf<Promise<void>>();
		expectTypeOf<ReturnType<Api["submit"]>>().toEqualTypeOf<Promise<void>>();
		expectTypeOf<ReturnType<Api["cancel"]>>().toEqualTypeOf<Promise<void>>();
		expectTypeOf<ReturnType<Api["reload"]>>().toEqualTypeOf<Promise<void>>();
	});

	test("keeps select and nextRound synchronous", () => {
		type Api = ReturnType<typeof Manager>;
		expectTypeOf<ReturnType<Api["select"]>>().toEqualTypeOf<void>();
		expectTypeOf<ReturnType<Api["nextRound"]>>().toEqualTypeOf<void>();
	});

	test("defaults the checkbox coordinates and the select coordinates", () => {
		type Api = ReturnType<typeof Manager>;
		expectTypeOf<Parameters<Api["start"]>>().toEqualTypeOf<
			[checkboxX?: number, checkboxY?: number]
		>();
		expectTypeOf<Parameters<Api["select"]>>().toEqualTypeOf<
			[hash: string, x?: number, y?: number]
		>();
	});

	test("rejects an unparsed config", () => {
		// The manager needs schema defaults such as
		// captchas.image.solutionTimeout, so a bare input config is not enough.
		expectTypeOf<Parameters<typeof Manager>[0]>().not.toExtend<{
			account: { address: string };
		}>();
	});
});

describe("ProsopoCaptchaApi", () => {
	test("implements the shared procaptcha api interface", () => {
		expectTypeOf<ProsopoCaptchaApi>().toExtend<ProcaptchaApiInterface>();
	});

	test("is constructed from an account, provider, client and site key", () => {
		expectTypeOf<
			ConstructorParameters<typeof ProsopoCaptchaApi>
		>().toEqualTypeOf<
			[
				userAccount: string,
				provider: RandomProvider,
				providerApi: ProviderApi,
				web2: boolean,
				dappAccount: string,
			]
		>();
	});

	test("exposes web2 read-only and the provider it was bound to", () => {
		expectTypeOf<ProsopoCaptchaApi["web2"]>().toEqualTypeOf<boolean>();
		expectTypeOf<
			ProsopoCaptchaApi["provider"]
		>().toEqualTypeOf<RandomProvider>();
	});

	test("returns a challenge body and a submit result", () => {
		expectTypeOf<
			ReturnType<ProsopoCaptchaApi["getCaptchaChallenge"]>
		>().toEqualTypeOf<Promise<CaptchaResponseBody>>();
		expectTypeOf<
			ReturnType<ProsopoCaptchaApi["submitCaptchaSolution"]>
		>().toEqualTypeOf<Promise<TCaptchaSubmitResult>>();
	});

	test("treats session id and simd readings as optional on the challenge", () => {
		expectTypeOf<
			Parameters<ProsopoCaptchaApi["getCaptchaChallenge"]>
		>().toEqualTypeOf<[sessionId?: string, simdReadings?: string]>();
	});
});

describe("startCollector", () => {
	test("takes one setter per event stream plus the widget root", () => {
		type Params = Parameters<typeof startCollector>;
		expectTypeOf<Params[3]>().toEqualTypeOf<HTMLDivElement>();
		expectTypeOf<Params>().toHaveProperty("length");
	});

	test("accepts react-style functional updaters", () => {
		expectTypeOf(startCollector).toBeCallableWith(
			(
				update:
					| ProsopoMouseEvent[]
					| ((prev: ProsopoMouseEvent[]) => ProsopoMouseEvent[]),
			) => void update,
			(
				update:
					| ProsopoTouchEvent[]
					| ((prev: ProsopoTouchEvent[]) => ProsopoTouchEvent[]),
			) => void update,
			(
				update:
					| ProsopoKeyboardEvent[]
					| ((prev: ProsopoKeyboardEvent[]) => ProsopoKeyboardEvent[]),
			) => void update,
			document.createElement("div"),
		);
	});

	test("returns nothing — there is no handle to detach the listeners", () => {
		expectTypeOf<ReturnType<typeof startCollector>>().toEqualTypeOf<void>();
	});

	test("rejects a mouse setter wired to the keyboard stream", () => {
		expectTypeOf(startCollector)
			.parameter(0)
			.not.toExtend<(update: ProsopoKeyboardEvent[]) => void>();
	});
});
