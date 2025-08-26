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

import { stringToHex, u8aToHex } from "@polkadot/util";
import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import type { Logger } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import {
	ApiParams,
	type CaptchaResult,
	CaptchaStatus,
	type IPAddress,
	POW_SEPARATOR,
	type PoWCaptcha,
	type PoWChallengeId,
	type RequestHeaders,
} from "@prosopo/types";
import type {
	IProviderDatabase,
	PoWCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { at, verifyRecency } from "@prosopo/util";
import { getIpAddressFromComposite } from "../../compositeIpAddress.js";
import { deepValidateIpAddress } from "../../util.js";
import { CaptchaManager } from "../captchaManager.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { checkPowSignature, validateSolution } from "./powTasksUtils.js";

const DEFAULT_POW_DIFFICULTY = 4;

export class PowCaptchaManager extends CaptchaManager {
	POW_SEPARATOR: string;

	constructor(db: IProviderDatabase, pair: KeyringPair, logger?: Logger) {
		super(db, pair, logger);
		this.POW_SEPARATOR = POW_SEPARATOR;
	}

	/**
	 * @description Generates a PoW Captcha for a given user and dapp
	 *
	 * @param {string} userAccount - user that is solving the captcha
	 * @param {string} dappAccount - dapp that is requesting the captcha
	 * @param origin - not currently used
	 * @param powDifficulty
	 */
	async getPowCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		origin: string,
		powDifficulty?: number,
	): Promise<PoWCaptcha> {
		const difficulty = powDifficulty || DEFAULT_POW_DIFFICULTY;
		const requestedAtTimestamp = Date.now();

		// Create nonce for the challenge
		const nonce = Math.floor(Math.random() * 1000000);

		// Use blockhash, userAccount and dappAccount for string for challenge
		const challenge: PoWChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));
		return {
			challenge,
			difficulty,
			providerSignature: challengeSignature,
			requestedAtTimestamp,
		};
	}

	/**
	 * @description Verifies a PoW Captcha for a given user and dapp
	 *
	 * @param {string} challenge - the starting string for the PoW challenge
	 * @param {string} difficulty - how many leading zeroes the solution must have
	 * @param {string} providerChallengeSignature - proof that the Provider provided the challenge
	 * @param {string} nonce - the string that the user has found that satisfies the PoW challenge
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
	 * @param {string} userTimestampSignature
	 * @param ipAddress
	 * @param headers
	 */
	async verifyPowCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		nonce: number,
		timeout: number,
		userTimestampSignature: string,
		ipAddress: IPAddress,
		headers: RequestHeaders,
	): Promise<boolean> {
		// Check signatures before doing DB reads to avoid unnecessary network connections
		checkPowSignature(
			challenge,
			providerChallengeSignature,
			this.pair.address,
			ApiParams.challenge,
		);

		const challengeSplit = challenge.split(this.POW_SEPARATOR);
		const timestamp = Number.parseInt(at(challengeSplit, 0));
		const userAccount = at(challengeSplit, 1);

		checkPowSignature(
			timestamp.toString(),
			userTimestampSignature,
			userAccount,
			ApiParams.timestamp,
		);

		const challengeRecord =
			await this.db.getPowCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			this.logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));
			// no record of this challenge
			return false;
		}

		const difficulty = challengeRecord.difficulty;

		if (!verifyRecency(challenge, timeout)) {
			await this.db.updatePowCaptchaRecord(
				challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.INVALID_TIMESTAMP",
				},
				false, //serverchecked
				true, // usersubmitted
				userTimestampSignature,
			);
			return false;
		}

		const correct = validateSolution(nonce, challenge, difficulty);

		let result: CaptchaResult = { status: CaptchaStatus.approved };
		if (!correct) {
			result = {
				status: CaptchaStatus.disapproved,
				reason: "CAPTCHA.INVALID_SOLUTION",
			};
		}

		await this.db.updatePowCaptchaRecord(
			challenge,
			result,
			false,
			true,
			userTimestampSignature,
		);
		return correct;
	}

	/**
	 * @description Verifies a PoW Captcha for a given user and dapp. This is called by the server to verify the user's solution
	 * and update the record in the database to show that the user has solved the captcha
	 *
	 * @param {string} dappAccount - the dapp that is requesting the captcha
	 * @param {string} challenge - the starting string for the PoW challenge
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
	 * @param ip
	 */
	async serverVerifyPowCaptchaSolution(
		dappAccount: string,
		challenge: string,
		timeout: number,
		env: ProviderEnvironment,
		ip?: string,
	): Promise<{ verified: boolean; score?: number }> {
		const notVerifiedResponse = { verified: false };

		const challengeRecord =
			await this.db.getPowCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			this.logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));

			return notVerifiedResponse;
		}

		if (ip) {
			const challengeIpAddress = getIpAddressFromComposite(
				challengeRecord.ipAddress,
			);

			if (!env.config.ipApi.apiKey || !env.config.ipApi.baseUrl) {
				this.logger.warn(() => ({
					msg: "No IP API Service found",
					data: { dappAccount, challenge },
				}));
				throw new ProsopoEnvError("API.UNKNOWN");
			}

			const ipValidation = await deepValidateIpAddress(
				ip,
				challengeIpAddress,
				this.logger,
				env.config.ipApi.apiKey,
				env.config.ipApi.baseUrl,
			);

			if (!ipValidation.isValid) {
				this.logger.error(() => ({
					msg: "IP validation failed for PoW captcha",
					data: {
						ip,
						challengeIp: challengeIpAddress.address,
						error: ipValidation.errorMessage,
						distanceKm: ipValidation.distanceKm,
					},
				}));
				return notVerifiedResponse;
			}
		}

		if (challengeRecord.result.status !== CaptchaStatus.approved) {
			throw new ProsopoApiError("CAPTCHA.INVALID_SOLUTION", {
				context: {
					failedFuncName: this.serverVerifyPowCaptchaSolution.name,
					challenge,
				},
			});
		}

		if (challengeRecord.serverChecked) return notVerifiedResponse;

		const challengeDappAccount = challengeRecord.dappAccount;

		if (dappAccount !== challengeDappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifyPowCaptchaSolution.name,
					dappAccount,
					challengeDappAccount,
				},
			});
		}

		const recent = verifyRecency(challenge, timeout);

		await this.db.markDappUserPoWCommitmentsChecked([
			challengeRecord.challenge,
		]);

		if (!recent) {
			return notVerifiedResponse;
		}

		let score: number | undefined;
		if (challengeRecord.frictionlessTokenId) {
			const tokenRecord = await this.db.getFrictionlessTokenRecordByTokenId(
				challengeRecord.frictionlessTokenId,
			);
			if (tokenRecord) {
				score = computeFrictionlessScore(tokenRecord?.scoreComponents);
				this.logger.info(() => ({
					data: {
						tscoreComponents: { ...(tokenRecord?.scoreComponents || {}) },
						score,
					},
				}));
			}
		}

		return { verified: true, ...(score ? { score } : {}) };
	}
}
