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

import { type Prng, hslToRgb } from "@prosopo/puzzle-assets";
import type { IconOrderGeometry } from "./types.js";

/**
 * The frame the icons sit on.
 *
 * A smooth gradient is the wrong background for this captcha: it has almost no
 * edges of its own, so every icon stroke is the strongest local signal in the
 * picture and an edge detector finds all of them in one pass. This draws a
 * hard-edged collage instead — colour panels, concentric ripples and heavy
 * bars — so the frame is already full of strokes, arcs and corners competing
 * with the icons.
 *
 * Everything is emitted as SVG and rasterised by the same sharp/librsvg
 * pipeline that draws the icons, so the shapes are native-fast and correctly
 * antialiased rather than built pixel by pixel.
 */

const round = (value: number): number => Math.round(value * 100) / 100;

const rgb = (hue: number, saturation: number, lightness: number): string => {
	const { r, g, b } = hslToRgb(hue, saturation, lightness);
	return `rgb(${r},${g},${b})`;
};

/** Big flat shapes that block the frame into regions. */
const panels = (
	prng: Prng,
	geometry: IconOrderGeometry,
	hues: number[],
	count: number,
): string[] => {
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		const hue = hues[i % hues.length] ?? 0;
		// Lightness is drawn from one of three bands rather than a single
		// range, so the frame carries genuinely dark, mid and near-white
		// regions instead of settling into one uniform tone.
		const tone = prng.next();
		const fill =
			tone < 0.2
				? rgb(hue, prng.range(0.3, 0.6), prng.range(0.12, 0.24))
				: tone < 0.35
					? rgb(hue, prng.range(0.1, 0.3), prng.range(0.82, 0.93))
					: rgb(hue, prng.range(0.55, 0.9), prng.range(0.4, 0.65));
		const cx = prng.range(-0.1, 1.1) * geometry.width;
		const cy = prng.range(-0.1, 1.1) * geometry.height;
		switch (prng.int(0, 2)) {
			case 0: {
				// Rotated slab. Oversized so its edges leave the frame and read
				// as a region boundary rather than a floating rectangle.
				const w = prng.range(0.45, 1.1) * geometry.width;
				const h = prng.range(0.3, 0.8) * geometry.height;
				out.push(
					`<rect x="${round(cx - w / 2)}" y="${round(cy - h / 2)}" width="${round(w)}" height="${round(h)}" fill="${fill}" transform="rotate(${round(prng.range(0, 180))} ${round(cx)} ${round(cy)})"/>`,
				);
				break;
			}
			case 1: {
				const r = prng.range(0.25, 0.6) * geometry.width;
				out.push(
					`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${fill}"/>`,
				);
				break;
			}
			default: {
				// Quarter-disc wedge: two straight edges meeting a long curve,
				// which is the shape an arc-detector most easily confuses with
				// the ring and arc glyphs.
				const r = prng.range(0.35, 0.8) * geometry.width;
				const a = prng.range(0, Math.PI * 2);
				const x1 = cx + r * Math.cos(a);
				const y1 = cy + r * Math.sin(a);
				const x2 = cx + r * Math.cos(a + Math.PI / 2);
				const y2 = cy + r * Math.sin(a + Math.PI / 2);
				out.push(
					`<path d="M ${round(cx)} ${round(cy)} L ${round(x1)} ${round(y1)} A ${round(r)} ${round(r)} 0 0 1 ${round(x2)} ${round(y2)} Z" fill="${fill}"/>`,
				);
			}
		}
	}
	return out;
};

/**
 * Concentric stroked circles. The ripple family in the reference imagery, and
 * the single most useful element here: it fills a wide area with evenly spaced
 * curves, so a detector looking for "a closed curve of roughly icon size" gets
 * a dozen candidates from one shape.
 */
const ripples = (
	prng: Prng,
	geometry: IconOrderGeometry,
	hue: number,
): string[] => {
	const cx = prng.range(0, 1) * geometry.width;
	const cy = prng.range(0, 1) * geometry.height;
	const rings = prng.int(5, 9);
	const gap = prng.range(9, 16);
	const stroke = rgb(hue, prng.range(0.45, 0.8), prng.range(0.4, 0.7));
	const width = prng.range(2, 5);
	const out: string[] = [];
	for (let i = 1; i <= rings; i++) {
		out.push(
			`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(i * gap)}" fill="none" stroke="${stroke}" stroke-width="${round(width)}" stroke-opacity="0.85"/>`,
		);
	}
	return out;
};

/**
 * Heavy bars slicing across the frame.
 *
 * Drawn opaque, in near-black or near-white rather than a translucent grey: a
 * washed bar reads as a soft shadow, where the point is a hard edge with as
 * much local contrast as an icon stroke has.
 */
const bars = (
	prng: Prng,
	geometry: IconOrderGeometry,
	count: number,
): string[] => {
	const out: string[] = [];
	const diagonal = Math.hypot(geometry.width, geometry.height);
	for (let i = 0; i < count; i++) {
		const cx = prng.range(0, 1) * geometry.width;
		const cy = prng.range(0, 1) * geometry.height;
		const thickness = prng.range(7, 20);
		const fill = prng.next() < 0.7 ? "rgb(16,16,22)" : "rgb(240,236,225)";
		out.push(
			`<rect x="${round(cx - diagonal)}" y="${round(cy - thickness / 2)}" width="${round(diagonal * 2)}" height="${round(thickness)}" fill="${fill}" transform="rotate(${round(prng.range(0, 180))} ${round(cx)} ${round(cy)})"/>`,
		);
	}
	return out;
};

/**
 * Build the collage as SVG markup for the frame.
 *
 * `clutter` scales every element family at once, so one operator-facing knob
 * moves the whole frame from "clean" to "busy" without needing a count per
 * shape type.
 */
export const collageMarkup = (
	prng: Prng,
	geometry: IconOrderGeometry,
	clutter: number,
): string => {
	// A base hue plus deliberate jumps around the wheel. An analogous band
	// alone looks tidy but gives neighbouring regions almost no contrast,
	// which is exactly the boundary an icon stroke needs to hide against.
	// The complementary and triadic offsets keep the frame looking composed
	// while still putting unlike colours next to each other.
	const baseHue = prng.range(0, 360);
	const hues = [
		baseHue,
		baseHue + prng.range(150, 210),
		baseHue + prng.range(100, 140),
		baseHue + prng.range(-40, 40),
		baseHue + prng.range(220, 260),
	].map((hue) => ((hue % 360) + 360) % 360);

	const parts: string[] = [
		`<rect width="${geometry.width}" height="${geometry.height}" fill="${rgb(baseHue, 0.5, 0.4)}"/>`,
		...panels(prng, geometry, hues, Math.max(2, Math.round(clutter * 0.6))),
	];

	const rippleFamilies = Math.max(1, Math.round(clutter * 0.25));
	for (let i = 0; i < rippleFamilies; i++) {
		parts.push(
			...ripples(prng, geometry, hues[(i + 1) % hues.length] ?? baseHue),
		);
	}

	parts.push(...bars(prng, geometry, Math.max(1, Math.round(clutter * 0.3))));
	return parts.join("");
};
