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

import { ProviderApi } from "@prosopo/api";
import {
	type LogLevel,
	type Logger,
	ProsopoApiError,
	ProsopoContractError,
	getLogger,
} from "@prosopo/common";
import { Keyring } from "@prosopo/keyring";
import { loadBalancer } from "@prosopo/load-balancer";
import type { KeyringPair } from "@prosopo/types";
import {
	type CaptchaTimeoutOutput,
	ProcaptchaOutputSchema,
	type ProcaptchaToken,
	type ProsopoServerConfigOutput,
	type VerificationResponse,
	decodeProcaptchaOutput,
} from "@prosopo/types";
import { u8aToHex } from "@prosopo/util";
import i18n from "i18next";

export class ProsopoServer {
	config: ProsopoServerConfigOutput;
	dappAccount: string | undefined;
	defaultEnvironment: string;
	logger: Logger;
	keyring: Keyring;
	pair: KeyringPair | undefined;

	constructor(config: ProsopoServerConfigOutput, pair?: KeyringPair) {
		this.config = config;
		this.pair = pair;
		this.defaultEnvironment = this.config.defaultEnvironment;
		this.dappAccount = this.config.account.address;
		this.logger = getLogger({
			scope: "prosopo.server",
			url: import.meta.url,
		});
		this.keyring = new Keyring({
			type: "sr25519",
		});
	}

	getProviderApi(providerUrl: string): ProviderApi {
		return new ProviderApi(providerUrl, this.dappAccount || "");
	}

	/**
	 * Verify the user with the provider URL passed in. If a challenge is provided, we use the challenge to verify the
	 * user. If not, we use the user, dapp, and optionally the commitmentID, to verify the user.
	 * @param token
	 * @param timeouts
	 * @param providerUrl
	 * @param timestamp
	 * @param user
	 * @param challenge
	 * @param ip
	 */
	public async verifyProvider(
		token: string,
		timeouts: CaptchaTimeoutOutput,
		providerUrl: string,
		timestamp: number,
		user: string,
		challenge?: string,
		ip?: string,
	): Promise<VerificationResponse> {
		this.logger.info(() => ({
			data: { providerUrl },
			msg: "Verifying with provider",
		}));
		const dappUserSignature = this.pair?.sign(timestamp.toString());
		if (!dappUserSignature) {
			throw new ProsopoContractError("CAPTCHA.INVALID_TIMESTAMP", {
				context: { error: "Timestamp not found" },
			});
		}
		const signatureHex = u8aToHex(dappUserSignature);

		const providerApi = this.getProviderApi(providerUrl);
		if (challenge) {
			const powTimeout = this.config.timeouts.pow.cachedTimeout;
			const recent = timestamp ? Date.now() - timestamp < powTimeout : false;
			if (!recent) {
				this.logger.error(() => ({
					data: { timestamp },
					msg: "PoW captcha is not recent",
				}));
				return {
					verified: false,
					status: i18n.t("API.USER_NOT_VERIFIED_TIME_EXPIRED"),
				};
			}
			return await providerApi.submitPowCaptchaVerify(
				token,
				signatureHex,
				timeouts.pow.cachedTimeout,
				user,
				ip,
			);
		}
		const imageTimeout = this.config.timeouts.image.cachedTimeout;
		const recent = timestamp ? Date.now() - timestamp < imageTimeout : false;
		if (!recent) {
			this.logger.error(() => ({
				data: { timestamp },
				msg: "Image captcha is not recent",
			}));
			return {
				verified: false,
				status: i18n.t("API.USER_NOT_VERIFIED_TIME_EXPIRED"),
			};
		}
		return await providerApi.verifyDappUser(
			token,
			signatureHex,
			user,
			timeouts.image.cachedTimeout,
			ip,
		);
	}

	/**
	 *
	 * @returns
	 * @param token
	 */
	public async isVerified(
		token: ProcaptchaToken,
		ip?: string,
	): Promise<VerificationResponse> {
		try {
			const payload = decodeProcaptchaOutput(token);

			const { providerUrl, challenge, timestamp, user } =
				ProcaptchaOutputSchema.parse(payload);

			// check provides URL is valid
			const providers = await loadBalancer(this.config.defaultEnvironment);

			// find the provider by URL in providers
			const provider = providers.find((p) => p.url === providerUrl);

			// if the provider is not found, return an error
			if (!provider) {
				this.logger.error(() => ({
					data: { providerUrl },
					msg: "Provider not found",
				}));
				return {
					verified: false,
					status: i18n.t("API.USER_NOT_VERIFIED"),
				};
			}
			const verificationResponse = await this.verifyProvider(
				token,
				this.config.timeouts,
				provider.url,
				Number(timestamp),
				user,
				challenge,
				ip,
			);

			this.logger.info(() => ({
				data: {
					verificationResponse,
					providerUrl,
					user,
					challenge,
					siteKey: this.pair?.address,
				},
			}));

			return verificationResponse;
		} catch (err) {
			this.logger.error(() => ({ err, data: { token } }));
			throw new ProsopoApiError("API.BAD_REQUEST", {
				context: { code: 500, token },
			});
		}
	}
}
