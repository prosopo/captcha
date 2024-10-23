// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import type { CaptchaSolution } from "../datasets/index.js";
import type { StoredEvents } from "../procaptcha/index.js";
import type {
	CaptchaResponseBody,
	CaptchaSolutionResponse,
	GetPowCaptchaResponse,
	ImageVerificationResponse,
	PowCaptchaSolutionResponse,
	Provider,
	ProviderRegistered,
	RandomProvider,
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
		dapp: string,
		userAccount: string,
		blockNumber: number,
		dappUserSignature: string,
		commitmentId?: string,
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
	submitUserEvents(
		events: StoredEvents,
		string: string,
	): Promise<UpdateProviderClientsResponse>;
	updateProviderClients(): Promise<UpdateProviderClientsResponse>;
	getProviderStatus(): Promise<ProviderRegistered>;
	getProviderDetails(): Promise<Provider>;
}
