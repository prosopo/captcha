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
	FrictionlessState,
	GetPuzzleCaptchaResponse,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
	ProcaptchaProps,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
	PuzzleEvent,
} from "@prosopo/types";
import { lightTheme } from "@prosopo/widget-skeleton";
import type { ReactElement } from "react";
import { assertType, describe, expectTypeOf, test } from "vitest";
import { PuzzleCanvas } from "../components/PuzzleCanvas.js";
import type * as entrypoint from "../index.js";
import { ProcaptchaPuzzle } from "../index.js";
import { Manager } from "../services/Manager.js";
import {
	challengeResponse,
	config,
	frictionless,
	puzzleEvents,
	state,
} from "./managerHarness.js";

/** The widget only ever reads `language`/`changeLanguage` off this. */
const i18n = (): Ti18n => undefined as unknown as Ti18n;

describe("the package entrypoint's types", () => {
	test("ProcaptchaPuzzle takes the shared widget props and renders an element", () => {
		expectTypeOf(ProcaptchaPuzzle).parameters.toEqualTypeOf<
			[ProcaptchaProps]
		>();
		expectTypeOf(ProcaptchaPuzzle).returns.toExtend<ReactElement>();
	});

	test("the inner widget's default export is not re-exported", () => {
		// `export *` skips default exports, so consumers can only reach the lazy
		// wrapper — the one that works without a code-splitting bundler.
		expectTypeOf<keyof typeof entrypoint>().toEqualTypeOf<"ProcaptchaPuzzle">();
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
	});

	test("it exposes exactly start, submitSolution and resetState", () => {
		expectTypeOf<keyof ReturnType<typeof Manager>>().toEqualTypeOf<
			"start" | "submitSolution" | "resetState"
		>();
	});

	test("start hands back the challenge the canvas needs to draw", () => {
		// Unlike the POW manager, which reports only through state, the puzzle
		// manager returns the challenge — the widget cannot render a board
		// without the origin/target coordinates.
		expectTypeOf<ReturnType<typeof Manager>["start"]>().toEqualTypeOf<
			(x?: number, y?: number) => Promise<GetPuzzleCaptchaResponse | undefined>
		>();
	});

	test("submitSolution takes the drop point and the full event trail", () => {
		expectTypeOf<
			Parameters<ReturnType<typeof Manager>["submitSolution"]>
		>().toEqualTypeOf<
			[finalX: number, finalY: number, events: PuzzleEvent[]]
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

	test("coordinates come off DOM events, so they are numbers", () => {
		const manager: ReturnType<typeof Manager> = Manager(
			config(),
			state(),
			updateState,
			callbacks,
			frictionless(),
		);
		// @ts-expect-error - never strings, whatever the DOM stringifies to.
		manager.start("1", "2");
		// @ts-expect-error - the trail is required; an empty drag still sends [].
		manager.submitSolution(1, 2);
	});
});

describe("PuzzleCanvas' types", () => {
	const onComplete = (
		_finalX: number,
		_finalY: number,
		_events: PuzzleEvent[],
	): void => undefined;

	test("every prop is required, since none has a sensible default", () => {
		// @ts-expect-error - a board with no imagery cannot be rendered.
		PuzzleCanvas({ originX: 0, originY: 0 });
		// @ts-expect-error - `submitting` gates the drag; omitting it unlocks it.
		PuzzleCanvas({
			originX: 0,
			originY: 0,
			background: "data:image/webp;base64,UklGRg==",
			piece: "data:image/webp;base64,UklGRg==",
			pieceSize: 44,
			onComplete,
			showRetry: false,
			retryMessage: "Incorrect, please try again",
			theme: lightTheme,
		});
	});

	test("the full prop set renders an element", () => {
		expectTypeOf(
			PuzzleCanvas({
				originX: 0,
				originY: 0,
				background: "data:image/webp;base64,UklGRg==",
				piece: "data:image/webp;base64,UklGRg==",
				pieceSize: 44,
				onComplete,
				showRetry: false,
				retryMessage: "Incorrect, please try again",
				submitting: false,
				theme: lightTheme,
			}),
		).toExtend<ReactElement>();
	});

	test("the drop is reported synchronously, not as a promise", () => {
		// The widget's own handler is async, but the canvas must not await it:
		// a returned promise here would be dropped on the floor.
		expectTypeOf(onComplete).returns.toEqualTypeOf<void>();
	});
});

describe("the harness fixtures match the shared types", () => {
	test("they build the real shapes, not lookalikes", () => {
		expectTypeOf(config()).toEqualTypeOf<ProcaptchaClientConfigInput>();
		expectTypeOf(state()).toEqualTypeOf<ProcaptchaState>();
		expectTypeOf(frictionless()).toEqualTypeOf<FrictionlessState>();
		expectTypeOf(challengeResponse()).toEqualTypeOf<GetPuzzleCaptchaResponse>();
		expectTypeOf(puzzleEvents()).toEqualTypeOf<PuzzleEvent[]>();
	});
});
