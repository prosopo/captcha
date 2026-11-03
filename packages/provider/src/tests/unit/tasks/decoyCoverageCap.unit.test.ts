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

import { PUZZLE_DIFFICULTY_LEVELS } from "@prosopo/captcha-severity";
import { DEFAULT_GEOMETRY } from "@prosopo/puzzle-assets";
import { describe, expect, it } from "vitest";
import {
	MAX_DECOY_COVERAGE,
	MAX_DECOY_COVERAGE_TOUCH,
	MIN_DECOY_COUNT,
	capDecoyCountForCoverage,
} from "../../../tasks/puzzle/puzzleDifficulty.js";

const { width: W, height: H } = DEFAULT_GEOMETRY;
const TOUCH_MIN_PIECE_SCALE = 0.2;

const pxFor = (scale: number): number => Math.round(W * scale);
const coverage = (count: number, pieceSizePx: number): number =>
	(count * pieceSizePx * pieceSizePx) / (W * H);

const cap = (count: number, pieceSizePx: number, max: number): number =>
	capDecoyCountForCoverage(count, pieceSizePx, W, H, max);

describe("capDecoyCountForCoverage", () => {
	it("leaves a render that is already within the ceiling untouched", () => {
		const piece = pxFor(0.19);
		expect(coverage(21, piece)).toBeLessThan(MAX_DECOY_COVERAGE);
		expect(cap(21, piece, MAX_DECOY_COVERAGE)).toBe(21);
	});

	it("never increases the count", () => {
		for (const scale of [0.09, 0.15, 0.22, 0.3, 0.45]) {
			for (const count of [4, 10, 26, 40]) {
				expect(
					cap(count, pxFor(scale), MAX_DECOY_COVERAGE),
				).toBeLessThanOrEqual(count);
			}
		}
	});

	it("trims the crowded corner of every band below the ceiling", () => {
		for (const band of PUZZLE_DIFFICULTY_LEVELS) {
			const piece = pxFor(band.pieceScale.max);
			const capped = cap(band.decoyCount.max, piece, MAX_DECOY_COVERAGE);
			// MIN_DECOY_COUNT is a floor that may sit above the ceiling; only
			// assert the ceiling where the floor is not what bound the result.
			if (capped > MIN_DECOY_COUNT) {
				expect(coverage(capped, piece)).toBeLessThanOrEqual(MAX_DECOY_COVERAGE);
			}
			expect(capped).toBeLessThan(band.decoyCount.max);
		}
	});

	it("never trims below the floor", () => {
		expect(cap(40, pxFor(0.9), MAX_DECOY_COVERAGE)).toBe(MIN_DECOY_COUNT);
		expect(cap(2, pxFor(0.9), MAX_DECOY_COVERAGE)).toBe(MIN_DECOY_COUNT);
	});

	it("is a no-op on degenerate geometry rather than throwing", () => {
		expect(capDecoyCountForCoverage(12, 0, W, H, MAX_DECOY_COVERAGE)).toBe(12);
		expect(capDecoyCountForCoverage(12, 40, 0, 0, MAX_DECOY_COVERAGE)).toBe(12);
	});
});

describe("touch is crowded harder than desktop, so it takes the lower ceiling", () => {
	it("the touch ceiling is below the desktop one", () => {
		expect(MAX_DECOY_COVERAGE_TOUCH).toBeLessThan(MAX_DECOY_COVERAGE);
	});

	// easePieceScaleForTouch raises the scale floor without lowering the count,
	// so the top bands were guaranteed to bury the background on a phone.
	it("brings every band's touch floor back under the touch ceiling", () => {
		for (const band of PUZZLE_DIFFICULTY_LEVELS) {
			const touchPiece = pxFor(
				Math.max(band.pieceScale.min, TOUCH_MIN_PIECE_SCALE),
			);
			const capped = cap(
				band.decoyCount.min,
				touchPiece,
				MAX_DECOY_COVERAGE_TOUCH,
			);
			if (capped > MIN_DECOY_COUNT) {
				expect(coverage(capped, touchPiece)).toBeLessThanOrEqual(
					MAX_DECOY_COVERAGE_TOUCH,
				);
			}
		}
	});

	it("level 4 on touch no longer always buries the background", () => {
		const band = PUZZLE_DIFFICULTY_LEVELS[4];
		if (!band) throw new Error("expected a level 4 band");
		const touchPiece = pxFor(
			Math.max(band.pieceScale.min, TOUCH_MIN_PIECE_SCALE),
		);
		expect(coverage(band.decoyCount.min, touchPiece)).toBeGreaterThan(1);
		const capped = cap(
			band.decoyCount.min,
			touchPiece,
			MAX_DECOY_COVERAGE_TOUCH,
		);
		expect(coverage(capped, touchPiece)).toBeLessThanOrEqual(
			MAX_DECOY_COVERAGE_TOUCH,
		);
	});
});
