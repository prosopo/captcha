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
import type { TranslationKey } from "@prosopo/locale";
import { ApiParams, CaptchaType, Tier } from "@prosopo/types";
import type {
	ClientRecord,
	FrictionlessTokenId,
	IProviderDatabase,
	IUserDataSlim,
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
		clientSettings: ClientRecord | IUserDataSlim,
		captchaType: CaptchaType,
		sessionId?: string,
	): Promise<{
		valid: boolean;
		reason?: TranslationKey;
		frictionlessTokenId?: FrictionlessTokenId;
		type: CaptchaType;
	}> {
		this.logger.debug({
			message: "Validating request",
			captchaType,
			sessionId,
		});

		// Session ID

		// If the client has a sessionId then they are requesting a frictionless captcha. Pass over if the client
		// settings do not specify frictionless.
		if (sessionId) {
			if (clientSettings?.settings?.captchaType === CaptchaType.frictionless) {
				const sessionRecord = await this.db.checkAndRemoveSession(sessionId);
				if (!sessionRecord) {
					this.logger.warn({
						message: "No frictionless session found",
						account: clientSettings.account,
						sessionId: sessionId,
					});
					return {
						valid: false,
						reason: "CAPTCHA.NO_SESSION_FOUND", // TODO re-instate the crazy typescript nested generics stuff
						type: captchaType,
					};
				}
				const frictionlessTokenId =
					await this.getFrictionlessTokenIdFromSession(sessionRecord);
				return {
					valid: true,
					frictionlessTokenId,
					type: captchaType,
				};
			}

			// If the user somehow has a sessionId but the client settings do not specify frictionless then the request is
			// invalid. This could occur if the client settings were changed after the user received a sessionId.
			this.logger.warn({
				message: "Invalid frictionless request",
				account: clientSettings.account,
				sessionId: sessionId,
				settingsCaptchaType: clientSettings?.settings?.captchaType,
			});
			return {
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: captchaType,
			};
		}

		// No Session ID

		// To pass here a user must be requesting the captchaType that is stored on the client's settings. e.g. if
		// `captchaType` is `image` and there is no `sessionId` then the client must have `captchaType` set to `image`
		// in their settings. If the user is at the start of the frictionless flow then they will have no sessionId.
		// The client settings must specify frictionless for the request to be valid.
		if (clientSettings?.settings?.captchaType !== captchaType) {
			this.logger.warn({
				message: `Invalid ${captchaType} request`,
				account: clientSettings.account,
				requestedCaptchaType: captchaType,
				settingsCaptchaType: clientSettings?.settings?.captchaType,
			});
			return {
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: captchaType,
			};
		}
		return { valid: true, type: captchaType };
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
