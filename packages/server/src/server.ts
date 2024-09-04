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
import { isHex, u8aToHex } from "@polkadot/util";
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
} from "@prosopo/types";
import { decodeProcaptchaOutput } from "@prosopo/types";

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
	 * @param challenge
	 */
	public async verifyProvider(
		token: string,
		timeouts: CaptchaTimeoutOutput,
		providerUrl: string,
		timestamp: number,
		challenge?: string,
	) {
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
				return false;
			}
			const result = await providerApi.submitPowCaptchaVerify(
				token,
				signatureHex,
				timeouts.pow.cachedTimeout,
			);
			return result.verified;
		}
		const imageTimeout = this.config.timeouts.image.cachedTimeout;
		const recent = timestamp ? Date.now() - timestamp < imageTimeout : false;
		if (!recent) {
			this.logger.error("Image captcha is not recent");
			return false;
		}
		const result = await providerApi.verifyDappUser(
			token,
			signatureHex,
			timeouts.image.cachedTimeout,
		);
		return result.verified;
	}

	/**
	 *
	 * @returns
	 * @param token
	 */
	public async isVerified(token: ProcaptchaToken): Promise<boolean> {
		if (!isHex(token)) {
			this.logger.error("Invalid token - not hex", token);
			return false;
		}

		const payload = decodeProcaptchaOutput(token);

		const { providerUrl, challenge, timestamp } =
			ProcaptchaOutputSchema.parse(payload);

		if (providerUrl) {
			return await this.verifyProvider(
				token,
				this.config.timeouts,
				providerUrl,
				Number(timestamp),
				challenge,
			);
		}
		// If we don't have a providerURL, something has gone deeply wrong
		throw new ProsopoApiError("API.BAD_REQUEST", {
			context: { message: "No provider URL" },
		});
	}
}
