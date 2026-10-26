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

import { MAX_WIDGET_SLOT } from "@prosopo/types";
import { afterEach, describe, expect, test } from "vitest";
import { claimWidgetSlot, releaseWidgetSlot } from "../widgetSlot.js";

describe("widget slots", () => {
	const claimed: { siteKey: string; slot: number }[] = [];
	const claim = (siteKey: string): number => {
		const slot = claimWidgetSlot(siteKey);
		claimed.push({ siteKey, slot });
		return slot;
	};

	afterEach(() => {
		for (const { siteKey, slot } of claimed.splice(0)) {
			releaseWidgetSlot(siteKey, slot);
		}
	});

	test("hands out the lowest free slot", () => {
		expect([claim("a"), claim("a"), claim("a")]).toEqual([0, 1, 2]);
		releaseWidgetSlot("a", 1);
		expect(claim("a")).toBe(1);
	});

	test("counts each site key separately", () => {
		expect([claim("a"), claim("b"), claim("a")]).toEqual([0, 0, 1]);
	});

	test("puts widgets past the cap on the last slot", () => {
		for (let slot = 0; slot < MAX_WIDGET_SLOT; slot++) claim("a");
		expect([claim("a"), claim("a")]).toEqual([
			MAX_WIDGET_SLOT,
			MAX_WIDGET_SLOT,
		]);
	});

	test("ignores releasing a slot that was never claimed", () => {
		releaseWidgetSlot("unknown", 3);
		expect(claim("unknown")).toBe(0);
	});
});
