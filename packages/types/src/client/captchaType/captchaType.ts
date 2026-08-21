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

import { z } from "zod";

enum CaptchaType {
	image = "image",
	pow = "pow",
	frictionless = "frictionless",
	puzzle = "puzzle",
}

const CaptchaTypeSchema = z.nativeEnum(CaptchaType);

/**
 * The three concrete challenges a user can actually be asked to solve.
 *
 * `frictionless` is deliberately excluded: it is the *router* that picks one
 * of these, not a challenge in its own right. Anything that describes "what
 * the user was shown" — session records, decision-machine inputs, routing
 * outputs, usage counters, metrics labels — is a `ChallengeCaptchaType`.
 */
type ChallengeCaptchaType =
	| CaptchaType.pow
	| CaptchaType.image
	| CaptchaType.puzzle;

const CHALLENGE_CAPTCHA_TYPES = [
	CaptchaType.pow,
	CaptchaType.image,
	CaptchaType.puzzle,
] as const satisfies readonly ChallengeCaptchaType[];

const ChallengeCaptchaTypeSchema = z.union([
	z.literal(CaptchaType.pow),
	z.literal(CaptchaType.image),
	z.literal(CaptchaType.puzzle),
]);

/**
 * The interactive (visual) challenge tier — the subset of challenges that put
 * a puzzle in front of the user rather than spending their CPU.
 *
 * This set previously existed only as an anonymous `CaptchaType.image |
 * CaptchaType.puzzle` union repeated across the escalation path (PoW escalation
 * envelope, the widget escalation handler, the frictionless re-render, the
 * post-PoW routing guard). Naming it means adding a fourth interactive type is
 * a compile error at each of those sites rather than a grep exercise.
 */
type InteractiveCaptchaType = CaptchaType.image | CaptchaType.puzzle;

const INTERACTIVE_CAPTCHA_TYPES = [
	CaptchaType.image,
	CaptchaType.puzzle,
] as const satisfies readonly InteractiveCaptchaType[];

const InteractiveCaptchaTypeSchema = z.union([
	z.literal(CaptchaType.image),
	z.literal(CaptchaType.puzzle),
]);

const isChallengeCaptchaType = (
	value: CaptchaType | undefined,
): value is ChallengeCaptchaType =>
	value !== undefined &&
	(CHALLENGE_CAPTCHA_TYPES as readonly CaptchaType[]).includes(value);

const isInteractiveCaptchaType = (
	value: CaptchaType | undefined,
): value is InteractiveCaptchaType =>
	value !== undefined &&
	(INTERACTIVE_CAPTCHA_TYPES as readonly CaptchaType[]).includes(value);

/**
 * @deprecated Use {@link ChallengeCaptchaTypeSchema}. Retained because
 * operator-authored decision machines and stored artefacts reference the old
 * name; it is the identical union.
 */
const DecisionMachineCaptchaTypeSchema = ChallengeCaptchaTypeSchema;

export {
	CaptchaType,
	CaptchaTypeSchema,
	CHALLENGE_CAPTCHA_TYPES,
	ChallengeCaptchaTypeSchema,
	DecisionMachineCaptchaTypeSchema,
	INTERACTIVE_CAPTCHA_TYPES,
	InteractiveCaptchaTypeSchema,
	isChallengeCaptchaType,
	isInteractiveCaptchaType,
};
export type { ChallengeCaptchaType, InteractiveCaptchaType };
