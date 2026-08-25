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
	connect = "connect",
}

const CaptchaTypeSchema = z.nativeEnum(CaptchaType);

// Decision machines route to solvable captcha types only — `frictionless` is
// the wrapper that runs the routing machine, never one of its outcomes.
const DecisionMachineCaptchaTypeSchema = z.union([
	z.literal(CaptchaType.pow),
	z.literal(CaptchaType.image),
	z.literal(CaptchaType.puzzle),
	z.literal(CaptchaType.connect),
]);

export { CaptchaType, CaptchaTypeSchema, DecisionMachineCaptchaTypeSchema };
