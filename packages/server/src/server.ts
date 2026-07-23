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

import { HttpError, ProviderApi } from "@prosopo/api";
import { ProsopoApiError, ProsopoContractError } from "@prosopo/common";
import { Keyring } from "@prosopo/keyring";
import { loadBalancer } from "@prosopo/load-balancer";
import { type LogLevel, type Logger, getLogger } from "@prosopo/logger";
import type { KeyringPair } from "@prosopo/types";
import {
	CaptchaType,
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
	 * Verify a token with the issuing provider. Dispatches to the correct
	 * verify endpoint by inspecting the token's declared captchaType:
	 *  - puzzle  → submitPuzzleCaptchaVerify
	 *  - pow     → submitPowCaptchaVerify
	 *  - image   → verifyDappUser
	 * When captchaType is absent (a legacy token minted before the field was
	 * added), fall back to the historical heuristic: presence of `challenge`
	 * routes to PoW, absence routes to image. Legacy puzzle tokens follow the
	 * PoW branch — same behaviour as before this dispatch was introduced.
	 * @param token
	 * @param timeouts
	 * @param providerUrl
	 * @param timestamp
	 * @param user
	 * @param challenge
	 * @param ip
	 * @param email
	 * @param captchaType
	 */
	public async verifyProvider(
		token: string,
		timeouts: CaptchaTimeoutOutput,
		providerUrl: string,
		timestamp: number,
		user: string,
		challenge?: string,
		ip?: string,
		email?: string,
		captchaType?: CaptchaType,
	): Promise<VerificationResponse> {
		this.logger.info(() => ({
			data: { providerUrl, captchaType: captchaType ?? "legacy" },
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

		if (captchaType === CaptchaType.puzzle) {
			const puzzleTimeout = this.config.timeouts.puzzle.cachedTimeout;
			if (!this.isRecent(timestamp, puzzleTimeout, "Puzzle")) {
				return this.notRecentResponse();
			}
			return await providerApi.submitPuzzleCaptchaVerify(
				token,
				signatureHex,
				user,
				ip,
				email,
			);
		}

		if (captchaType === CaptchaType.pow) {
			const powTimeout = this.config.timeouts.pow.cachedTimeout;
			if (!this.isRecent(timestamp, powTimeout, "PoW")) {
				return this.notRecentResponse();
			}
			return await providerApi.submitPowCaptchaVerify(
				token,
				signatureHex,
				user,
				ip,
				email,
			);
		}

		if (captchaType === CaptchaType.image) {
			const imageTimeout = this.config.timeouts.image.cachedTimeout;
			if (!this.isRecent(timestamp, imageTimeout, "Image")) {
				return this.notRecentResponse();
			}
			return await providerApi.verifyDappUser(
				token,
				signatureHex,
				user,
				timeouts.image.cachedTimeout,
				ip,
				email,
			);
		}

		// Legacy path: no captchaType on the token. Preserve the historical
		// challenge/no-challenge heuristic so PoW and image tokens minted by
		// older client bundles still verify. Legacy puzzle tokens fall through
		// the PoW branch and 404 on the record lookup, which is the same
		// behaviour they had before this dispatch was introduced — the fix
		// requires the client bundle to be upgraded so the token itself
		// declares captchaType: puzzle.
		this.logger.warn(() => ({
			data: { challenge: Boolean(challenge) },
			msg: "Verifying legacy token without captchaType field; using challenge heuristic",
		}));
		if (challenge) {
			const powTimeout = this.config.timeouts.pow.cachedTimeout;
			if (!this.isRecent(timestamp, powTimeout, "PoW")) {
				return this.notRecentResponse();
			}
			return await providerApi.submitPowCaptchaVerify(
				token,
				signatureHex,
				user,
				ip,
				email,
			);
		}
		const imageTimeout = this.config.timeouts.image.cachedTimeout;
		if (!this.isRecent(timestamp, imageTimeout, "Image")) {
			return this.notRecentResponse();
		}
		return await providerApi.verifyDappUser(
			token,
			signatureHex,
			user,
			timeouts.image.cachedTimeout,
			ip,
			email,
		);
	}

	private isRecent(timestamp: number, timeoutMs: number, label: string): boolean {
		if (!timestamp) return false;
		const recent = Date.now() - timestamp < timeoutMs;
		if (!recent) {
			this.logger.error(() => ({
				data: { timestamp, timeoutMs },
				msg: `${label} captcha is not recent`,
			}));
		}
		return recent;
	}

	private notRecentResponse(): VerificationResponse {
		return {
			verified: false,
			status: i18n.t("API.USER_NOT_VERIFIED_TIME_EXPIRED"),
		};
	}

	/**
	 * @param token
	 * @param ip
	 * @param email
	 */
	public async isVerified(
		token: ProcaptchaToken,
		ip?: string,
		email?: string,
	): Promise<VerificationResponse> {
		try {
			const payload = decodeProcaptchaOutput(token);

			const { providerUrl, challenge, timestamp, user, captchaType } =
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
				email,
				captchaType,
			);

			this.logger.info(() => ({
				data: {
					verificationResponse,
					providerUrl,
					user,
					challenge,
					captchaType: captchaType ?? "legacy",
					siteKey: this.pair?.address,
				},
			}));

			return verificationResponse;
		} catch (err) {
			this.logger.error(() => ({ err, data: { token } }));
			const code = err instanceof HttpError ? err.status : 500;
			throw new ProsopoApiError("API.BAD_REQUEST", {
				context: { code, token },
			});
		}
	}
}
