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

// Every type a decision machine may route to. Excludes `frictionless`,
// which is the flow that *runs* the machine rather than an outcome of it,
// and `authenticated`, a pre-verified pass-through with no scoring surface.
const DecisionMachineCaptchaTypeSchema = z.union([
	z.literal(CaptchaType.pow),
	z.literal(CaptchaType.image),
	z.literal(CaptchaType.puzzle),
	z.literal(CaptchaType.audio),
	z.literal(CaptchaType.iconOrder),
]);

// Every type a site, access rule or traffic category may select. Excludes
// `audio`: the audio challenge is only ever served as the accessibility
// alternative a user picks from a visual challenge, on a site that has
// `audioAccessibilityEnabled` turned on. It is never a type anything else
// can route a user to, so a record naming it is rejected on write rather
// than stored and silently ignored.
const SelectableCaptchaTypeSchema = CaptchaTypeSchema.refine(
	// Annotated `boolean` so TypeScript does not infer a type predicate and
	// narrow the output: settings and rules keep the full `CaptchaType`.
	(captchaType): boolean => captchaType !== CaptchaType.audio,
	{ message: "audio is only served as an accessibility alternative" },
);

export {
	CaptchaType,
	CaptchaTypeSchema,
	DecisionMachineCaptchaTypeSchema,
	SelectableCaptchaTypeSchema,
};
