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
import {
	ApiParams,
	ApiPaths,
	type CaptchaResponseBody,
	type CaptchaSolution,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	type GetFrictionlessCaptchaResponse,
	type GetPowCaptchaChallengeRequestBodyType,
	type GetPowCaptchaResponse,
	type ImageVerificationResponse,
	type PowCaptchaSolutionResponse,
	type ProcaptchaToken,
	type Provider,
	type ProviderApiInterface,
	type ProviderRegistered,
	type RandomProvider,
	type ServerPowCaptchaVerifyRequestBodyType,
	type StoredEvents,
	SubmitPowCaptchaSolutionBody,
	type TGetImageCaptchaChallengePathAndParams,
	type UpdateProviderClientsResponse,
	type VerificationResponse,
	type VerifySolutionBodyTypeInput,
} from "@prosopo/types";
import HttpClientBase from "./HttpClientBase.js";

export default class ProviderApi
	extends HttpClientBase
	implements ProviderApiInterface
{
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
	): Promise<CaptchaResponseBody> {
		const { provider } = randomProvider;
		const dappAccount = this.account;
		const body = {
			[ApiParams.dapp]: dappAccount,
			[ApiParams.user]: userAccount,
			[ApiParams.datasetId]: provider.datasetId,
		};
		return this.post(ApiPaths.GetImageCaptchaChallenge, body, {
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
		return this.post(ApiPaths.SubmitImageCaptchaSolution, body, {
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
	): Promise<ImageVerificationResponse> {
		const payload: VerifySolutionBodyTypeInput = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: signature,
		};
		if (maxVerifiedTime) {
			payload[ApiParams.maxVerifiedTime] = maxVerifiedTime;
		}

		return this.post(ApiPaths.VerifyImageCaptchaSolutionDapp, payload, {
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
		return this.post(ApiPaths.GetPowCaptchaChallenge, body, {
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
		return this.post(ApiPaths.SubmitPowCaptchaSolution, body, {
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
		return this.post(ApiPaths.GetFrictionlessCaptchaChallenge, body, {
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
			ApiPaths.SubmitUserEvents,
			{ events, string },
			{
				headers: {
					"Prosopo-Site-Key": this.account,
				},
			},
		);
	}

	public getProviderStatus(): Promise<ProviderRegistered> {
		return this.fetch(ApiPaths.GetProviderStatus, {
			headers: {
				"Prosopo-Site-Key": this.account,
			},
		});
	}

	public getProviderDetails(): Promise<Provider> {
		return this.fetch(ApiPaths.GetProviderDetails, {
			headers: {
				"Prosopo-Site-Key": this.account,
			},
		});
	}

	public updateProviderClients(): Promise<UpdateProviderClientsResponse> {
		return this.post(ApiPaths.UpdateProviderClients, {});
	}

	public submitPowCaptchaVerify(
		token: string,
		signatureHex: string,
		recencyLimit: number,
		user: string,
	): Promise<VerificationResponse> {
		const body: ServerPowCaptchaVerifyRequestBodyType = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: signatureHex,
			[ApiParams.verifiedTimeout]: recencyLimit,
		};
		return this.post(ApiPaths.VerifyPowCaptchaSolution, body, {
			headers: {
				"Prosopo-Site-Key": this.account,
				"Prosopo-User": user,
			},
		});
	}
}
