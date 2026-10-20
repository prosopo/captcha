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

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	type CaptchaPolicySeverityInput,
	MAX_AUTO_ESCALATION_LEVEL,
	MAX_AUTO_ESCALATION_LEVEL_TOUCH,
	MIN_DECOY_HOLE_DARKEN_MARGIN,
	PUZZLE_DIFFICULTY_LEVELS,
	PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL,
	captchaPolicySeverity,
	clampDifficultyLevel,
	isStricterCaptchaPolicy,
	isStricterCaptchaType,
	puzzleDifficultyToSeverity,
	rankCaptchaType,
	resolveMaxEscalationLevel,
	severityToPuzzleDifficulty,
} from "../../src/index.js";

// JSON cannot carry NaN, the infinities, -0 or undefined, and those are the
// edge cases worth pinning, so they travel as strings and null.
type EncodedNumber = number | "NaN" | "Infinity" | "-Infinity" | "-0" | null;

const encode = (value: number | undefined): EncodedNumber => {
	if (value === undefined) return null;
	if (Number.isNaN(value)) return "NaN";
	if (value === Number.POSITIVE_INFINITY) return "Infinity";
	if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
	if (Object.is(value, -0)) return "-0";
	return value;
};

const decode = (value: EncodedNumber): number | undefined => {
	switch (value) {
		case null:
			return undefined;
		case "NaN":
			return Number.NaN;
		case "Infinity":
			return Number.POSITIVE_INFINITY;
		case "-Infinity":
			return Number.NEGATIVE_INFINITY;
		case "-0":
			return -0;
		default:
			return value;
	}
};

const SPECIAL_NUMBERS: EncodedNumber[] = ["NaN", "Infinity", "-Infinity", "-0"];

const CAPTCHA_TYPES: (string | null)[] = [
	null,
	"",
	"image",
	"pow",
	"frictionless",
	"puzzle",
	"audio",
	"iconOrder",
	"authenticated",
	"not-a-captcha-type",
	"constructor",
	"toString",
	"__proto__",
	"hasOwnProperty",
	"Image",
	"IMAGE",
	" image",
	"image ",
];

const POLICY_TYPES: (string | null)[] = [
	null,
	"",
	"image",
	"pow",
	"frictionless",
	"puzzle",
	"audio",
	"iconOrder",
	"authenticated",
	"not-a-captcha-type",
	"constructor",
];

const POLICY_NUMBERS: EncodedNumber[] = [
	null,
	...SPECIAL_NUMBERS,
	0,
	-1,
	0.5,
	2,
	9,
	9998.5,
	9999,
	10_000,
	100_000,
	Number.MAX_VALUE,
];

const LEVEL_NUMBERS: EncodedNumber[] = [
	null,
	...SPECIAL_NUMBERS,
	-5,
	-1,
	-0.5,
	0,
	0.5,
	1,
	2,
	2.5,
	3,
	3.7,
	4,
	5,
	99,
];

const REQUESTED_ROUNDS: EncodedNumber[] = [
	null,
	...SPECIAL_NUMBERS,
	-1,
	0,
	1,
	2,
	2.5,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	12,
	100,
];

const BASE_ROUNDS: EncodedNumber[] = [...SPECIAL_NUMBERS, 0, 1, 2, 2.5, 6];

const MAX_LEVELS: EncodedNumber[] = [
	null,
	"NaN",
	"Infinity",
	"-Infinity",
	"-0",
	-1,
	0,
	1.5,
	2,
	4,
	5,
];

const optionalString = (value: string | null): string | undefined =>
	value === null ? undefined : value;

const toPolicy = (
	captchaType: string | null,
	solvedImagesCount: EncodedNumber,
	powDifficulty: EncodedNumber,
): CaptchaPolicySeverityInput => ({
	captchaType: optionalString(captchaType),
	solvedImagesCount: decode(solvedImagesCount),
	powDifficulty: decode(powDifficulty),
});

interface EncodedPolicy {
	captchaType: string | null;
	solvedImagesCount: EncodedNumber;
	powDifficulty: EncodedNumber;
}

const PAIR_POLICIES: EncodedPolicy[] = [
	null,
	"image",
	"pow",
	"frictionless",
	"puzzle",
	"audio",
	"iconOrder",
	"constructor",
].flatMap((captchaType: string | null): EncodedPolicy[] =>
	[null, 2, 9].flatMap((solvedImagesCount: EncodedNumber): EncodedPolicy[] =>
		[null, 10].map(
			(powDifficulty: EncodedNumber): EncodedPolicy => ({
				captchaType,
				solvedImagesCount,
				powDifficulty,
			}),
		),
	),
);

const requireNumber = (value: EncodedNumber): number => {
	const decoded = decode(value);
	if (decoded === undefined) throw new Error("expected a number");
	return decoded;
};

const LEVEL_ARGUMENTS: EncodedNumber[] = LEVEL_NUMBERS.filter(
	(value: EncodedNumber): boolean => value !== null,
);

const data = {
	constants: {
		MIN_DECOY_HOLE_DARKEN_MARGIN: encode(MIN_DECOY_HOLE_DARKEN_MARGIN),
		MAX_AUTO_ESCALATION_LEVEL: encode(MAX_AUTO_ESCALATION_LEVEL),
		MAX_AUTO_ESCALATION_LEVEL_TOUCH: encode(MAX_AUTO_ESCALATION_LEVEL_TOUCH),
		PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL: encode(
			PUZZLE_ROUNDS_PER_DIFFICULTY_LEVEL,
		),
	},
	puzzleDifficultyLevels: PUZZLE_DIFFICULTY_LEVELS,
	captchaTypes: CAPTCHA_TYPES,
	rankCaptchaType: CAPTCHA_TYPES.map(
		(t: string | null): EncodedNumber =>
			encode(rankCaptchaType(optionalString(t))),
	),
	isStricterCaptchaType: CAPTCHA_TYPES.map(
		(candidate: string | null): boolean[] =>
			CAPTCHA_TYPES.map((incumbent: string | null): boolean =>
				isStricterCaptchaType(
					optionalString(candidate),
					optionalString(incumbent),
				),
			),
	),
	policyTypes: POLICY_TYPES,
	policyNumbers: POLICY_NUMBERS,
	captchaPolicySeverity: POLICY_TYPES.map(
		(captchaType: string | null): EncodedNumber[][] =>
			POLICY_NUMBERS.map((solved: EncodedNumber): EncodedNumber[] =>
				POLICY_NUMBERS.map(
					(pow: EncodedNumber): EncodedNumber =>
						encode(captchaPolicySeverity(toPolicy(captchaType, solved, pow))),
				),
			),
	),
	pairPolicies: PAIR_POLICIES,
	isStricterCaptchaPolicy: PAIR_POLICIES.map(
		(candidate: EncodedPolicy): boolean[] =>
			PAIR_POLICIES.map((incumbent: EncodedPolicy): boolean =>
				isStricterCaptchaPolicy(
					toPolicy(
						candidate.captchaType,
						candidate.solvedImagesCount,
						candidate.powDifficulty,
					),
					toPolicy(
						incumbent.captchaType,
						incumbent.solvedImagesCount,
						incumbent.powDifficulty,
					),
				),
			),
	),
	levelArguments: LEVEL_ARGUMENTS,
	levelNumbers: LEVEL_NUMBERS,
	clampDifficultyLevel: LEVEL_ARGUMENTS.map(
		(level: EncodedNumber): EncodedNumber[] =>
			LEVEL_NUMBERS.map(
				(maxLevel: EncodedNumber): EncodedNumber =>
					encode(clampDifficultyLevel(requireNumber(level), decode(maxLevel))),
			),
	),
	resolveMaxEscalationLevel: {
		touch: LEVEL_NUMBERS.map(
			(site: EncodedNumber): EncodedNumber =>
				encode(resolveMaxEscalationLevel(decode(site), true)),
		),
		pointer: LEVEL_NUMBERS.map(
			(site: EncodedNumber): EncodedNumber =>
				encode(resolveMaxEscalationLevel(decode(site), false)),
		),
	},
	requestedRounds: REQUESTED_ROUNDS,
	baseRounds: BASE_ROUNDS,
	maxLevels: MAX_LEVELS,
	severityToPuzzleDifficulty: REQUESTED_ROUNDS.map(
		(requested: EncodedNumber): EncodedNumber[][] =>
			BASE_ROUNDS.map((base: EncodedNumber): EncodedNumber[] =>
				MAX_LEVELS.map(
					(maxLevel: EncodedNumber): EncodedNumber =>
						encode(
							severityToPuzzleDifficulty(
								decode(requested),
								requireNumber(base),
								decode(maxLevel),
							),
						),
				),
			),
	),
	puzzleDifficultyToSeverity: LEVEL_ARGUMENTS.map(
		(level: EncodedNumber): EncodedNumber[][] =>
			BASE_ROUNDS.map((base: EncodedNumber): EncodedNumber[] =>
				MAX_LEVELS.map(
					(maxLevel: EncodedNumber): EncodedNumber =>
						encode(
							puzzleDifficultyToSeverity(
								requireNumber(level),
								requireNumber(base),
								decode(maxLevel),
							),
						),
				),
			),
	),
};

writeFileSync(
	fileURLToPath(new URL("./vectors.json", import.meta.url)),
	`${JSON.stringify(data, null, "\t")}\n`,
);
