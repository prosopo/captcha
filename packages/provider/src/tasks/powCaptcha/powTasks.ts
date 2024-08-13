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
import type { KeyringPair } from "@polkadot/keyring/types";
import { u8aToHex } from "@polkadot/util";
import { stringToHex } from "@polkadot/util";
import { ProsopoEnvError } from "@prosopo/common";
import {
  ApiParams,
  POW_SEPARATOR,
  type PoWCaptcha,
  PoWChallengeId,
} from "@prosopo/types";
import type { Database } from "@prosopo/types-database";
import { at } from "@prosopo/util";
import {
  checkPowSignature,
  checkPowSolution,
  checkRecentPowSolution,
} from "./powTasksUtils.js";

export class PowCaptchaManager {
  pair: KeyringPair;
  db: Database;
  POW_SEPARATOR: string;

  constructor(pair: KeyringPair, db: Database) {
    this.pair = pair;
    this.db = db;
    this.POW_SEPARATOR = POW_SEPARATOR;
  }

  /**
   * @description Generates a PoW Captcha for a given user and dapp
   *
   * @param {string} userAccount - user that is solving the captcha
   * @param {string} dappAccount - dapp that is requesting the captcha
   * @param origin - not currently used
   */
  async getPowCaptchaChallenge(
    userAccount: string,
    dappAccount: string,
    origin: string,
  ): Promise<PoWCaptcha> {
    const difficulty = 4;
    const timestamp = Date.now();

    // Use blockhash, userAccount and dappAccount for string for challenge
    const challenge: PoWChallengeId = `${timestamp}___${userAccount}___${dappAccount}`;
    const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));
    const timestampSignature = u8aToHex(
      this.pair.sign(stringToHex(timestamp.toString())),
    );
    return {
      challenge,
      difficulty,
      signature: challengeSignature,
      timestamp,
      timestampSignature,
    };
  }

  /**
   * @description Verifies a PoW Captcha for a given user and dapp
   *
   * @param {string} challenge - the starting string for the PoW challenge
   * @param {string} difficulty - how many leading zeroes the solution must have
   * @param {string} signature - proof that the Provider provided the challenge
   * @param {string} nonce - the string that the user has found that satisfies the PoW challenge
   * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
   * @param timestampSignature
   */
  async verifyPowCaptchaSolution(
    challenge: PoWChallengeId,
    difficulty: number,
    signature: string,
    nonce: number,
    timeout: number,
    timestampSignature: string,
  ): Promise<boolean> {
    checkRecentPowSolution(challenge, timeout);
    const challengeSplit = challenge.split(this.POW_SEPARATOR);
    const timestamp = parseInt(at(challengeSplit, 0));
    const userAccount = at(challengeSplit, 1);
    const dappAccount = at(challengeSplit, 2);

    checkPowSignature(
      timestamp.toString(),
      timestampSignature,
      userAccount,
      ApiParams.timestamp,
    );
    checkPowSignature(
      challenge,
      signature,
      this.pair.address,
      ApiParams.challenge,
    );
    checkPowSolution(nonce, challenge, difficulty);

    await this.db.storePowCaptchaRecord(
      challenge,
      { timestamp, userAccount, dappAccount },
      false,
    );
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

    checkRecentPowSolution(challenge, timeout);

    await this.db.updatePowCaptchaRecord(challengeRecord.challenge, true);
    return true;
  }
}
