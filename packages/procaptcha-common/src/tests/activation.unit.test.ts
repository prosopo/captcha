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

import { InputMethod } from "@prosopo/types";
import { describe, expect, test } from "vitest";
import { activationOf } from "../events/activation.js";

const click = (init: MouseEventInit): MouseEvent =>
	new MouseEvent("click", { bubbles: true, ...init });

describe("activationOf", () => {
	test("reads a mouse click as a pointer press at its position", () => {
		expect(
			activationOf(click({ detail: 1, clientX: 12, clientY: 34 })),
		).toEqual({ x: 12, y: 34, inputMethod: InputMethod.pointer });
	});

	test("keeps a pointer press at the origin as a pointer press", () => {
		expect(activationOf(click({ detail: 1 }))).toEqual({
			x: 0,
			y: 0,
			inputMethod: InputMethod.pointer,
		});
	});

	test("reads a double click as a pointer press", () => {
		expect(activationOf(click({ detail: 2, clientX: 5, clientY: 6 }))).toEqual({
			x: 5,
			y: 6,
			inputMethod: InputMethod.pointer,
		});
	});

	test("reads the click a button fires for Enter or Space as keyboard", () => {
		expect(activationOf(click({ detail: 0 }))).toEqual({
			x: 0,
			y: 0,
			inputMethod: InputMethod.keyboard,
		});
	});

	test("never reports a position for a keyboard-activated click", () => {
		expect(
			activationOf(click({ detail: 0, clientX: 40, clientY: 50 })),
		).toEqual({ x: 0, y: 0, inputMethod: InputMethod.keyboard });
	});

	test("reads a keydown as keyboard", () => {
		expect(
			activationOf(new KeyboardEvent("keydown", { key: "Enter" })),
		).toEqual({ x: 0, y: 0, inputMethod: InputMethod.keyboard });
	});

	test("reads a touch as a pointer press at the touch point", () => {
		const touch = new TouchEvent("touchend");
		Object.defineProperty(touch, "changedTouches", {
			value: [{ clientX: 7, clientY: 8 }],
		});
		expect(activationOf(touch)).toEqual({
			x: 7,
			y: 8,
			inputMethod: InputMethod.pointer,
		});
	});

	test("reads a touch without a touch point as a pointer press at the origin", () => {
		const touch = new TouchEvent("touchend");
		Object.defineProperty(touch, "changedTouches", { value: [] });
		expect(activationOf(touch)).toEqual({
			x: 0,
			y: 0,
			inputMethod: InputMethod.pointer,
		});
	});
});
