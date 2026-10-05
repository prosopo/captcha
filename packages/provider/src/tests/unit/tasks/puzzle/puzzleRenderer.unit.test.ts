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
	DEFAULT_GEOMETRY,
	DEFAULT_RENDER_SETTINGS,
	type NotchPlacement,
	createBackground,
	renderPuzzle,
	toDataUri,
} from "@prosopo/puzzle-assets";
import { afterEach, describe, expect, it } from "vitest";
import { resetPuzzleBackgroundBuffer } from "../../../../tasks/puzzle/backgroundBuffer.js";
import { renderPuzzleImages } from "../../../../tasks/puzzle/puzzleRenderer.js";

const PLACEMENT: NotchPlacement = { targetX: 203, targetY: 61 };

describe("renderPuzzleImages", () => {
	afterEach(() => {
		resetPuzzleBackgroundBuffer();
	});

	it("returns both seeds as 128-bit hex", async () => {
		const images = await renderPuzzleImages(PLACEMENT);
		expect(images.backgroundSeed).toMatch(/^[0-9a-f]{32}$/);
		expect(images.renderSeed).toMatch(/^[0-9a-f]{32}$/);
		expect(images.backgroundSeed).not.toBe(images.renderSeed);
	});

	/**
	 * The point of returning the seeds at all: a record holding them plus the
	 * settings must reproduce exactly what the user was served. This replays
	 * through the library entry points the portal would use, so it fails if the
	 * provider ever pairs a background with the wrong seed — the buffer hands
	 * out image and seed together and mismatching them is the live hazard.
	 */
	it("returns seeds that reproduce the served imagery byte for byte", async () => {
		const pieceSize = 51;
		const served = await renderPuzzleImages(
			PLACEMENT,
			DEFAULT_RENDER_SETTINGS,
			pieceSize,
		);

		const replayed = await renderPuzzle(
			createBackground(
				DEFAULT_GEOMETRY,
				Buffer.from(served.backgroundSeed, "hex"),
			),
			PLACEMENT,
			{ ...DEFAULT_GEOMETRY, pieceSize },
			DEFAULT_RENDER_SETTINGS,
			Buffer.from(served.renderSeed, "hex"),
		);

		expect(toDataUri(replayed.background)).toBe(served.background);
		expect(toDataUri(replayed.piece)).toBe(served.piece);
		expect(replayed.pieceSize).toBe(served.pieceSize);
	});

	it("reports the piece size it actually drew", async () => {
		const images = await renderPuzzleImages(
			PLACEMENT,
			DEFAULT_RENDER_SETTINGS,
			37,
		);
		expect(images.pieceSize).toBe(37);
	});

	it("gives consecutive challenges different seeds", async () => {
		const first = await renderPuzzleImages(PLACEMENT);
		const second = await renderPuzzleImages(PLACEMENT);
		// Single-use backgrounds are a security property of the buffer; two
		// challenges sharing a seed would mean it handed the same image out
		// twice.
		expect(first.backgroundSeed).not.toBe(second.backgroundSeed);
		expect(first.renderSeed).not.toBe(second.renderSeed);
	});
});
