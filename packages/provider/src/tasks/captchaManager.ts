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
import { type Logger, getLoggerDefault } from "@prosopo/common";
import { ApiParams, CaptchaType, Tier } from "@prosopo/types";
import type {
	ClientRecord,
	FrictionlessTokenId,
	IProviderDatabase,
	Session,
} from "@prosopo/types-database";

export class CaptchaManager {
	pair: KeyringPair;
	db: IProviderDatabase;
	logger: Logger;

	constructor(db: IProviderDatabase, pair: KeyringPair, logger?: Logger) {
		this.pair = pair;
		this.db = db;
		this.logger = logger || getLoggerDefault();
	}

	async getFrictionlessTokenIdFromSession(sessionRecord: Session) {
		const tokenRecord = await this.db.getFrictionlessTokenRecordByTokenId(
			sessionRecord.tokenId,
		);
		return tokenRecord ? (tokenRecord._id as FrictionlessTokenId) : undefined;
	}

	async isValidRequest(
		clientSettings: ClientRecord,
		captchaType: CaptchaType,
		sessionId?: string,
	): Promise<{
		valid: boolean;
		reason?: string;
		frictionlessTokenId?: FrictionlessTokenId;
		type: CaptchaType;
	}> {
		if (sessionId) {
			const sessionRecord = await this.db.checkAndRemoveSession(sessionId);
			if (
				!sessionRecord ||
				(sessionRecord &&
					sessionRecord.captchaType !== clientSettings?.settings?.captchaType)
			) {
				return {
					valid: false,
					reason: "Session ID not found",
					type: CaptchaType.frictionless,
				};
			}
			const frictionlessTokenId =
				await this.getFrictionlessTokenIdFromSession(sessionRecord);
			return {
				valid: true,
				frictionlessTokenId,
				type: CaptchaType.frictionless,
			};
		}
		if (
			!(
				clientSettings?.settings?.captchaType === captchaType ||
				clientSettings?.settings?.captchaType === CaptchaType.frictionless
			)
		) {
			return {
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: captchaType,
			};
		}
		return { valid: true, type: clientSettings?.settings?.captchaType };
	}

	getVerificationResponse(
		verified: boolean,
		clientRecord: ClientRecord,
		translateFn: (key: string) => string,
		score?: number,
	) {
		return {
			status: translateFn(
				verified ? "API.USER_VERIFIED" : "API.USER_NOT_VERIFIED",
			),
			[ApiParams.verified]: verified,
			...(CaptchaManager.canClientSeeScore(clientRecord.tier, score) && {
				[ApiParams.score]: score,
			}),
		};
	}

	static canClientSeeScore(tier: Tier, score?: number) {
		return score && tier && tier !== Tier.Free;
	}
}
