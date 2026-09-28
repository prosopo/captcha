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

import { createRequire } from "node:module";
import {
	DEFAULT_GEOMETRY,
	type PuzzleGeometry,
	type RgbaImage,
	createSeed,
} from "@prosopo/puzzle-assets";
import { measureSync } from "../../api/metrics.js";

// Loaded the same two ways as @prosopo/native-ja4 and @prosopo/native-merkle:
// by package name in dev, and by the renamed binary the cli's vite plugin
// copies next to the bundle in production.
type NativePuzzleModule = {
	generateBackground: (seed: Buffer, width: number, height: number) => Buffer;
};
const req = createRequire(import.meta.url);
const nativePuzzle: NativePuzzleModule = (() => {
	try {
		return req("@prosopo/native-puzzle") as NativePuzzleModule;
	} catch {
		return req("./prosopo-native-puzzle.node") as NativePuzzleModule;
	}
})();

/**
 * Synthesise one background in Rust.
 *
 * Byte-identical to `createBackground` from @prosopo/puzzle-assets given the
 * same seed — the JS remains the reference implementation and the contract
 * the differential test pins. Single-use is unchanged and still the caller's
 * responsibility: this mints a fresh CSPRNG seed per call and the seed never
 * leaves the process.
 */
export const createBackgroundNative = (
	geometry: PuzzleGeometry = DEFAULT_GEOMETRY,
): RgbaImage => {
	const { width, height } = geometry;
	const data = measureSync("puzzle_background", () =>
		nativePuzzle.generateBackground(createSeed(), width, height),
	);
	return { data, width, height };
};
