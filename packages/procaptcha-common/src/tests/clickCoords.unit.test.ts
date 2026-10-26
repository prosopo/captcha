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

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { trustedClickCoords } from "../events/trust.js";
import { type Mounted, fireAndReturn, mount } from "./domHarness.js";

let mounted: Mounted;

beforeEach(() => {
	mounted = mount();
});

afterEach(() => {
	mounted.unmount();
});

const coordsOf = (event: Event) => {
	if (
		!(event instanceof MouseEvent) &&
		!(event instanceof KeyboardEvent) &&
		!(event instanceof TouchEvent)
	) {
		throw new Error(`unexpected event ${event.type}`);
	}
	return trustedClickCoords(event);
};

describe("trustedClickCoords", () => {
	test("reads a trusted click's position", () => {
		const event = fireAndReturn(mounted.container, "click", {
			clientX: 12,
			clientY: 34,
		});
		expect(coordsOf(event)).toEqual({ x: 12, y: 34 });
	});

	test("prefers the first touch point over the mouse position", () => {
		const event = fireAndReturn(mounted.container, "click", {
			clientX: 1,
			clientY: 2,
			touches: [{ clientX: 56, clientY: 78 }],
		});
		expect(coordsOf(event)).toEqual({ x: 56, y: 78 });
	});

	test("falls back to the mouse position when there are no touch points", () => {
		const event = fireAndReturn(mounted.container, "click", {
			clientX: 9,
			clientY: 10,
			touches: [],
		});
		expect(coordsOf(event)).toEqual({ x: 9, y: 10 });
	});

	test("reports the origin for an untrusted click", () => {
		const event = fireAndReturn(mounted.container, "click", {
			trusted: false,
			clientX: 12,
			clientY: 34,
		});
		expect(coordsOf(event)).toEqual({ x: 0, y: 0 });
	});

	test("reports the origin for keyboard activation", () => {
		const event = fireAndReturn(mounted.container, "keydown", { key: " " });
		expect(coordsOf(event)).toEqual({ x: 0, y: 0 });
	});
});
