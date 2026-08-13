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

import type { Captcha, ProcaptchaProps } from "@prosopo/types";
import { assertType, describe, expectTypeOf, test } from "vitest";
import type { CaptchaComponentProps } from "../components/captchaComponent.js";
import type { CaptchaWidgetProps } from "../components/captchaWidget.js";
import { mountProcaptcha } from "../components/procaptcha.js";
import type { ProcaptchaWidgetHandle } from "../components/procaptchaWidget.js";
import addDataAttr from "../util/index.js";

describe("the package's public surface", () => {
	test("mountProcaptcha takes a host element and the shared props type", () => {
		expectTypeOf(mountProcaptcha).parameter(0).toEqualTypeOf<HTMLElement>();
		expectTypeOf(mountProcaptcha).parameter(1).toEqualTypeOf<ProcaptchaProps>();
	});

	test("mounting hands back a handle that can tear the widget down", () => {
		expectTypeOf(
			mountProcaptcha,
		).returns.toEqualTypeOf<ProcaptchaWidgetHandle>();
		expectTypeOf<ProcaptchaWidgetHandle["destroy"]>().toEqualTypeOf<
			() => void
		>();
	});
});

describe("CaptchaWidget's props", () => {
	test("takes a single captcha, not the whole challenge", () => {
		expectTypeOf<CaptchaWidgetProps["challenge"]>().toEqualTypeOf<Captcha>();
	});

	test("reports a selection as a hash and a pair of coordinates", () => {
		expectTypeOf<CaptchaWidgetProps["onClick"]>().toEqualTypeOf<
			(hash: string, x: number, y: number) => void
		>();
	});

	test("accepts only the two themes the palette defines", () => {
		expectTypeOf<CaptchaWidgetProps["themeColor"]>().toEqualTypeOf<
			"light" | "dark"
		>();
	});

	test("rejects a theme name the palette does not have", () => {
		// @ts-expect-error a third theme would silently fall back to dark
		assertType<CaptchaWidgetProps["themeColor"]>("blue");
	});

	test("holds the solution as hash-plus-coordinates triples", () => {
		expectTypeOf<CaptchaWidgetProps["solution"]>().toEqualTypeOf<
			[string, number, number][]
		>();
	});

	test("cannot be mounted without a solution to display", () => {
		assertType<CaptchaWidgetProps>({
			challenge: {} as Captcha,
			solution: [],
			onClick: () => undefined,
			themeColor: "light",
		});
		// @ts-expect-error solution is required, not defaulted
		assertType<CaptchaWidgetProps>({
			challenge: {} as Captcha,
			onClick: () => undefined,
			themeColor: "light",
		});
	});
});

describe("CaptchaComponent's props", () => {
	test("takes the round to render as a number", () => {
		expectTypeOf<CaptchaComponentProps["index"]>().toEqualTypeOf<number>();
	});

	test("takes one solution list per round", () => {
		expectTypeOf<CaptchaComponentProps["solutions"]>().toEqualTypeOf<
			[string, number, number][][]
		>();
	});

	test("lets a click be reported without coordinates", () => {
		// The manager's `select` takes them as optional, so the component's
		// handler has to be assignable from it.
		expectTypeOf<CaptchaComponentProps["onClick"]>().toEqualTypeOf<
			(hash: string, x?: number, y?: number) => void
		>();
	});

	test("takes callbacks that report nothing back", () => {
		expectTypeOf<CaptchaComponentProps["onSubmit"]>().toEqualTypeOf<
			() => void
		>();
		expectTypeOf<CaptchaComponentProps["onCancel"]>().toEqualTypeOf<
			() => void
		>();
		expectTypeOf<CaptchaComponentProps["onNext"]>().toEqualTypeOf<() => void>();
		expectTypeOf<CaptchaComponentProps["onReload"]>().toEqualTypeOf<
			() => void
		>();
	});
});

describe("addDataAttr", () => {
	test("returns an object of attributes, not the input", () => {
		expectTypeOf(addDataAttr({ general: { cy: "x" } })).toBeObject();
	});

	test("takes both groups as optional", () => {
		assertType(addDataAttr({}));
		assertType(addDataAttr({ general: { cy: "x" } }));
		assertType(addDataAttr({ dev: { cy: "x" } }));
	});

	test("rejects attribute values that are not strings", () => {
		// Anything else lands in the DOM stringified, e.g. "[object Object]".
		// @ts-expect-error numbers are not accepted
		assertType(addDataAttr({ general: { cy: 1 } }));
	});
});
