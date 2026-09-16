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
 * Only numeric components contribute. `ScoreComponents` also carries the
 * non-numeric diagnostics `triggeredDetectors` (number[]) and
 * `shadowDomPenalty` (boolean), which have no arithmetic weight.
 *
 * The filter is load-bearing: `+` on an array coerces the accumulator to a
 * string, turning later components into concatenation and the sum into NaN
 * (`0.42 + [] + 0.3 === "0.420.3"`). Mongoose defaults the
 * `triggeredDetectors` array path to `[]`, so it is present on every session
 * read back from the database, ahead of later-spread components such as
 * `dnsAsymmetry`.
 *
 * A NaN numeric component still propagates deliberately
 * (`typeof NaN === "number"`): a score that cannot be computed must not
 * silently read as a low one.
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
