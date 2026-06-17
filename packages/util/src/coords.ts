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

/** Upper bound for pixel coordinates persisted to captcha records. */
export const MAX_PIXEL_COORD = 1_000_000;

const isValidCoordScalar = (v: unknown): v is number => {
	return (
		typeof v === "number" &&
		Number.isFinite(v) &&
		Number.isInteger(v) &&
		v >= 0 &&
		v <= MAX_PIXEL_COORD
	);
};

/**
 * Validates the `[[[Number]]]` coords shape. Throws if any element is
 * not a safe non-negative integer within `MAX_PIXEL_COORD`.
 */
export const assertCoordsSafe = (coords: unknown, label = "coords"): void => {
	if (coords === undefined || coords === null) return;
	if (!Array.isArray(coords)) {
		throw new Error(`${label} must be an array, got ${typeof coords}`);
	}
	for (let i = 0; i < coords.length; i++) {
		const stroke = coords[i];
		if (!Array.isArray(stroke)) {
			throw new Error(`${label}[${i}] must be an array of points`);
		}
		for (let j = 0; j < stroke.length; j++) {
			const point = stroke[j];
			if (!Array.isArray(point)) {
				throw new Error(`${label}[${i}][${j}] must be a [number, number] pair`);
			}
			for (let k = 0; k < point.length; k++) {
				const v = point[k];
				if (!isValidCoordScalar(v)) {
					throw new Error(
						`${label}[${i}][${j}][${k}] is not a finite non-negative integer ≤ ${MAX_PIXEL_COORD}: ${String(v)}`,
					);
				}
			}
		}
	}
};

/** Returns `coords` if safe, else `undefined`. */
export const safeCoordsOrUndefined = <T>(coords: T): T | undefined => {
	try {
		assertCoordsSafe(coords);
		return coords;
	} catch {
		return undefined;
	}
};
