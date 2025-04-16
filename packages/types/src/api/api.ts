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

import type { IUserSettings, Tier } from "../client/index.js";
import type { CaptchaSolution } from "../datasets/index.js";
import type { ProcaptchaToken, StoredEvents } from "../procaptcha/index.js";
import type {
	ApiResponse,
	CaptchaResponseBody,
	CaptchaSolutionResponse,
	GetPowCaptchaResponse,
	GetSliderCaptchaResponse,
	ImageVerificationResponse,
	PowCaptchaSolutionResponse,
	Provider,
	ProviderRegistered,
	RandomProvider,
	SliderCaptchaSolutionResponse,
	UpdateProviderClientsResponse,
} from "../provider/index.js";

export interface ProviderApiInterface {
	getCaptchaChallenge(
		userAccount: string,
		randomProvider: RandomProvider,
	): Promise<CaptchaResponseBody>;
	submitCaptchaSolution(
		captchas: CaptchaSolution[],
		requestHash: string,
		userAccount: string,
		timestamp: string,
		providerRequestHashSignature: string,
		userRequestHashSignature: string,
	): Promise<CaptchaSolutionResponse>;
	verifyDappUser(
		token: ProcaptchaToken,
		signature: string,
		userAccount: string,
		maxVerifiedTime?: number,
	): Promise<ImageVerificationResponse>;
	getPowCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
	): Promise<GetPowCaptchaResponse>;
	submitPowCaptchaSolution(
		challenge: GetPowCaptchaResponse,
		userAccount: string,
		dappAccount: string,
		nonce: number,
		userTimestampSignature: string,
		timeout?: number,
	): Promise<PowCaptchaSolutionResponse>;
	getSliderCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		sessionId?: string,
	): Promise<GetSliderCaptchaResponse>;
	submitSliderCaptchaSolution(
		userAccount: string,
		dappAccount: string,
		position: number,
		targetPosition: number,
		mouseMovements: Array<{ x: number; y: number; time: number }>,
		solveTime: number,
		timestamp: string,
		signature: {
			user: {
				timestamp: string;
			};
			provider: {
				challenge: string;
			};
		},
		fingerprint: string,
		challengeId: string,
	): Promise<SliderCaptchaSolutionResponse>;
	submitUserEvents(
		events: StoredEvents,
		string: string,
	): Promise<UpdateProviderClientsResponse>;
	getProviderStatus(): Promise<ProviderRegistered>;
	getProviderDetails(): Promise<Provider>;
	registerSiteKey(
		siteKey: string,
		tier: Tier,
		settings: IUserSettings,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse>;
	updateDetectorKey(
		detectorKey: string,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse>;
	removeDetectorKey(
		detectorKey: string,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse>;
}
