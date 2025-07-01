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


import type { Logger } from "@prosopo/common";
import {
	CaptchaType,
	type KeyringPair,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import { ApiParams, type GetFrictionlessCaptchaResponse } from "@prosopo/types";
import type {
	FrictionlessTokenId,
	IProviderDatabase,
	Session,
} from "@prosopo/types-database";
import type { AccessPolicy } from "@prosopo/user-access-policy";
import type { ObjectId } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { checkLangRules } from "../../rules/lang.js";
import { CaptchaManager } from "../captchaManager.js";
import { getBotScore } from "../detection/getBotScore.js";

const DEFAULT_MAX_TIMESTAMP_AGE = 60 * 10 * 1000; // 10 minutes

export class FrictionlessManager extends CaptchaManager {
	config: ProsopoConfigOutput;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
	) {
		super(db, pair, logger);
		this.config = config;
	}

	checkLangRules(acceptLanguage: string): number {
		return checkLangRules(this.config, acceptLanguage);
	}

	async createSession(
		tokenId: ObjectId,
		captchaType: CaptchaType,
	): Promise<Session> {
		const sessionRecord: Session = {
			sessionId: uuidv4(),
			createdAt: new Date(),
			tokenId: tokenId,
			captchaType,
		};

		await this.db.storeSessionRecord(sessionRecord);
		return sessionRecord;
	}

	async sendImageCaptcha(
		tokenId: ObjectId,
	): Promise<GetFrictionlessCaptchaResponse> {
		const sessionRecord = await this.createSession(tokenId, CaptchaType.image);
		return {
			[ApiParams.captchaType]: CaptchaType.image,
			[ApiParams.sessionId]: sessionRecord.sessionId,
			[ApiParams.status]: "ok",
		};
	}

	async sendPowCaptcha(
		tokenId: ObjectId,
	): Promise<GetFrictionlessCaptchaResponse> {
		const sessionRecord = await this.createSession(tokenId, CaptchaType.pow);
		return {
			[ApiParams.captchaType]: CaptchaType.pow,
			[ApiParams.sessionId]: sessionRecord.sessionId,
			[ApiParams.status]: "ok",
		};
	}

	async scoreIncreaseAccessPolicy(
		accessPolicy: AccessPolicy | undefined,
		baseBotScore: number,
		botScore: number,
		tokenId: FrictionlessTokenId,
	) {
		const accessPolicyPenalty =
			accessPolicy?.frictionlessScore ||
			this.config.penalties.PENALTY_ACCESS_RULE;
		botScore += accessPolicyPenalty;
		this.logger.info({
			message: "Address has an image captcha config defined",
		});
		await this.db.updateFrictionlessTokenRecord(tokenId, {
			score: botScore,
			scoreComponents: {
				baseScore: baseBotScore,
				accessPolicy: accessPolicyPenalty,
			},
		});
		return botScore;
	}

	async scoreIncreaseTimestamp(
		timestamp: number,
		baseBotScore: number,
		botScore: number,
		tokenId: FrictionlessTokenId,
	) {
		this.logger.info("Timestamp is older than 10 minutes", new Date(timestamp));
		botScore += this.config.penalties.PENALTY_OLD_TIMESTAMP;
		await this.db.updateFrictionlessTokenRecord(tokenId, {
			score: botScore,
			scoreComponents: {
				baseScore: baseBotScore,
				timeout: this.config.penalties.PENALTY_OLD_TIMESTAMP,
			},
		});
		return botScore;
	}

	static timestampTooOld(timestamp: number): boolean {
		const now = Date.now();
		const diff = now - timestamp;
		return diff > DEFAULT_MAX_TIMESTAMP_AGE;
	}

	async decryptPayload(token: string) {
		const decryptKeys = [
			process.env.BOT_DECRYPTION_KEY,
			...(await this.getDetectorKeys()),
		].filter((k) => k);
		this.logger.debug({
			action: "Decrypting score",
			keysLength: decryptKeys.length,
			keys: decryptKeys.map((k) =>
				k ? `${k.slice(0, 5)}...${k.slice(-5)}` || "" : "",
			),
		});

		// run through the keys and try to decrypt the score
		// if we run out of keys and the score is still not decrypted, throw an error
		let baseBotScore: number | undefined;
		let timestamp: number | undefined;
		for (const [keyIndex, key] of decryptKeys.entries()) {
			try {
				const { baseBotScore: s, timestamp: t } = await getBotScore(token, key);
				this.logger.info({
					message: "Successfully decrypted score",
					key: key ? `${key.slice(0, 5)}...${key.slice(-5)}` : "",
					baseBotScore: s,
					timestamp: t,
				});
				baseBotScore = s;
				timestamp = t;
				break;
			} catch (err) {
				// check if the next index exists, if not, log an error
				if (keyIndex === decryptKeys.length - 1) {
					this.logger.warn({
						message: "Error decrypting score: no more keys to try",
					});
					baseBotScore = 1;
					timestamp = 0;
				}
			}
		}

		if (baseBotScore === undefined || timestamp === undefined) {
			this.logger.error({
				message:
					"Error decrypting score: baseBotScore or timestamp is undefined",
			});
			baseBotScore = 1;
			timestamp = 0;
		}

		return { baseBotScore, timestamp };
	}
}
