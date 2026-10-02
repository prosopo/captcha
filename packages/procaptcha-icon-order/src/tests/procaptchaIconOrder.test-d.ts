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

import type { Ti18n, Translator } from "@prosopo/locale";
import type {
	FrictionlessState,
	GetIconOrderCaptchaResponse,
	IconClick,
	IconOrderEvent,
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
	ProcaptchaProps,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
} from "@prosopo/types";
import { lightTheme } from "@prosopo/widget-skeleton";
import { assertType, describe, expectTypeOf, test } from "vitest";
import {
	type IconOrderCanvasProps,
	mountIconOrderCanvas,
} from "../components/iconOrderCanvas.js";
import type * as entrypoint from "../index.js";
import { mountProcaptchaIconOrder } from "../index.js";
import { Manager } from "../services/Manager.js";
import {
	challengeResponse,
	clicks,
	config,
	frictionless,
	iconOrderEvents,
	state,
} from "./managerHarness.js";

/** The widget only ever reads `language`/`changeLanguage` off this. */
const i18n = (): Ti18n => undefined as unknown as Ti18n;

describe("the package entrypoint's types", () => {
	test("mountProcaptchaIconOrder takes a host element and the shared widget props", () => {
		expectTypeOf(mountProcaptchaIconOrder).parameters.toEqualTypeOf<
			[HTMLElement, ProcaptchaProps]
		>();
		expectTypeOf(mountProcaptchaIconOrder).returns.toExtend<{
			destroy: () => void;
		}>();
	});

	test("the entrypoint exposes the lazy wrapper and the widget itself", () => {
		expectTypeOf<keyof typeof entrypoint>().toEqualTypeOf<
			| "mountProcaptchaIconOrder"
			| "loadProcaptchaIconOrder"
			| "mountProcaptchaIconOrderWidget"
			| "mountIconOrderCanvas"
		>();
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

	test("it exposes exactly start, submitSolution, resetState and dispose", () => {
		expectTypeOf<keyof ReturnType<typeof Manager>>().toEqualTypeOf<
			"start" | "submitSolution" | "resetState" | "dispose"
		>();
	});

	test("start hands back the challenge the canvas needs to draw", () => {
		// The widget renders the imagery from the returned challenge.
		expectTypeOf<ReturnType<typeof Manager>["start"]>().toEqualTypeOf<
			(
				x?: number,
				y?: number,
			) => Promise<GetIconOrderCaptchaResponse | undefined>
		>();
	});

	test("submitSolution takes the ordered clicks and the full event trail", () => {
		expectTypeOf<
			Parameters<ReturnType<typeof Manager>["submitSolution"]>
		>().toEqualTypeOf<
			[clicks: IconClick[], iconOrderEvents: IconOrderEvent[]]
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
		// @ts-expect-error - the trail is required; a no-move solve still sends [].
		manager.submitSolution(clicks());
	});
});

describe("IconOrderCanvas' types", () => {
	const translator = (): Translator => undefined as unknown as Translator;
	const onComplete = (_clicks: IconClick[], _events: IconOrderEvent[]): void =>
		undefined;

	test("every prop is required, since none has a sensible default", () => {
		// @ts-expect-error - a frame with no imagery cannot be rendered.
		mountIconOrderCanvas({ showRetry: false, submitting: false });
		// @ts-expect-error - `submitting` gates clicking; omitting it unlocks it.
		mountIconOrderCanvas({
			background: "data:image/webp;base64,UklGRg==",
			legend: "data:image/webp;base64,TEdORA==",
			legendIconSize: 26,
			onComplete,
			showRetry: false,
			theme: lightTheme,
			translator: translator(),
		});
	});

	test("the full prop set mounts a component that can be updated and torn down", () => {
		expectTypeOf(
			mountIconOrderCanvas({
				background: "data:image/webp;base64,UklGRg==",
				legend: "data:image/webp;base64,TEdORA==",
				legendIconSize: 26,
				onComplete,
				showRetry: false,
				submitting: false,
				theme: lightTheme,
				translator: translator(),
			}),
		).toExtend<{
			update: (props: IconOrderCanvasProps) => void;
			destroy: () => void;
		}>();
	});

	test("the answer is reported synchronously, not as a promise", () => {
		// Must not return the widget's promise: the canvas would drop it.
		expectTypeOf(onComplete).returns.toEqualTypeOf<void>();
	});
});

describe("the harness fixtures match the shared types", () => {
	test("they build the real shapes, not lookalikes", () => {
		expectTypeOf(config()).toEqualTypeOf<ProcaptchaClientConfigInput>();
		expectTypeOf(state()).toEqualTypeOf<ProcaptchaState>();
		expectTypeOf(frictionless()).toEqualTypeOf<FrictionlessState>();
		expectTypeOf(
			challengeResponse(),
		).toEqualTypeOf<GetIconOrderCaptchaResponse>();
		expectTypeOf(clicks()).toEqualTypeOf<IconClick[]>();
		expectTypeOf(iconOrderEvents()).toEqualTypeOf<IconOrderEvent[]>();
	});
});
