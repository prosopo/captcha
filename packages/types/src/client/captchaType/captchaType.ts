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

// Decision machines only work with pow, image and puzzle captcha types.
// Frictionless is the outer flow that dispatches to these; authenticated
// is a pre-verified pass-through and has no scoring surface.
const DecisionMachineCaptchaTypeSchema = z.union([
	z.literal(CaptchaType.pow),
	z.literal(CaptchaType.image),
	z.literal(CaptchaType.puzzle),
]);

export { CaptchaType, CaptchaTypeSchema, DecisionMachineCaptchaTypeSchema };
