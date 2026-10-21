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

import { FrictionlessReason, ResultReason } from "../generated/wire.js";

export { FrictionlessReason, ResultReason };
/**
 * Reasons that mean "we measured nothing", as opposed to "we measured
 * something bad".
 *
 * Each of these paths sizes its challenge from a fixed constant
 * (`MISSING_TOKEN_IMAGE_ROUNDS` and friends) chosen to be short — "prove
 * you're human quickly", per their own doc comments — not from any signal the
 * client produced. Those constants nonetheless sit above the default baseline
 * of `DEFAULT_SOLVED_COUNT`, so anything reading a round count as severity
 * scores them as an escalation and applies a graduated response to a session
 * that never produced a measurement to grade.
 *
 * That is wrong wherever the "severity" changes what a legitimate user
 * experiences rather than what a suspected bot pays. The concrete case: a site
 * whose CSP blocks the detector bundle sends no token on EVERY request, so
 * every one of its users was permanently escalated and the site's own puzzle
 * settings were never rendered.
 *
 * `OLD_TIMESTAMP` is deliberately absent: its round count comes from
 * `timestampDecayFunction`, which scales with how stale the payload is. That
 * is a real graduated measurement, not a fixed fallback.
 */
export const NO_MEASUREMENT_REASONS: ReadonlySet<FrictionlessReason> = new Set([
	FrictionlessReason.MISSING_TOKEN,
	FrictionlessReason.MISSING_HEAD_HASH,
	FrictionlessReason.DECRYPTION_FAILED,
]);
