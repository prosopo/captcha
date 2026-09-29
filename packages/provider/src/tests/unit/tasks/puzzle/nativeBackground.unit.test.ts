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
	createPrng,
	generateBackground,
} from "@prosopo/puzzle-assets";
import { describe, expect, it } from "vitest";
import { createBackgroundNative } from "../../../../tasks/puzzle/nativeBackground.js";

const require = createRequire(import.meta.url);
const native = require("@prosopo/native-puzzle") as {
	generateBackground: (seed: Buffer, width: number, height: number) => Buffer;
};

const { width, height } = DEFAULT_GEOMETRY;

// Fixed rather than random: a differential test that draws its own seeds can
// pass on CI and fail on the one seed that matters, and nobody can reproduce
// the failure from the report.
const SEEDS = [
	"00000000000000000000000000000000",
	"ffffffffffffffffffffffffffffffff",
	"0123456789abcdef0123456789abcdef",
	"fedcba9876543210fedcba9876543210",
	"a3f1c07e9b2d48561f0e7c3a9d5b2648",
	"7d4e2a19c8b30f5629ae41d7b06c8f35",
].map((hex) => Buffer.from(hex, "hex"));

describe("native puzzle background", () => {
	it("matches the JS reference implementation byte for byte", () => {
		for (const seed of SEEDS) {
			const reference = generateBackground(createPrng(seed), width, height);
			const actual = native.generateBackground(seed, width, height);
			expect(
				actual.equals(reference.data),
				`seed ${seed.toString("hex")} diverged from @prosopo/puzzle-assets`,
			).toBe(true);
		}
	});

	it("produces a fresh image per call", () => {
		const first = createBackgroundNative(DEFAULT_GEOMETRY);
		const second = createBackgroundNative(DEFAULT_GEOMETRY);
		// Single-use is a security property of the buffer above this; two calls
		// seeding from the CSPRNG must never land on the same picture.
		expect(first.data.equals(second.data)).toBe(false);
	});

	it("returns a correctly shaped RGBA buffer", () => {
		const image = createBackgroundNative(DEFAULT_GEOMETRY);
		expect(image.width).toBe(width);
		expect(image.height).toBe(height);
		expect(image.data.length).toBe(width * height * 4);
		// Straight RGBA, fully opaque.
		for (let i = 3; i < image.data.length; i += 4) {
			expect(image.data[i]).toBe(255);
		}
	});

	it("honours a non-default geometry", () => {
		const image = createBackgroundNative({
			width: 64,
			height: 32,
			notchSize: 8,
		});
		expect(image.data.length).toBe(64 * 32 * 4);
	});

	it("rejects a seed shorter than the generator needs", () => {
		expect(() =>
			native.generateBackground(Buffer.alloc(8), width, height),
		).toThrow(/seed must be at least 16 bytes/);
	});
});
