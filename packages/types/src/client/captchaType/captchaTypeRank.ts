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
 * Relative severity of the captcha types, and the helpers for picking the
 * strictest when several policies compete for the same request.
 *
 * "Strictest" is one idea with several callers: the traffic filter combining
 * multiple `challenge` matches on one request (`resolveChallengePolicy`), and
 * the decision machines resolving an undeclared middlebox against a site's
 * vpn / datacenter policies (`resolveMiddleboxPolicy`). Both previously kept
 * their own copy of the table. They agreed, but nothing held them to it.
 *
 * The type-only import of `CaptchaType` and the plain-string keys are
 * deliberate, not sloppiness. `captchaType.ts` imports zod to build its
 * schemas, so referencing the enum as a *value* here would pull zod into
 * anything that imports this module. The decision machines are bundled
 * standalone and published through an API with a 65,536-char ceiling, and a
 * runtime dependency on the `@prosopo/types` barrel has already breached that
 * once. Keeping this module free of runtime imports lets esbuild shake it
 * down to the table alone.
 */

import type { CaptchaType } from "./captchaType.js";

/**
 * Higher is stricter: image > puzzle > pow > frictionless.
 *
 * Keyed by the enum's string values rather than the enum itself, so callers
 * that carry a captcha type as a bare `string` — as the decision machines'
 * policy bags do — can rank it without importing the enum.
 */
const CAPTCHA_TYPE_RANK: Record<string, number> = {
	image: 4,
	puzzle: 3,
	pow: 2,
	frictionless: 1,
};

/**
 * Severity of a captcha type. Unset or unrecognised ranks 0, below every real
 * type, so a policy that names no captcha type never outranks one that does.
 */
export const rankCaptchaType = (
	captchaType: CaptchaType | string | undefined,
): number =>
	captchaType === undefined ? 0 : (CAPTCHA_TYPE_RANK[captchaType] ?? 0);

/**
 * True when `candidate` is strictly stricter than `incumbent`.
 *
 * Strictly, so an equal rank keeps the incumbent — callers reduce left to
 * right, and the two sides can carry different render tunables
 * (`solvedImagesCount`, `powDifficulty`, `puzzleTolerance`), so a tie has to
 * resolve to the first consistently rather than by table order.
 */
export const isStricterCaptchaType = (
	candidate: CaptchaType | string | undefined,
	incumbent: CaptchaType | string | undefined,
): boolean => rankCaptchaType(candidate) > rankCaptchaType(incumbent);
