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
	audio = "audio",
	iconOrder = "iconOrder",
	// Web Bot Auth verified — no user-facing challenge. Issued only by the
	// frictionless flow when the request carried a valid Ed25519 signature
	// per RFC 9421 / draft-meunier-web-bot-auth AND no operator-authored
	// Block/Restrict rule matched the verified Signature-Agent URL. The
	// widget renders a "Verified agent" badge and auto-submits the token.
	// The captcha record carries `webBotAuthAgent` + `clientIp` so the
	// verify path can enforce IP binding.
	authenticated = "authenticated",
}

const CaptchaTypeSchema = z.nativeEnum(CaptchaType);

/**
 * Every challenge a user can be asked to solve, and so everything with a
 * verify endpoint, a usage counter and a decision-machine input.
 *
 * `frictionless` is the router that picks one of these and `authenticated` is
 * a pre-verified pass-through, so neither is a challenge.
 */
type ChallengeCaptchaType =
	| CaptchaType.pow
	| CaptchaType.image
	| CaptchaType.puzzle
	| CaptchaType.iconOrder
	| CaptchaType.audio;

const CHALLENGE_CAPTCHA_TYPES = [
	CaptchaType.pow,
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
	CaptchaType.audio,
] as const satisfies readonly ChallengeCaptchaType[];

const ChallengeCaptchaTypeSchema = z.enum(CHALLENGE_CAPTCHA_TYPES);

/**
 * The challenges a session can be minted as. Audio is missing because it is
 * only ever served as the accessibility alternative to one of these, on a
 * session that already exists.
 */
type ConcreteCaptchaType = Exclude<ChallengeCaptchaType, CaptchaType.audio>;

const CONCRETE_CAPTCHA_TYPES = [
	CaptchaType.pow,
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
] as const satisfies readonly ConcreteCaptchaType[];

const ConcreteCaptchaTypeSchema = z.enum(CONCRETE_CAPTCHA_TYPES);

/** The visual challenges a PoW solve can escalate into. */
type InteractiveCaptchaType = Exclude<ConcreteCaptchaType, CaptchaType.pow>;

const INTERACTIVE_CAPTCHA_TYPES = [
	CaptchaType.image,
	CaptchaType.puzzle,
	CaptchaType.iconOrder,
] as const satisfies readonly InteractiveCaptchaType[];

const InteractiveCaptchaTypeSchema = z.enum(INTERACTIVE_CAPTCHA_TYPES);

const isChallengeCaptchaType = (
	value: CaptchaType | undefined,
): value is ChallengeCaptchaType =>
	ChallengeCaptchaTypeSchema.safeParse(value).success;

const isConcreteCaptchaType = (
	value: CaptchaType | undefined,
): value is ConcreteCaptchaType =>
	ConcreteCaptchaTypeSchema.safeParse(value).success;

const isInteractiveCaptchaType = (
	value: CaptchaType | undefined,
): value is InteractiveCaptchaType =>
	InteractiveCaptchaTypeSchema.safeParse(value).success;

/**
 * @deprecated Use {@link ChallengeCaptchaTypeSchema}. Operator-authored
 * decision machines and stored artefacts reference this name.
 */
const DecisionMachineCaptchaTypeSchema = ChallengeCaptchaTypeSchema;

// What a site, access rule or traffic category may select. Audio is only the
// accessibility alternative, so a record naming it is rejected on write.
const SelectableCaptchaTypeSchema = CaptchaTypeSchema.refine(
	// `boolean`, not an inferred type predicate, so the output stays `CaptchaType`.
	(captchaType): boolean => captchaType !== CaptchaType.audio,
	{ message: "audio is only served as an accessibility alternative" },
);

export {
	CaptchaType,
	CaptchaTypeSchema,
	CHALLENGE_CAPTCHA_TYPES,
	ChallengeCaptchaTypeSchema,
	CONCRETE_CAPTCHA_TYPES,
	ConcreteCaptchaTypeSchema,
	DecisionMachineCaptchaTypeSchema,
	INTERACTIVE_CAPTCHA_TYPES,
	InteractiveCaptchaTypeSchema,
	isChallengeCaptchaType,
	isConcreteCaptchaType,
	isInteractiveCaptchaType,
	SelectableCaptchaTypeSchema,
};
export type {
	ChallengeCaptchaType,
	ConcreteCaptchaType,
	InteractiveCaptchaType,
};
