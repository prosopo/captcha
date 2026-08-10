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
	ProcaptchaCallbacks,
	ProcaptchaClientConfigInput,
	ProcaptchaEscalationHandler,
	ProcaptchaProps,
	ProcaptchaState,
	ProcaptchaStateUpdateFn,
} from "@prosopo/types";
import type { ReactElement } from "react";
import { assertType, describe, expectTypeOf, test } from "vitest";
import type * as entrypoint from "../index.js";
import { ProcaptchaPow } from "../index.js";
import { Manager } from "../services/Manager.js";
import { config, frictionless, state } from "./managerHarness.js";

/** The widget only ever reads `language`/`changeLanguage` off this. */
const i18n = (): Ti18n => undefined as unknown as Ti18n;

describe("the package entrypoint's types", () => {
	test("ProcaptchaPow takes the shared widget props and renders an element", () => {
		expectTypeOf(ProcaptchaPow).parameters.toEqualTypeOf<[ProcaptchaProps]>();
		expectTypeOf(ProcaptchaPow).returns.toExtend<ReactElement>();
	});

	test("the inner widget's default export is not re-exported", () => {
		// `export *` skips default exports, so consumers can only reach the lazy
		// wrapper — the one that works without a code-splitting bundler.
		expectTypeOf<keyof typeof entrypoint>().toEqualTypeOf<"ProcaptchaPow">();
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
			.toEqualTypeOf<ProcaptchaEscalationHandler | undefined>();
		expectTypeOf(Manager)
			.parameter(6)
			.toEqualTypeOf<(() => string | undefined) | undefined>();
	});

	test("it exposes exactly start and resetState", () => {
		expectTypeOf<keyof ReturnType<typeof Manager>>().toEqualTypeOf<
			"start" | "resetState"
		>();
		expectTypeOf<ReturnType<typeof Manager>["start"]>().toEqualTypeOf<
			(x?: number, y?: number) => Promise<void>
		>();
		// resetState takes the frictionless restart callback the widget hands it
		// on an invalidated session, and nothing else.
		expectTypeOf<
			Parameters<ReturnType<typeof Manager>["resetState"]>
		>().toEqualTypeOf<[frictionlessRestart?: (() => void) | undefined]>();
		expectTypeOf<
			ReturnType<ReturnType<typeof Manager>["resetState"]>
		>().toEqualTypeOf<void>();
	});

	test("start's coordinates are optional numbers", () => {
		const manager: ReturnType<typeof Manager> = Manager(
			config(),
			state(),
			updateState,
			callbacks,
			frictionless(),
		);
		expectTypeOf(manager.start()).toEqualTypeOf<Promise<void>>();
		expectTypeOf(manager.start(1, 2)).toEqualTypeOf<Promise<void>>();
		// @ts-expect-error - coordinates come off a DOM event, never as strings.
		manager.start("1", "2");
	});
});

describe("the harness fixtures match the shared types", () => {
	test("they build the real shapes, not lookalikes", () => {
		expectTypeOf(config()).toEqualTypeOf<ProcaptchaClientConfigInput>();
		expectTypeOf(state()).toEqualTypeOf<ProcaptchaState>();
		expectTypeOf(frictionless()).toEqualTypeOf<FrictionlessState>();
	});
});
