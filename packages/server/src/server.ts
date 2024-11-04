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
import { Keyring } from "@polkadot/keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import { u8aToHex } from "@polkadot/util";
import { ProviderApi } from "@prosopo/api";
import {
	type LogLevel,
	type Logger,
	ProsopoApiError,
	ProsopoContractError,
	getLogger,
} from "@prosopo/common";
import {
	type CaptchaTimeoutOutput,
	ProcaptchaOutputSchema,
	type ProcaptchaToken,
	type ProsopoServerConfigOutput,
	type VerificationResponse,
	decodeProcaptchaOutput,
} from "@prosopo/types";
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
		this.logger = getLogger(
			this.config.logLevel as unknown as LogLevel,
			"@prosopo/server",
		);
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
	 */
	public async verifyProvider(
		token: string,
		timeouts: CaptchaTimeoutOutput,
		providerUrl: string,
		timestamp: number,
		user: string,
		challenge?: string,
	): Promise<VerificationResponse> {
		this.logger.info("Verifying with provider.");
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
				this.logger.error("PoW captcha is not recent");
				return {
					verified: false,
					error: {
						code: "API.USER_NOT_VERIFIED_TIME_EXPIRED",
						message: i18n.t("API.USER_NOT_VERIFIED_TIME_EXPIRED"),
					},
				};
			}
			return await providerApi.submitPowCaptchaVerify(
				token,
				signatureHex,
				timeouts.pow.cachedTimeout,
				user,
			);
		}
		const imageTimeout = this.config.timeouts.image.cachedTimeout;
		const recent = timestamp ? Date.now() - timestamp < imageTimeout : false;
		if (!recent) {
			this.logger.error("Image captcha is not recent");
			return {
				verified: false,
				error: {
					code: "API.USER_NOT_VERIFIED_TIME_EXPIRED",
					message: i18n.t("API.USER_NOT_VERIFIED_TIME_EXPIRED"),
				},
			};
		}
		return await providerApi.verifyDappUser(
			token,
			signatureHex,
			user,
			timeouts.image.cachedTimeout,
		);
	}

	/**
	 *
	 * @returns
	 * @param token
	 */
	public async isVerified(
		token: ProcaptchaToken,
	): Promise<VerificationResponse> {
		try {
			const payload = decodeProcaptchaOutput(token);

			const { providerUrl, challenge, timestamp, user } =
			const { providerUrl, challenge, timestamp, dapp } =
				ProcaptchaOutputSchema.parse(payload);

			if (dapp !== this.pair?.address) {
				this.logger.error("Dapp address does not match address in token");
				return {
					verified: false,
					error: {
						code: "API.INVALID_SECRET_KEY",
						message: i18n.t("API.INVALID_SECRET_KEY"),
					},
				};
			}

			if (providerUrl) {
				return await this.verifyProvider(
					token,
					this.config.timeouts,
					providerUrl,
					Number(timestamp),
					user,
					challenge,
				);
			}
			this.logger.error("No provider URL found in user token");
			return {
				verified: false,
				status: i18n.t("API.USER_NOT_VERIFIED"),
			};
		} catch (err) {
			this.logger.error({ err, token });
			throw new ProsopoApiError("API.BAD_REQUEST", {
				context: { code: 500, token },
			});
		}
	}
}
