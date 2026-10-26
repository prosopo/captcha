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
import type { ScoreComponents } from "@prosopo/types";

/**
 * Sum the weighted components of a frictionless bot score, capped at 1.
 *
 * Only numeric components contribute. `ScoreComponents` also carries two
 * non-numeric diagnostic fields — `triggeredDetectors` (number[]) and
 * `shadowDomPenalty` (boolean) — and neither has an arithmetic weight
 * anywhere in the scoring path.
 *
 * Filtering them out is load-bearing, not tidiness. `+` on an array coerces
 * the accumulator to a string, so a single `triggeredDetectors: []` turned
 * every subsequent component into string concatenation and the whole sum into
 * NaN:
 *
 *   0.42 + []  -> "0.42"                  (string)
 *   "0.42" + 0.3 -> "0.420.3"
 *   Math.min(1, "0.420.3") -> NaN
 *
 * That was reachable in production rather than theoretical: the Mongoose
 * schema declares `triggeredDetectors` as an array path, and Mongoose
 * defaults array paths to `[]`, so the field is present on every session read
 * back from the database even when the frictionless handler omitted it. The
 * captcha tasks then spread `dnsAsymmetry` on afterwards, landing it after the
 * array in key order and triggering the concatenation.
 *
 * NaN is still propagated when a genuinely numeric component is NaN —
 * `typeof NaN === "number"`, so it survives the filter deliberately. A score
 * that cannot be computed must not silently read as a low one.
 */
export const computeFrictionlessScore = (
	scoreComponents:
		| {
				[key: string]: number;
		  }
		| ScoreComponents,
): number => {
	const values: unknown[] = Object.values(scoreComponents);
	return Number(
		Math.min(
			1,
			values
				.filter((x): x is number => typeof x === "number")
				.reduce((acc, val) => acc + val, 0),
		).toFixed(2),
	);
};

export const timestampDecayFunction = (
	timestamp: number,
	imageMaxRounds: number,
): number => {
	const max = new Date().getTime();
	if (max - timestamp > 3600000) {
		return Math.min(imageMaxRounds, 12);
	}
	const min = 1000;
	const age = max - timestamp;
	const decay = Math.log10(2000) / max;
	const bigScore = max * (1 - (1 - Math.exp(decay * age) ** 24));

	return Math.min(
		imageMaxRounds,
		Math.max(
			2,
			Math.round(
				((Math.log(bigScore) - Math.log(min)) /
					(Math.log(max) - Math.log(min))) *
					2.5,
			),
		),
	);
};
