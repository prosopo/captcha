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

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderPuzzleToRgba } from "../browser.js";
import {
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	createBackground,
	renderPuzzle,
} from "../index.js";
import type {
	NotchPlacement,
	PuzzleGeometry,
	PuzzleRenderSettings,
	PuzzleRendererVersion,
	RenderedPuzzle,
} from "../types.js";

/**
 * The replay contract behind `PuzzleCaptchaStored.render`: the portal must be
 * able to reproduce a served puzzle byte for byte from the stored fields alone.
 *
 * Each field gets its own case asserting that changing it alone changes the
 * output. Without those, a record missing a field would still "pass" a
 * same-input-same-output test, which is exactly the regression worth guarding:
 * it is how you discover six months later that the stored set was never
 * sufficient.
 */

const BACKGROUND_SEED = Buffer.from("00112233445566778899aabbccddeeff", "hex");
const RENDER_SEED = Buffer.from("ffeeddccbbaa99887766554433221100", "hex");
const PLACEMENT: NotchPlacement = { targetX: 191, targetY: 77 };

const render = (overrides: {
	backgroundSeed?: Buffer;
	renderSeed?: Buffer;
	placement?: NotchPlacement;
	geometry?: PuzzleGeometry;
	settings?: PuzzleRenderSettings;
	rendererVersion?: PuzzleRendererVersion;
}): Promise<RenderedPuzzle> => {
	const geometry = overrides.geometry ?? DEFAULT_GEOMETRY;
	return renderPuzzle({
		background: createBackground({
			geometry,
			seed: overrides.backgroundSeed ?? BACKGROUND_SEED,
		}),
		placement: overrides.placement ?? PLACEMENT,
		geometry,
		settings: overrides.settings ?? DEFAULT_RENDER_SETTINGS,
		seed: overrides.renderSeed ?? RENDER_SEED,
		...(overrides.rendererVersion && {
			rendererVersion: overrides.rendererVersion,
		}),
	});
};

describe("render replay from the stored record", () => {
	it("reproduces the same imagery from the same stored inputs", async () => {
		const served = await render({});
		const replayed = await render({});

		expect(replayed.background.equals(served.background)).toBe(true);
		expect(replayed.piece.equals(served.piece)).toBe(true);
		expect(replayed.pieceSize).toBe(served.pieceSize);
	});

	it("returns the renderer version it drew with, so the record can store it", async () => {
		expect((await render({ rendererVersion: 1 })).rendererVersion).toBe(1);
		expect((await render({ rendererVersion: 2 })).rendererVersion).toBe(2);
	});

	it("changes the imagery when only the renderer version differs", async () => {
		const first = await render({ rendererVersion: 1 });
		const second = await render({ rendererVersion: 2 });
		expect(second.background.equals(first.background)).toBe(false);
		expect(second.piece.equals(first.piece)).toBe(false);
	});

	// Pins renderer 1 to the pixels it produced before renderer 2 existed, so
	// records stored without a version still replay as they were served. The
	// settings are the defaults of that time; a replay reads them off the record.
	it("redraws renderer 1 puzzles pixel for pixel", () => {
		const geometry: PuzzleGeometry = { ...DEFAULT_GEOMETRY, pieceSize: 61 };
		const renderer1Settings: PuzzleRenderSettings = {
			decoyCount: 5,
			decoyEdgeDarkness: 20,
			decoyBodyBrightness: 4,
			holeDarken: 0.55,
			decoyHoleDarken: 0.7,
		};
		const { background, piece } = renderPuzzleToRgba({
			background: createBackground({ geometry, seed: BACKGROUND_SEED }),
			placement: PLACEMENT,
			geometry,
			settings: renderer1Settings,
			seed: RENDER_SEED,
			rendererVersion: 1,
		});
		const digest = createHash("sha256")
			.update(background.data)
			.update(piece.data)
			.digest("hex");
		expect(digest).toBe(
			"54bbed14ffcc8a9d3f161f6e9f3f3922794389ae946649fd62ca8e16312f391b",
		);
	});

	it("returns the render seed it was given, so the record can store it", async () => {
		const served = await render({});
		expect(served.seed.equals(RENDER_SEED)).toBe(true);
	});

	it("mints a fresh render seed when none is supplied", async () => {
		const first = await renderPuzzle({
			background: createBackground({
				geometry: DEFAULT_GEOMETRY,
				seed: BACKGROUND_SEED,
			}),
			placement: PLACEMENT,
		});
		const second = await renderPuzzle({
			background: createBackground({
				geometry: DEFAULT_GEOMETRY,
				seed: BACKGROUND_SEED,
			}),
			placement: PLACEMENT,
		});
		expect(first.seed.equals(second.seed)).toBe(false);
		// Same background, different decoys and notch shape.
		expect(first.background.equals(second.background)).toBe(false);
	});

	it("changes the imagery when only the background seed differs", async () => {
		const served = await render({});
		const other = await render({
			backgroundSeed: Buffer.from("0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f", "hex"),
		});
		expect(other.background.equals(served.background)).toBe(false);
	});

	it("changes the imagery when only the render seed differs", async () => {
		const served = await render({});
		const other = await render({
			renderSeed: Buffer.from("0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f", "hex"),
		});
		expect(other.background.equals(served.background)).toBe(false);
	});

	it("changes the imagery when only the piece size differs", async () => {
		const served = await render({});
		const other = await render({
			geometry: { ...DEFAULT_GEOMETRY, pieceSize: 61 },
		});
		expect(other.pieceSize).not.toBe(served.pieceSize);
		expect(other.piece.equals(served.piece)).toBe(false);
	});

	it("changes the imagery when only the notch placement differs", async () => {
		const served = await render({});
		const other = await render({
			placement: {
				targetX: PLACEMENT.targetX + 30,
				targetY: PLACEMENT.targetY,
			},
		});
		expect(other.background.equals(served.background)).toBe(false);
	});

	// One case per stored setting: each is an input the record has to carry,
	// and a setting the renderer ignored would make its stored value a lie.
	const settingCases: ReadonlyArray<{
		name: keyof PuzzleRenderSettings;
		value: number;
	}> = [
		{ name: "decoyCount", value: DEFAULT_RENDER_SETTINGS.decoyCount + 3 },
		{ name: "decoyEdgeDarkness", value: 90 },
		{ name: "decoyBodyBrightness", value: 40 },
		{ name: "holeDarken", value: 0.2 },
		{ name: "decoyHoleDarken", value: 0.95 },
	];

	for (const { name, value } of settingCases) {
		it(`changes the imagery when only ${name} differs`, async () => {
			const served = await render({});
			const other = await render({
				settings: { ...DEFAULT_RENDER_SETTINGS, [name]: value },
			});
			expect(other.background.equals(served.background)).toBe(false);
		});
	}
});
