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

import {
	ApiParams,
	type CaptchaSolutionEscalation,
	type ProcaptchaEscalationHandler,
} from "@prosopo/types";

/**
 * `escalated`: the provider accepted the answer but wants a follow-up
 * challenge, which the frictionless wrapper mounts in this widget's place.
 */
export type SolutionSubmitOutcome = "verified" | "escalated" | "failed";

/**
 * Hands an escalated solve to the frictionless wrapper, returning whether it
 * did. (0, 0) is the untrusted-event / autoStart default, so it is not passed
 * on as a click the escalated widget should re-encode.
 */
export const handOffEscalation = (
	escalation: CaptchaSolutionEscalation | undefined,
	onEscalate: ProcaptchaEscalationHandler | undefined,
	clickX: number | undefined,
	clickY: number | undefined,
): boolean => {
	if (!escalation || !onEscalate) return false;
	const checkboxClick =
		clickX !== undefined &&
		clickY !== undefined &&
		(clickX !== 0 || clickY !== 0)
			? { x: clickX, y: clickY }
			: undefined;
	onEscalate(
		escalation[ApiParams.captchaType],
		escalation[ApiParams.sessionId],
		checkboxClick,
	);
	return true;
};
