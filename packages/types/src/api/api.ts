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

import type {
	RegisterSitekeysBodyTypeOutput,
	RemoveSitekeysBodyTypeOutput,
} from "@prosopo/types";
import type { IUserSettings, Tier } from "../client/index.js";
import type { CaptchaSolution } from "../datasets/index.js";
import type {
	DecisionMachineCaptchaType,
	DecisionMachineLanguage,
	DecisionMachineRuntime,
	DecisionMachineScope,
} from "../decisionMachine/index.js";
import type { ProcaptchaToken, StoredEvents } from "../procaptcha/index.js";
import type { ClientMetaData } from "../provider/database.js";
import type {
	ApiResponse,
	CaptchaResponseBody,
	CaptchaSolutionResponse,
	GetPowCaptchaResponse,
	GetPuzzleCaptchaResponse,
	ImageVerificationResponse,
	PowCaptchaSolutionResponse,
	Provider,
	ProviderRegistered,
	PuzzleCaptchaSolutionResponse,
	RandomProvider,
	UpdateProviderClientsResponse,
	VerificationResponse,
} from "../provider/index.js";

export interface ProviderApiInterface {
	getCaptchaChallenge(
		userAccount: string,
		randomProvider: RandomProvider,
		sessionId?: string,
		simdReadings?: string,
	): Promise<CaptchaResponseBody>;
	submitCaptchaSolution(
		captchas: CaptchaSolution[],
		requestHash: string,
		userAccount: string,
		timestamp: string,
		providerRequestHashSignature: string,
		userRequestHashSignature: string,
		behavioralData?: string,
		simdReadings?: string,
		clientMetaData?: ClientMetaData,
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
		sessionId?: string,
		simdReadings?: string,
	): Promise<GetPowCaptchaResponse>;
	// `timeout` (was the verifiedTimeout body param) removed — sourced
	// server-side from the per-client settings.
	submitPowCaptchaSolution(
		challenge: GetPowCaptchaResponse,
		userAccount: string,
		dappAccount: string,
		nonce: number,
		userTimestampSignature: string,
		behavioralData?: string,
		salt?: string,
		simdReadings?: string,
		clientMetaData?: ClientMetaData,
	): Promise<PowCaptchaSolutionResponse>;
	getPuzzleCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		sessionId?: string,
		simdReadings?: string,
	): Promise<GetPuzzleCaptchaResponse>;
	// `timeout` (was the verifiedTimeout body param) removed — see
	// submitPowCaptchaSolution above.
	submitPuzzleCaptchaSolution(
		challenge: GetPuzzleCaptchaResponse,
		userAccount: string,
		dappAccount: string,
		finalX: number,
		finalY: number,
		puzzleEvents: Array<{ x: number; y: number; t: number }>,
		userTimestampSignature: string,
		behavioralData?: string,
		salt?: string,
		simdReadings?: string,
		clientMetaData?: ClientMetaData,
	): Promise<PuzzleCaptchaSolutionResponse>;
	submitPuzzleCaptchaVerify(
		token: string,
		signatureHex: string,
		recencyLimit: number,
		user: string,
		ip?: string,
		email?: string,
	): Promise<VerificationResponse>;
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
		jwt: string,
	): Promise<ApiResponse>;
	registerSiteKeys(
		siteKeys: RegisterSitekeysBodyTypeOutput,
		jwt: string,
	): Promise<ApiResponse>;
	removeSiteKey(siteKey: string, jwt: string): Promise<ApiResponse>;
	removeSiteKeys(
		siteKeys: RemoveSitekeysBodyTypeOutput,
		jwt: string,
	): Promise<ApiResponse>;
	updateDetectorKey(detectorKey: string, jwt: string): Promise<ApiResponse>;
	removeDetectorKey(
		detectorKey: string,
		jwt: string,
		expirationInSeconds?: number,
	): Promise<ApiResponse>;
	updateDecisionMachine(
		scope: DecisionMachineScope,
		runtime: DecisionMachineRuntime,
		source: string,
		jwt: string,
		dappAccount?: string,
		language?: DecisionMachineLanguage,
		name?: string,
		version?: string,
		captchaType?: DecisionMachineCaptchaType,
	): Promise<ApiResponse>;
	getAllDecisionMachines(jwt: string): Promise<ApiResponse>;
	getDecisionMachine(id: string, jwt: string): Promise<ApiResponse>;
	removeDecisionMachine(id: string, jwt: string): Promise<ApiResponse>;
	removeAllDecisionMachines(jwt: string): Promise<ApiResponse>;
}
