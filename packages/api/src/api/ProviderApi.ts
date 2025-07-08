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
import {
	AdminApiPaths,
	ApiParams,
	type ApiResponse,
	type CaptchaRequestBodyType,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	ClientApiPaths,
	type GetFrictionlessCaptchaResponse,
	type GetPowCaptchaChallengeRequestBodyType,
	type GetPowCaptchaResponse,
	type IUserSettings,
	type ImageVerificationResponse,
	type PowCaptchaSolutionResponse,
	type ProcaptchaToken,
	type Provider,
	type ProviderApiInterface,
	type ProviderRegistered,
	PublicApiPaths,
	type RandomProvider,
	type RegisterSitekeyBodyTypeOutput,
	type ServerPowCaptchaVerifyRequestBodyType,
	type StoredEvents,
	SubmitPowCaptchaSolutionBody,
	type Tier,
	UpdateDetectorKeyBody,
	type UpdateProviderClientsResponse,
	type VerificationResponse,
	type VerifySolutionBodyTypeInput,
} from "@prosopo/types";
import {
	type DeleteRulesEndpointSchemaInput,
	type InsertManyRulesEndpointInputSchema,
	accessRuleApiPaths,
} from "@prosopo/user-access-policy";
import HttpClientBase from "./HttpClientBase.js";

export default class ProviderApi
	extends HttpClientBase
	implements ProviderApiInterface {
	private account: string;

	constructor(providerUrl: string, account: string) {
		const providerUrlWithProtocol = !providerUrl.startsWith("http")
			? `https://${providerUrl}`
			: providerUrl;
		super(providerUrlWithProtocol);
		this.account = account;
	}

	public getCaptchaChallenge(
		userAccount: string,
		randomProvider: RandomProvider,
		sessionId?: string,
	): Promise<CaptchaResponseBody> {
		const { provider } = randomProvider;
		const dappAccount = this.account;
		const body: CaptchaRequestBodyType = {
			[ApiParams.dapp]: dappAccount,
			[ApiParams.user]: userAccount,
			[ApiParams.datasetId]: provider.datasetId,
		};
		if (sessionId) {
			body[ApiParams.sessionId] = sessionId;
		}
		return this.post(ClientApiPaths.GetImageCaptchaChallenge, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": userAccount,
			},
		});
	}

	public submitCaptchaSolution(
		captchas: CaptchaSolution[],
		requestHash: string,
		userAccount: string,
		timestamp: string,
		providerRequestHashSignature: string,
		userTimestampSignature: string,
	): Promise<CaptchaSolutionResponse> {
		const body: CaptchaSolutionBodyType = {
			[ApiParams.user]: userAccount,
			[ApiParams.dapp]: this.account,
			[ApiParams.captchas]: captchas,
			[ApiParams.requestHash]: requestHash,
			[ApiParams.timestamp]: timestamp,
			[ApiParams.signature]: {
				[ApiParams.user]: {
					[ApiParams.timestamp]: userTimestampSignature,
				},
				[ApiParams.provider]: {
					[ApiParams.requestHash]: providerRequestHashSignature,
				},
			},
		};
		return this.post(ClientApiPaths.SubmitImageCaptchaSolution, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": userAccount,
			},
		});
	}

	public verifyDappUser(
		token: ProcaptchaToken,
		signature: string,
		userAccount: string,
		maxVerifiedTime?: number,
		ip?: string,
	): Promise<ImageVerificationResponse> {
		const payload: VerifySolutionBodyTypeInput = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: signature,
			[ApiParams.ip]: ip,
		};
		if (maxVerifiedTime) {
			payload[ApiParams.maxVerifiedTime] = maxVerifiedTime;
		}

		return this.post(ClientApiPaths.VerifyImageCaptchaSolutionDapp, payload, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": userAccount,
			},
		});
	}

	public getPowCaptchaChallenge(
		user: string,
		dapp: string,
		sessionId?: string,
	): Promise<GetPowCaptchaResponse> {
		const body: GetPowCaptchaChallengeRequestBodyType = {
			[ApiParams.user]: user.toString(),
			[ApiParams.dapp]: dapp.toString(),
			...(sessionId && { [ApiParams.sessionId]: sessionId }),
		};
		return this.post(ClientApiPaths.GetPowCaptchaChallenge, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": user,
			},
		});
	}

	public submitPowCaptchaSolution(
		challenge: GetPowCaptchaResponse,
		userAccount: string,
		dappAccount: string,
		nonce: number,
		userTimestampSignature: string,
		timeout?: number,
	): Promise<PowCaptchaSolutionResponse> {
		const body = SubmitPowCaptchaSolutionBody.parse({
			[ApiParams.challenge]: challenge.challenge,
			[ApiParams.difficulty]: challenge.difficulty,
			[ApiParams.timestamp]: challenge.timestamp,
			[ApiParams.user]: userAccount.toString(),
			[ApiParams.dapp]: dappAccount.toString(),
			[ApiParams.nonce]: nonce,
			[ApiParams.verifiedTimeout]: timeout,
			[ApiParams.signature]: {
				[ApiParams.provider]:
					challenge[ApiParams.signature][ApiParams.provider],
				[ApiParams.user]: {
					[ApiParams.timestamp]: userTimestampSignature,
				},
			},
		});
		return this.post(ClientApiPaths.SubmitPowCaptchaSolution, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": userAccount,
			},
		});
	}

	public getFrictionlessCaptcha(
		token: string,
		dapp: string,
		user: string,
	): Promise<GetFrictionlessCaptchaResponse> {
		const body = {
			[ApiParams.token]: token,
			[ApiParams.dapp]: dapp,
			[ApiParams.user]: user,
		};
		return this.post(ClientApiPaths.GetFrictionlessCaptchaChallenge, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": user,
			},
		});
	}

	public submitUserEvents(
		events: StoredEvents,
		string: string,
	): Promise<UpdateProviderClientsResponse> {
		return this.post(
			ClientApiPaths.SubmitUserEvents,
			{ events, string },
			{
				headers: {
					"Prosopo-Site-Key": this.account,
				},
			},
		);
	}

	public getProviderStatus(): Promise<ProviderRegistered> {
		return this.fetch(ClientApiPaths.GetProviderStatus, {
			headers: {
				"Prosopo-Site-Key": this.account,
			},
		});
	}

	public getProviderDetails(): Promise<Provider> {
		return this.fetch(PublicApiPaths.GetProviderDetails, {
			headers: {
				"Prosopo-Site-Key": this.account,
			},
		});
	}

	public submitPowCaptchaVerify(
		token: string,
		signatureHex: string,
		recencyLimit: number,
		user: string,
		ip?: string,
	): Promise<VerificationResponse> {
		const body: ServerPowCaptchaVerifyRequestBodyType = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: signatureHex,
			[ApiParams.verifiedTimeout]: recencyLimit,
			[ApiParams.ip]: ip,
		};
		return this.post(ClientApiPaths.VerifyPowCaptchaSolution, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": user,
			},
		});
	}

	public registerSiteKey(
		siteKey: string,
		tier: Tier,
		settings: IUserSettings,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		const body: RegisterSitekeyBodyTypeOutput = { siteKey, tier, settings };
		return this.post(AdminApiPaths.SiteKeyRegister, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}

	public updateDetectorKey(
		detectorKey: string,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(
			AdminApiPaths.UpdateDetectorKey,
			UpdateDetectorKeyBody.parse({ detectorKey }),
			{
				headers: {
					"Prosopo-Site-Key": this.account,
					timestamp,
					signature,
				},
			},
		);
	}

	public removeDetectorKey(
		detectorKey: string,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(
			AdminApiPaths.RemoveDetectorKey,
			UpdateDetectorKeyBody.parse({ detectorKey }),
			{
				headers: {
					"Prosopo-Site-Key": this.account,
					timestamp,
					signature,
				},
			},
		);
	}

	public insertUserAccessPolicies(
		rules: InsertManyRulesEndpointInputSchema,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(accessRuleApiPaths.INSERT_MANY, rules, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}

	public deleteUserAccessPolicies(
		rules: DeleteRulesEndpointSchemaInput,
		timestamp: string,
		signature: string,
	): Promise<ApiResponse> {
		return this.post(accessRuleApiPaths.DELETE_MANY, rules, {
			headers: {
				"Prosopo-Site-Key": this.account,
				timestamp,
				signature,
			},
		});
	}
}
