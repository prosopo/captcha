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

import {
	DEFAULT_RENDER_SETTINGS,
	GLYPH_KINDS,
	GlyphKind,
} from "@prosopo/icon-order-assets";
import {
	ICON_ORDER_GLYPH_VOCABULARY,
	iconOrderDecoyCountDefault,
	iconOrderTargetCountDefault,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	resolveIconOrderRenderSettings,
	toStoredTargets,
} from "../../../../tasks/iconOrder/iconOrderRenderer.js";

describe("icon-order constants mirrored in @prosopo/types", () => {
	it("match the asset package", () => {
		expect(ICON_ORDER_GLYPH_VOCABULARY).toBe(GLYPH_KINDS.length);
		expect(iconOrderTargetCountDefault).toBe(
			DEFAULT_RENDER_SETTINGS.targetCount,
		);
		expect(iconOrderDecoyCountDefault).toBe(DEFAULT_RENDER_SETTINGS.decoyCount);
	});
});

describe("resolveIconOrderRenderSettings", () => {
	it("returns the asset defaults when nothing overrides", () => {
		expect(resolveIconOrderRenderSettings()).toEqual(DEFAULT_RENDER_SETTINGS);
		expect(resolveIconOrderRenderSettings(undefined, undefined)).toEqual(
			DEFAULT_RENDER_SETTINGS,
		);
	});

	it("applies a partial override without disturbing the rest", () => {
		expect(resolveIconOrderRenderSettings({ strokeWidth: 5 })).toEqual({
			...DEFAULT_RENDER_SETTINGS,
			strokeWidth: 5,
		});
	});

	it("lets a later source win, so traffic-filter beats client settings", () => {
		const resolved = resolveIconOrderRenderSettings(
			{ targetCount: 4, iconOpacity: 0.5 },
			{ targetCount: 2 },
		);
		expect(resolved.targetCount).toBe(2);
		expect(resolved.iconOpacity).toBe(0.5);
	});

	it("clamps a targets+decoys total that two valid layers add up past", () => {
		const resolved = resolveIconOrderRenderSettings(
			{ targetCount: 6 },
			{ decoyCount: 6 },
		);
		expect(resolved.targetCount).toBe(6);
		expect(resolved.decoyCount).toBe(4);
		expect(resolved.targetCount + resolved.decoyCount).toBeLessThanOrEqual(10);
	});

	it("never clamps the decoy count below zero", () => {
		const resolved = resolveIconOrderRenderSettings(
			{ targetCount: 6, decoyCount: 6 },
			{ targetCount: 6 },
		);
		expect(resolved.decoyCount).toBeGreaterThanOrEqual(0);
	});

	it("leaves a within-budget pair alone", () => {
		const resolved = resolveIconOrderRenderSettings({
			targetCount: 3,
			decoyCount: 5,
		});
		expect(resolved.decoyCount).toBe(5);
	});
});

describe("toStoredTargets", () => {
	it("keeps only what grading needs", () => {
		expect(
			toStoredTargets([
				{
					x: 1,
					y: 2,
					size: 3,
					kind: GlyphKind.ring,
					rotation: 42,
					hue: 200,
				},
			]),
		).toEqual([{ x: 1, y: 2, size: 3, kind: GlyphKind.ring }]);
	});
});
