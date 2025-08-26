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

import { type Logger, ProsopoEnvError, getLogger } from "@prosopo/common";
import type { TranslationKey } from "@prosopo/locale";
import type { KeyringPair } from "@prosopo/types";
import { ApiParams, CaptchaType, Tier } from "@prosopo/types";
import type {
	ClientRecord,
	FrictionlessTokenId,
	IProviderDatabase,
	IUserDataSlim,
	Session,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type {
	AccessPolicy,
	AccessRulesStorage,
	UserScopeApiInput,
	UserScopeApiOutput,
} from "@prosopo/user-access-policy";
import { getIPAddress } from "@prosopo/util";
import { getPrioritisedAccessRule } from "../api/blacklistRequestInspector.js";
import { getIpAddressFromComposite } from "../compositeIpAddress.js";
import { deepValidateIpAddress } from "../util.js";

export class CaptchaManager {
	pair: KeyringPair;
	db: IProviderDatabase;
	logger: Logger;

	constructor(db: IProviderDatabase, pair: KeyringPair, logger?: Logger) {
		this.pair = pair;
		this.db = db;
		this.logger = logger || getLogger("info", import.meta.url);
	}

	async getFrictionlessTokenIdFromSession(sessionRecord: Session) {
		const tokenRecord = await this.db.getFrictionlessTokenRecordByTokenId(
			sessionRecord.tokenId,
		);
		return tokenRecord ? (tokenRecord._id as FrictionlessTokenId) : undefined;
	}

	async validateFrictionlessTokenIP(
		sessionRecord: Session,
		currentIP: string,
		env: ProviderEnvironment,
	): Promise<{ valid: boolean; reason?: TranslationKey }> {
		const tokenRecord = await this.db.getFrictionlessTokenRecordByTokenId(
			sessionRecord.tokenId,
		);

		if (!tokenRecord) {
			this.logger.info(() => ({
				msg: "No frictionless token found for session",
				data: { sessionId: sessionRecord.sessionId },
			}));
			return { valid: false, reason: "CAPTCHA.NO_SESSION_FOUND" };
		}

		if (!env.config.ipApi.apiKey || !env.config.ipApi.baseUrl) {
			this.logger.warn(() => ({
				msg: "No IP API key found",
				data: { sessionId: sessionRecord.sessionId },
			}));
			throw new ProsopoEnvError("API.UNKNOWN", {
				context: { error: "No IP API key found" },
			});
		}

		if (tokenRecord.ipAddress !== undefined) {
			const recordIpAddress = getIpAddressFromComposite(tokenRecord.ipAddress);
			const ipValidation = await deepValidateIpAddress(
				currentIP,
				recordIpAddress,
				this.logger,
				env.config.ipApi.apiKey,
				env.config.ipApi.baseUrl,
			);
			const isValidIp = ipValidation.isValid;

			if (!isValidIp) {
				this.logger.info(() => ({
					msg: "IP address mismatch for frictionless token",
					data: {
						sessionId: sessionRecord.sessionId,
						tokenId: tokenRecord._id,
						originalIP: recordIpAddress.bigInt().toString() || "unknown",
						currentIP: currentIP,
					},
				}));
				return { valid: false, reason: "CAPTCHA.IP_ADDRESS_MISMATCH" };
			}
		}

		return { valid: true };
	}

	async isValidRequest(
		clientSettings: ClientRecord | IUserDataSlim,
		requestedCaptchaType: CaptchaType,
		env: ProviderEnvironment,
		sessionId?: string,
		userAccessPolicy?: AccessPolicy,
		currentIP?: string,
	): Promise<{
		valid: boolean;
		reason?: TranslationKey;
		frictionlessTokenId?: FrictionlessTokenId;
		type: CaptchaType;
	}> {
		this.logger.debug(() => ({
			msg: "Validating request",
			data: {
				captchaType: requestedCaptchaType,
				sessionId,
			},
		}));

		// User Access Policies override default behaviour
		if (
			userAccessPolicy &&
			userAccessPolicy.captchaType !== requestedCaptchaType
		) {
			this.logger.warn(() => ({
				msg: "Invalid captcha type for user access policy",
				data: {
					account: clientSettings.account,
					captchaType: userAccessPolicy.captchaType,
				},
			}));
			return {
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: requestedCaptchaType,
			};
		}

		// Session ID

		// If the client has a sessionId then they are requesting a frictionless captcha.
		if (sessionId) {
			if (clientSettings?.settings?.captchaType === CaptchaType.frictionless) {
				const sessionRecord = await this.db.checkAndRemoveSession(sessionId);
				if (!sessionRecord) {
					this.logger.warn(() => ({
						msg: "No frictionless session found",
						data: {
							account: clientSettings.account,
							sessionId: sessionId,
						},
					}));
					return {
						valid: false,
						reason: "CAPTCHA.NO_SESSION_FOUND",
						type: requestedCaptchaType,
					};
				}

				// Validate IP address if currentIP is provided
				if (currentIP) {
					const ipValidation = await this.validateFrictionlessTokenIP(
						sessionRecord,
						currentIP,
						env,
					);
					if (!ipValidation.valid) {
						return {
							valid: false,
							reason: ipValidation.reason,
							type: requestedCaptchaType,
						};
					}
				}

				const frictionlessTokenId =
					await this.getFrictionlessTokenIdFromSession(sessionRecord);

				// Check the captcha type of the session is the same as the requested captcha type
				if (sessionRecord.captchaType !== requestedCaptchaType) {
					this.logger.warn(() => ({
						msg: "Invalid frictionless request",
						data: {
							account: clientSettings.account,
							sessionId: sessionId,
						},
					}));
					return {
						valid: false,
						reason: "CAPTCHA.NO_SESSION_FOUND",
						type: requestedCaptchaType,
					};
				}
				return {
					valid: true,
					frictionlessTokenId,
					type: requestedCaptchaType,
				};
			}

			// If the user somehow has a sessionId but the client settings do not specify frictionless then the request is
			// invalid. This could occur if the client settings were changed after the user received a sessionId.
			this.logger.warn(() => ({
				msg: "Invalid frictionless request",
				data: {
					account: clientSettings.account,
					sessionId: sessionId,
					settingsCaptchaType: clientSettings?.settings?.captchaType,
				},
			}));
			return {
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: requestedCaptchaType,
			};
		}

		// No Session ID

		// To pass here a user must be requesting the captchaType that is stored on the client's settings.
		// - If `captchaType` is `image` and there is no `sessionId` then `clientSettings?.settings?.captchaType,` must be set to `image`
		// - If `captchaType` is `pow` and there is no `sessionId` then `clientSettings?.settings?.captchaType,` must be set to `pow`
		// - If `captchaType` is `frictionless` and there is no `sessionId` then `clientSettings?.settings?.captchaType,` must be set to `frictionless`
		if (clientSettings?.settings?.captchaType !== requestedCaptchaType) {
			this.logger.warn(() => ({
				msg: `Invalid ${requestedCaptchaType} request`,
				data: {
					account: clientSettings.account,
					requestedCaptchaType: requestedCaptchaType,
					settingsCaptchaType: clientSettings?.settings?.captchaType,
				},
			}));
			return {
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: requestedCaptchaType,
			};
		}

		return { valid: true, type: requestedCaptchaType };
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

	async getPrioritisedAccessPolicies(
		userAccessRulesStorage: AccessRulesStorage,
		clientId: string,
		userScope: {
			[key in keyof UserScopeApiInput & UserScopeApiOutput]?: bigint | string;
		},
	) {
		return getPrioritisedAccessRule(
			userAccessRulesStorage,
			userScope,
			clientId,
		);
	}

	async getDetectorKeys(): Promise<string[]> {
		return await this.db.getDetectorKeys();
	}

	static canClientSeeScore(tier: Tier, score?: number) {
		return score && tier && tier !== Tier.Free;
	}
}
