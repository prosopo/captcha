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
import { CaptchaType } from "@prosopo/types";
import {
	ApiParams,
	type GetFrictionlessCaptchaResponse,
	type IPAddress,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase, Session } from "@prosopo/types-database";
import type { ObjectId } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { checkIpRules } from "../../rules/ip.js";
import { checkLangRules } from "../../rules/lang.js";
import { checkUserRules } from "../../rules/user.js";

export class FrictionlessManager {
	config: ProsopoConfigOutput;
	pair: KeyringPair;
	db: IProviderDatabase;

	constructor(
		config: ProsopoConfigOutput,
		pair: KeyringPair,
		db: IProviderDatabase,
	) {
		this.config = config;
		this.pair = pair;
		this.db = db;
	}

	async checkIpRules(ipAddress: IPAddress, dapp: string): Promise<boolean> {
		const rule = await checkIpRules(this.db, ipAddress, dapp);
		return !!rule;
	}

	async checkUserRules(user: string, dapp: string): Promise<boolean> {
		const rule = await checkUserRules(this.db, user, dapp);
		return !!rule;
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
}
