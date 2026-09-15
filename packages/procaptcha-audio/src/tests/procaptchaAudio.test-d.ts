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

import type { Ti18n } from "@prosopo/locale";
import type {
	AudioEvent,
	FrictionlessState,
	GetAudioCaptchaResponse,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
	ProcaptchaProps,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
} from "@prosopo/types";
import type { ReactElement } from "react";
import { assertType, describe, expectTypeOf, test } from "vitest";
import type * as entrypoint from "../index.js";
import { ProcaptchaAudio } from "../index.js";
import { Manager } from "../services/Manager.js";
import {
	audioEvents,
	challengeResponse,
	config,
	frictionless,
	state,
} from "./managerHarness.js";

/** The widget only ever reads `language`/`changeLanguage` off this. */
const i18n = (): Ti18n => undefined as unknown as Ti18n;

describe("the package entrypoint's types", () => {
	test("ProcaptchaAudio takes the shared widget props and renders an element", () => {
		expectTypeOf(ProcaptchaAudio).parameters.toEqualTypeOf<[ProcaptchaProps]>();
		expectTypeOf(ProcaptchaAudio).returns.toExtend<ReactElement>();
	});

	test("the inner widget's default export is not re-exported", () => {
		// `export *` skips default exports, so consumers can only reach the lazy
		// wrapper — the one that works without a code-splitting bundler.
		expectTypeOf<keyof typeof entrypoint>().toEqualTypeOf<"ProcaptchaAudio">();
	});

	test("config, callbacks and i18n are all required", () => {
		// @ts-expect-error - a widget with no config has no provider to talk to.
		assertType<ProcaptchaProps>({ callbacks: {}, i18n: i18n() });
		// @ts-expect-error - callbacks decide what a solve reports back.
		assertType<ProcaptchaProps>({ config: config(), i18n: i18n() });
		assertType<ProcaptchaProps>({
			config: config(),
			callbacks: {},
			i18n: i18n(),
		});
	});
});

describe("Manager's types", () => {
	const updateState: ProcaptchaStateUpdateFn = () => undefined;
	const callbacks: ProcaptchaCallbacks = {};

	test("only the first four arguments are required", () => {
		assertType<ReturnType<typeof Manager>>(
			Manager(config(), state(), updateState, callbacks),
		);
		// @ts-expect-error - callbacks decide what a solve reports back.
		Manager(config(), state(), updateState);
	});

	test("the optional arguments keep their positions", () => {
		expectTypeOf(Manager)
			.parameter(4)
			.toEqualTypeOf<FrictionlessState | undefined>();
		expectTypeOf(Manager)
			.parameter(5)
			.toEqualTypeOf<(() => string | undefined) | undefined>();
		// The frictionless wrapper's re-mint hook. A wrong answer spends the
		// challenge, so the retry has to come from a fresh session.
		expectTypeOf(Manager)
			.parameter(6)
			.toEqualTypeOf<((x?: number, y?: number) => void) | undefined>();
	});

	test("it exposes exactly start, submitSolution and resetState", () => {
		expectTypeOf<keyof ReturnType<typeof Manager>>().toEqualTypeOf<
			"start" | "submitSolution" | "resetState"
		>();
	});

	test("start hands back the clip the player needs, never the transcript", () => {
		expectTypeOf<ReturnType<typeof Manager>["start"]>().toEqualTypeOf<
			(x?: number, y?: number) => Promise<GetAudioCaptchaResponse | undefined>
		>();
		// The response has no field the answer could be assigned to.
		expectTypeOf<GetAudioCaptchaResponse>().not.toHaveProperty("answer");
	});

	test("submitSolution takes the typed answer, the replay count and the event trail", () => {
		expectTypeOf<
			Parameters<ReturnType<typeof Manager>["submitSolution"]>
		>().toEqualTypeOf<
			[answer: string, replays: number, audioEvents: AudioEvent[]]
		>();
		expectTypeOf<
			ReturnType<ReturnType<typeof Manager>["submitSolution"]>
		>().toEqualTypeOf<Promise<boolean>>();
	});

	test("resetState takes the frictionless restart callback and nothing else", () => {
		expectTypeOf<
			Parameters<ReturnType<typeof Manager>["resetState"]>
		>().toEqualTypeOf<[frictionlessRestart?: (() => void) | undefined]>();
		expectTypeOf<
			ReturnType<ReturnType<typeof Manager>["resetState"]>
		>().toEqualTypeOf<void>();
	});

	test("the answer is a string, so leading zeros survive", () => {
		const manager: ReturnType<typeof Manager> = Manager(
			config(),
			state(),
			updateState,
			callbacks,
			frictionless(),
		);
		// @ts-expect-error - a number would drop the leading zero in "01234".
		manager.submitSolution(1234, 0, audioEvents());
		// @ts-expect-error - the trail is required; a silent solve still sends [].
		manager.submitSolution("01234", 0);
	});
});

describe("the harness fixtures match the shared types", () => {
	test("they build the real shapes, not lookalikes", () => {
		expectTypeOf(config()).toEqualTypeOf<ProcaptchaClientConfigInput>();
		expectTypeOf(state()).toEqualTypeOf<ProcaptchaState>();
		expectTypeOf(frictionless()).toEqualTypeOf<FrictionlessState>();
		expectTypeOf(challengeResponse()).toEqualTypeOf<GetAudioCaptchaResponse>();
		expectTypeOf(audioEvents()).toEqualTypeOf<AudioEvent[]>();
	});
});
