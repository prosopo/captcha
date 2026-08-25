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

import { CaptchaType } from "../client/captchaType/captchaType.js";
import type { CaptchaResult } from "../datasets/captcha.js";
import { CaptchaStatus } from "../datasets/captcha.js";
import { ResultReason } from "./reasons.js";

// Reasons that represent a legitimate user-side failure of an image,
// puzzle or audio challenge — the user selected the wrong images, dropped
// the puzzle piece in the wrong place, or mistyped what they heard.
// Everything else that produces a Disapproved verdict on those flows is a
// server-side block (traffic filter, decision machine, IP validation,
// spam rules, replay/timestamp detection, etc.).
const USER_FAILURE_REASONS: ReadonlySet<ResultReason> = new Set([
	ResultReason.CAPTCHA_INVALID_SOLUTION,
]);

/**
 * True when a captcha verify result represents a block (server-side
 * rejection) as opposed to a legitimate user failure of the challenge.
 *
 * Session-write paths use this to stamp `blocked=true` on the session
 * record so downstream readers — the portal Overview chart, audit search,
 * exports — can key off a single field instead of re-deriving the
 * classification per query.
 *
 * PoW is a special case: nobody should ever legitimately "fail" a
 * proof-of-work, so any Disapproved PoW counts as a block regardless of
 * reason. For image, puzzle and audio we distinguish user failure
 * (CAPTCHA_INVALID_SOLUTION) from server-side rejections — mishearing a
 * digit is an ordinary thing for a human to do and must not be counted
 * as a block, or the portal's block chart turns into a chart of how hard
 * the audio challenge is.
 */
export const isBlockingCaptchaResult = (
	captchaType: CaptchaType,
	result: CaptchaResult,
): boolean => {
	if (result.status !== CaptchaStatus.disapproved) return false;
	if (captchaType === CaptchaType.pow) return true;
	if (result.reason === undefined) return true;
	return !USER_FAILURE_REASONS.has(result.reason);
};
