// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { Ti18n } from "@prosopo/locale";
import type { ProcaptchaClientConfigInput } from "../config/index.js";
import type { Account } from "../procaptcha/manager.js";
import type { Callbacks } from "../procaptcha/manager.js";
import type { FrictionlessState } from "../procaptcha/props.js";
import type { CaptchaResponseBody } from "../provider/api.js";

/**
 * Extended CaptchaResponseBody specifically for slider captcha
 */
export interface SliderCaptchaResponseBody extends CaptchaResponseBody {
	imageUrl?: string;
	targetPosition?: number;
	challengeId: string;
}

/**
 * Mouse movement data structure for slider captcha
 */
export interface MouseMovement {
	x: number;
	y: number;
	time: number;
}

/**
 * The state of the Slider Procaptcha component
 */
export interface ProcaptchaSliderState {
	isHuman: boolean; // Whether the user has been verified as human
	showModal: boolean; // Whether to show the captcha modal
	loading: boolean; // Whether the captcha is loading
	challenge?: SliderCaptchaResponseBody; // The current slider challenge
	account?: Account; // The account operating the challenge
	dappAccount?: string; // The dapp account (site key)
	timeout?: NodeJS.Timeout; // Timer for the challenge
	successfullChallengeTimeout?: NodeJS.Timeout; // Timer for successful challenge validity
	attemptCount: number; // Number of verification attempts
	error?: {
		// Error information if any
		message: string;
		key: string;
	};
	mouseMovements: MouseMovement[]; // Track mouse movements for verification
	captchaStartTime?: number; // When the captcha challenge started

	// Additional properties needed by the widget
	config: ProcaptchaClientConfigInput;
	frictionlessState?: FrictionlessState;
	i18n?: Ti18n;
	callbacks?: Partial<Callbacks>;
}

/**
 * Function to update the state of the Slider Procaptcha component
 */
export type ProcaptchaSliderStateUpdateFn = (
	state: Partial<ProcaptchaSliderState>,
) => void;

/**
 * Verification result interface
 */
export interface SliderVerificationResult {
	verified: boolean;
	timestamp: number;
	challenge: {
		target: number;
		width: number;
	};
	solution: {
		position: number;
	};
	mouseMovements: number;
	solveTime: number;
	fingerprint: string;
}
