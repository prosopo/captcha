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

import { type Logger, getLogger } from "@prosopo/common";
import type { TranslationKey } from "@prosopo/locale";
import {
	ApiParams,
	CaptchaType,
	type KeyringPair,
	type ProsopoConfigOutput,
	type RequestHeaders,
	type Session,
	Tier, UserCommitment,
} from "@prosopo/types";
import type {
	ClientRecord,
	IProviderDatabase,
	IUserDataSlim,
	PoWCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type AccessPolicy,
	AccessPolicyType,
	type AccessRulesStorage,
	type UserScope,
	type UserScopeRecord,
} from "@prosopo/user-access-policy";
import {
	getPrioritisedAccessRule,
	getRequestUserScope,
} from "../api/blacklistRequestInspector.js";
import { getIpAddressFromComposite } from "../compositeIpAddress.js";

/**
 * Finds a hard block policy from access policies.
 * A hard block is a Block policy without a captchaType specified.
 * Policies with captchaType are for captcha type selection, not hard blocking.
 */
const findHardBlockPolicy = (
	accessPolicies: AccessPolicy[],
): AccessPolicy | undefined => {
	return accessPolicies.find(
		(policy) => policy.type === AccessPolicyType.Block && !policy.captchaType,
	);
};

export class CaptchaManager {
	pair: KeyringPair;
	db: IProviderDatabase;
	config: ProsopoConfigOutput;
	logger: Logger;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
	) {
		this.pair = pair;
		this.db = db;
		this.config = config;
		this.logger = logger || getLogger("info", import.meta.url);
	}

	async validateSessionIP(
		sessionRecord: Session,
		currentIP: string,
		env: ProviderEnvironment,
	): Promise<{ valid: boolean; reason?: TranslationKey }> {
		// Session record now contains IP address directly
		// No validation needed as the session already has all required info
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
		sessionId?: string;
		type: CaptchaType;
		powDifficulty?: number;
		solvedImagesCount?: number;
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
					const ipValidation = await this.validateSessionIP(
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
					sessionId: sessionRecord.sessionId,
					type: requestedCaptchaType,
					...(sessionRecord.powDifficulty && {
						powDifficulty: sessionRecord.powDifficulty,
					}),
					...(sessionRecord.solvedImagesCount && {
						solvedImagesCount: sessionRecord.solvedImagesCount,
					}),
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
		userScope: UserScope | UserScopeRecord,
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

	async decryptBehavioralData(
		encryptedData: string,
		decryptKeys: (string | undefined)[],
	): Promise<
		import("./detection/decodeBehavior.js").BehavioralDataResult | null
	> {
		const decryptBehavioralData = (
			await import("./detection/decodeBehavior.js")
		).default;

		const validKeys = decryptKeys.filter((k) => k);

		if (validKeys.length === 0) {
			this.logger?.error(() => ({
				msg: "No decryption keys provided for behavioral data",
			}));
			return null;
		}

		// Try each key until one succeeds
		for (const [keyIndex, key] of validKeys.entries()) {
			try {
				this.logger?.debug(() => ({
					msg: "Attempting to decrypt behavioral data",
					data: {
						keyIndex: keyIndex + 1,
						totalKeys: validKeys.length,
					},
				}));

				// Decrypt behavioral data - returns unpacked format: {collector1, collector2, collector3, deviceCapability, timestamp}
				const result = await decryptBehavioralData(encryptedData, key);

				this.logger?.info(() => ({
					msg: "Behavioral data decrypted successfully",
					data: {
						keyIndex: keyIndex + 1,
						c1Length: result.collector1?.length || 0,
						c2Length: result.collector2?.length || 0,
						c3Length: result.collector3?.length || 0,
						deviceCapability: result.deviceCapability,
					},
				}));

				return result;
			} catch (error) {
				this.logger?.debug(() => ({
					msg: "Failed to decrypt with key, trying next",
					data: {
						keyIndex: keyIndex + 1,
						totalKeys: validKeys.length,
						err: error,
					},
				}));
				// Continue to next key
			}
		}

		// All keys failed
		this.logger?.error(() => ({
			msg: "Failed to decrypt behavioral data with all available keys",
			data: {
				totalKeysAttempted: validKeys.length,
			},
		}));

		return null;
	}

	/**
	 * Checks if a user should be hard blocked based on access policies
	 * Only checks for Block policies without captchaType
	 *
	 * @returns The blocking policy if user should be blocked, undefined otherwise
	 */
	async checkForHardBlock(
		userAccessRulesStorage: AccessRulesStorage,
		challengeRecord: PoWCaptchaRecord | UserCommitment,
		userAccount: string,
		headers: RequestHeaders,
		coords?: [number, number][][],
		countryCode?: string,
	): Promise<AccessPolicy | undefined> {
		// Get headHash from session record if available
		let headHash: string | undefined;
		if (challengeRecord.sessionId) {
			const sessionRecord = await this.db.getSessionRecordBySessionId(
				challengeRecord.sessionId,
			);
			headHash = sessionRecord?.decryptedHeadHash;
		}

		// Serialize coords to string for querying
		const coordsString = coords ? JSON.stringify(coords) : undefined;

		const ipAddressRecord = getIpAddressFromComposite(
			challengeRecord.ipAddress,
		);

		const userScope = getRequestUserScope(
			headers,
			challengeRecord.ja4,
			ipAddressRecord.address,
			userAccount,
			headHash,
			coordsString,
			countryCode,
		);

		const accessPolicies = await this.getPrioritisedAccessPolicies(
			userAccessRulesStorage,
			challengeRecord.dappAccount,
			userScope,
		);

		return findHardBlockPolicy(accessPolicies);
	}

	static canClientSeeScore(tier: Tier, score?: number) {
		return score && tier && tier !== Tier.Free;
	}
}
