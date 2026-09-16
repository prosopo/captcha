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

import { describe, expect, it } from "vitest";
import { Placement, PlacementEnum, resolvePlacement } from "./placement.js";

describe("Placement", () => {
	it("accepts the two supported placements", () => {
		expect(Placement.parse("popup")).toBe(PlacementEnum.popup);
		expect(Placement.parse("float")).toBe(PlacementEnum.float);
	});

	it("rejects anything else", () => {
		expect(Placement.safeParse("inline").success).toBe(false);
		expect(Placement.safeParse("").success).toBe(false);
	});
});

describe("resolvePlacement", () => {
	it("defaults to popup when nothing is requested", () => {
		expect(resolvePlacement(undefined, false)).toBe(PlacementEnum.popup);
	});

	it("honours a float request from a visible widget", () => {
		expect(resolvePlacement(PlacementEnum.float, false)).toBe(
			PlacementEnum.float,
		);
	});

	it("falls back to popup when the widget is invisible", () => {
		expect(resolvePlacement(PlacementEnum.float, true)).toBe(
			PlacementEnum.popup,
		);
	});

	it("leaves an explicit popup request alone in both modes", () => {
		expect(resolvePlacement(PlacementEnum.popup, false)).toBe(
			PlacementEnum.popup,
		);
		expect(resolvePlacement(PlacementEnum.popup, true)).toBe(
			PlacementEnum.popup,
		);
	});
});
