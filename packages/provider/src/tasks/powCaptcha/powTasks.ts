import type { KeyringPair } from "@polkadot/keyring/types";
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
import { u8aToHex } from "@polkadot/util";
import { stringToHex } from "@polkadot/util";
import { ProsopoEnvError } from "@prosopo/common";
import type { PoWCaptcha } from "@prosopo/types";
import type { Database } from "@prosopo/types-database";
import {
	checkPowSignature,
	checkPowSolution,
	checkRecentPowSolution,
} from "./powTasksUtils.js";

export class PowCaptchaManager {
	pair: KeyringPair;
	db: Database;
	POW_SEPARATOR: string;

	// biome-ignore lint/suspicious/noExplicitAny: TODO fix
	constructor(pair: any, db: Database) {
		this.pair = pair;
		this.db = db;
		this.POW_SEPARATOR = "___";
	}

	/**
	 * @description Generates a PoW Captcha for a given user and dapp
	 *
	 * @param {string} userAccount - user that is solving the captcha
	 * @param {string} dappAccount - dapp that is requesting the captcha
	 */
	async getPowCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		origin: string,
	): Promise<PoWCaptcha> {
		const difficulty = 4;
		const timestamp = Date.now().toString();

		// Use blockhash, userAccount and dappAccount for string for challenge
		const challenge = `${timestamp}___${userAccount}___${dappAccount}`;
		const signature = u8aToHex(this.pair.sign(stringToHex(challenge)));

		return { challenge, difficulty, signature, timestamp };
	}

	/**
	 * @description Verifies a PoW Captcha for a given user and dapp
	 *
	 * @param {string} challenge - the starting string for the PoW challenge
	 * @param {string} difficulty - how many leading zeroes the solution must have
	 * @param {string} signature - proof that the Provider provided the challenge
	 * @param {string} nonce - the string that the user has found that satisfies the PoW challenge
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
	 */
	async verifyPowCaptchaSolution(
		challenge: string,
		difficulty: number,
		signature: string,
		nonce: number,
		timeout: number,
	): Promise<boolean> {
		checkRecentPowSolution(challenge, timeout);
		checkPowSignature(challenge, signature, this.pair.address);
		checkPowSolution(nonce, challenge, difficulty);

		await this.db.storePowCaptchaRecord(challenge, false);
		return true;
	}

	/**
	 * @description Verifies a PoW Captcha for a given user and dapp. This is called by the server to verify the user's solution
	 * and update the record in the database to show that the user has solved the captcha
	 *
	 * @param {string} dappAccount - the dapp that is requesting the captcha
	 * @param {string} challenge - the starting string for the PoW challenge
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
	 */
	async serverVerifyPowCaptchaSolution(
		dappAccount: string,
		challenge: string,
		timeout: number,
	): Promise<boolean> {
		const challengeRecord =
			await this.db.getPowCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			throw new ProsopoEnvError("DATABASE.CAPTCHA_GET_FAILED", {
				context: {
					failedFuncName: this.serverVerifyPowCaptchaSolution.name,
					challenge,
				},
			});
		}

		if (challengeRecord.checked) return false;

		const challengeDappAccount = challengeRecord.challenge.split(
			this.POW_SEPARATOR,
		)[2];

		if (dappAccount !== challengeDappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifyPowCaptchaSolution.name,
					dappAccount,
					challengeDappAccount,
				},
			});
		}

		checkRecentPowSolution(challenge, timeout);

		await this.db.updatePowCaptchaRecord(challengeRecord.challenge, true);
		return true;
	}
}
