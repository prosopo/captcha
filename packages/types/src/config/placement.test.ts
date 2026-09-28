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
import { PlacementEnum, isPlacement, resolvePlacement } from "./placement.js";

describe("isPlacement", () => {
	it("accepts the two supported placements", () => {
		expect(isPlacement(PlacementEnum.popup)).toBe(true);
		expect(isPlacement(PlacementEnum.float)).toBe(true);
	});

	it("rejects anything else", () => {
		expect(isPlacement("inline")).toBe(false);
		expect(isPlacement("")).toBe(false);
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
