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
import { stringToHex, u8aToHex } from "@polkadot/util";
import { ProsopoEnvError, getLoggerDefault } from "@prosopo/common";
import {
	ApiParams,
	type CaptchaResult,
	CaptchaStatus,
	type GetFrictionlessCaptchaResponse,
	POW_SEPARATOR,
	type PoWCaptcha,
	type PoWChallengeId,
	type ProsopoConfigOutput,
	type RequestHeaders,
} from "@prosopo/types";
import type { IProviderDatabase, Session } from "@prosopo/types-database";
import { at, verifyRecency } from "@prosopo/util";
import type { Address4, Address6 } from "ip-address";
import { v4 as uuidv4 } from "uuid";

const logger = getLoggerDefault();
const DEFAULT_POW_DIFFICULTY = 4;

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

	async checkIpRules(
		ipAddress: Address4 | Address6,
		dapp: string,
	): Promise<boolean> {
		const rule = await this.db.getIPBlockRuleRecord(ipAddress.bigInt());

		if (rule && BigInt(rule.ip) === ipAddress.bigInt()) {
			// block by IP address globally
			if (rule.global) {
				return true;
			}

			const dappRule = await this.db.getIPBlockRuleRecord(
				ipAddress.bigInt(),
				dapp,
			);
			if (
				dappRule &&
				dappRule.dappAccount === dapp &&
				BigInt(dappRule.ip) === ipAddress.bigInt()
			) {
				return true;
			}
		}
		return false;
	}

	async checkUserRules(user: string, dapp: string): Promise<boolean> {
		const userRule = await this.db.getUserBlockRuleRecord(user, dapp);

		if (
			userRule &&
			userRule.userAccount === user &&
			userRule.dappAccount === dapp
		) {
			return true;
		}
		return false;
	}

	checkLangRules(acceptLanguage: string): number {
		const lConfig = this.config.lRules;
		let lScore = 0;
		if (lConfig) {
			const languages = acceptLanguage
				.split(",")
				.map((lang) => lang.trim().split(";")[0]);

			for (const lang of languages) {
				if (lang && lConfig[lang]) {
					lScore += lConfig[lang];
				}
			}
		}
		return lScore;
	}

	sendImageCaptcha(): GetFrictionlessCaptchaResponse {
		return {
			[ApiParams.captchaType]: "image",
			[ApiParams.status]: "ok",
		};
	}

	async sendPowCaptcha(): Promise<GetFrictionlessCaptchaResponse> {
		const sessionRecord: Session = {
			sessionId: uuidv4(),
			createdAt: new Date(),
		};

		await this.db.storeSessionRecord(sessionRecord);

		return {
			[ApiParams.captchaType]: "pow",
			[ApiParams.sessionId]: sessionRecord.sessionId,
			[ApiParams.status]: "ok",
		};
	}
}
