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

/**
 * Plausible upper bound for a pixel coordinate written to PoW / puzzle
 * captcha records. Real canvases sit comfortably below this; anything
 * larger is the parseInt-of-overlong-hex artefact from a crafted salt.
 * Used by callers that build coords from client-supplied salts.
 */
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
 * Final-line-of-defence assertion for the `[[[Number]]]` `coords` shape
 * persisted to `powcaptcha` / `puzzlecaptcha` records.
 *
 * Why this exists: `updatePowCaptchaRecordResult` writes via a Mongoose
 * pipeline update (`[{$set: setStage}]`), which bypasses the schema's
 * Number cast that would normally assert `!Number.isNaN(v)`. A
 * malformed coord (NaN / Infinity / sane-but-huge) therefore persists
 * locally, then crashes the central streamer's regular `$set` upsert
 * with `Cast to [[[Number]]] failed for value …`. Throwing here keeps
 * the bad value out of the local DB in the first place.
 *
 * Callers should treat a thrown error as adversarial input and surface
 * it as a user-facing disapproval rather than letting it bubble.
 */
export const assertCoordsSafe = (
	coords: unknown,
	label = "coords",
): void => {
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

/**
 * Type-narrowing variant that returns `coords` only if safe, else
 * `undefined`. Use when a caller would rather drop bad coords silently
 * than surface them to the user (e.g. analytics paths that already had
 * lenient handling pre-validation).
 */
export const safeCoordsOrUndefined = <T>(coords: T): T | undefined => {
	try {
		assertCoordsSafe(coords);
		return coords;
	} catch {
		return undefined;
	}
};
