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

import { stringToHex, u8aToHex } from "@polkadot/util";
import { ProsopoApiError, ProsopoEnvError } from "@prosopo/common";
import type { Logger } from "@prosopo/common";
import type { KeyringPair, ProsopoConfigOutput } from "@prosopo/types";
import {
	DecisionMachineDecision,
	type DecisionMachineInput,
} from "@prosopo/types";
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
	BehavioralDataPacked,
	IProviderDatabase,
	PoWCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type AccessPolicy,
	AccessPolicyType,
	type AccessRulesStorage,
} from "@prosopo/user-access-policy";
import { at, extractData, verifyRecency } from "@prosopo/util";
import { getRequestUserScope } from "../../api/blacklistRequestInspector.js";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";
import { deepValidateIpAddress } from "../../util.js";
import { CaptchaManager } from "../captchaManager.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import type { BehavioralDataResult } from "../detection/decodeBehavior.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { checkPowSignature, validateSolution } from "./powTasksUtils.js";

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

const DEFAULT_POW_DIFFICULTY = 4;

export class PowCaptchaManager extends CaptchaManager {
	POW_SEPARATOR: string;
	private decisionMachineRunner: DecisionMachineRunner;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
	) {
		super(db, pair, config, logger);
		this.POW_SEPARATOR = POW_SEPARATOR;
		this.decisionMachineRunner = new DecisionMachineRunner(db);
	}

	/**
	 * Checks if a user should be hard blocked based on access policies
	 * Only checks for Block policies without captchaType
	 *
	 * @returns The blocking policy if user should be blocked, undefined otherwise
	 */
	private async checkForHardBlock(
		userAccessRulesStorage: AccessRulesStorage,
		challengeRecord: PoWCaptchaRecord,
		userAccount: string,
		headers: RequestHeaders,
		coords?: [number, number][][],
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
		);

		const accessPolicies = await this.getPrioritisedAccessPolicies(
			userAccessRulesStorage,
			challengeRecord.dappAccount,
			userScope,
		);

		return findHardBlockPolicy(accessPolicies);
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
	 * @param salt
	 */
	async verifyPowCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		nonce: number,
		timeout: number,
		userTimestampSignature: string,
		ipAddress: IPAddress,
		headers: RequestHeaders,
		behavioralData?: string,
		salt?: string,
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

		// Extract coordinates from salt if provided
		let coords: [number, number][][] | undefined;
		if (salt) {
			try {
				const extractedData = extractData(salt);
				// Convert extracted data to coordinate pairs
				if (extractedData.length >= 2) {
					coords = [[[extractedData[0], extractedData[1]] as [number, number]]];
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to extract coordinates from salt",
					error,
					salt,
				}));
			}
		}

		if (!verifyRecency(challenge, timeout)) {
			await this.db.updatePowCaptchaRecordResult(
				challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.INVALID_TIMESTAMP",
				},
				false, //serverchecked
				true, // usersubmitted
				userTimestampSignature,
				coords,
			);
			return false;
		}

		const correct = validateSolution(nonce, challenge, difficulty);

		let finalVerified = correct;
		let result: CaptchaResult = { status: CaptchaStatus.approved };
		if (!correct) {
			result = {
				status: CaptchaStatus.disapproved,
				reason: "CAPTCHA.INVALID_SOLUTION",
			};
		}

		// Process behavioral data if provided
		if (behavioralData) {
			try {
				// Get decryption keys: detector keys from DB first, then env var as fallback
				const decryptKeys = [
					// Process DB keys first, then env var key last as env key will likely be invalid
					...(await this.getDetectorKeys()),
					process.env.BOT_DECRYPTION_KEY,
				];

				// Decrypt the behavioral data (returns unpacked format)
				const decryptedData = await this.decryptBehavioralData(
					behavioralData,
					decryptKeys,
				);

				if (decryptedData) {
					const dappAccount = at(challengeSplit, 2);
					// Log behavioral analytics using unpacked data counts
					this.logger?.info(() => ({
						msg: "Behavioral analysis completed",
						data: {
							userAccount,
							dappAccount,
							challenge,
							mouseEventsCount: decryptedData.collector1?.length || 0,
							touchEventsCount: decryptedData.collector2?.length || 0,
							clickEventsCount: decryptedData.collector3?.length || 0,
							deviceCapability: decryptedData.deviceCapability,
							captchaResult: correct ? "passed" : "failed",
						},
					}));

					// Convert to packed format for storage
					const packedData: BehavioralDataPacked = {
						c1: decryptedData.collector1 || [],
						c2: decryptedData.collector2 || [],
						c3: decryptedData.collector3 || [],
						d: decryptedData.deviceCapability,
					};

					// Store the packed data to database
					await this.db.updatePowCaptchaRecord(challenge, {
						behavioralDataPacked: packedData,
						deviceCapability: decryptedData.deviceCapability,
					});

					if (correct) {
						const decisionInput: DecisionMachineInput = {
							userAccount,
							dappAccount,
							challenge,
							captchaResult: "passed",
							behavioralDataPacked: packedData,
							deviceCapability: decryptedData.deviceCapability,
						};
						const decision = await this.decisionMachineRunner.decide(
							decisionInput,
							this.logger,
						);
						if (decision.decision === DecisionMachineDecision.Deny) {
							finalVerified = false;
							result = {
								status: CaptchaStatus.disapproved,
								reason: "CAPTCHA.INVALID_SOLUTION",
							};
						}
					}
				}
			} catch (error) {
				this.logger?.error(() => ({
					msg: "Failed to process behavioral data",
					err: error,
				}));
				// Don't fail the captcha if behavioral analysis fails
			}
		}

		await this.db.updatePowCaptchaRecordResult(
			challenge,
			result,
			false,
			true,
			userTimestampSignature,
			coords,
		);

		return finalVerified;
	}

	/**
	 * @description Verifies a PoW Captcha for a given user and dapp. This is called by the server to verify the user's solution
	 * and update the record in the database to show that the user has solved the captcha
	 *
	 * @param {string} dappAccount - the dapp that is requesting the captcha
	 * @param {string} challenge - the starting string for the PoW challenge
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
	 * @param env - provider environment
	 * @param ip - optional IP address for validation
	 * @param userAccessRulesStorage - storage for querying user access policies
	 */
	async serverVerifyPowCaptchaSolution(
		dappAccount: string,
		challenge: string,
		timeout: number,
		env: ProviderEnvironment,
		ip?: string,
		userAccessRulesStorage?: AccessRulesStorage,
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

		// -- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING --
		// Do not move this code down or put any other code before it. We want to drop out as early as possible if the
		// solution has already been checked by the server. Moving this code around could result in solutions being
		// re-usable.
		await this.db.markDappUserPoWCommitmentsChecked([
			challengeRecord.challenge,
		]);
		// -- END WARNING --

		const recent = verifyRecency(challenge, timeout);
		if (!recent) {
			await this.db.updatePowCaptchaRecord(challengeRecord.challenge, {
				result: {
					status: CaptchaStatus.disapproved,
					reason: "API.TIMESTAMP_TOO_OLD",
				},
			});
			return notVerifiedResponse;
		}

		// Check user access policies for hard blocks
		if (userAccessRulesStorage) {
			try {
				const blockPolicy = await this.checkForHardBlock(
					userAccessRulesStorage,
					challengeRecord,
					challengeRecord.userAccount,
					challengeRecord.headers,
					challengeRecord.coords,
				);

				if (blockPolicy) {
					this.logger.info(() => ({
						msg: "User blocked by access policy in server PoW verification",
						data: {
							challenge,
							userAccount: challengeRecord.userAccount,
							dappAccount,
							policy: blockPolicy,
						},
					}));
					await this.db.updatePowCaptchaRecord(challengeRecord.challenge, {
						result: {
							status: CaptchaStatus.disapproved,
							reason: "API.ACCESS_POLICY_BLOCK",
						},
					});
					return notVerifiedResponse;
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to check user access policies in server PoW verification",
					error,
				}));
			}
		}

		if (ip) {
			const challengeIpAddress = getIpAddressFromComposite(
				challengeRecord.ipAddress,
			);

			// Get client settings for IP validation rules
			const clientRecord = await this.db.getClientRecord(dappAccount);
			const ipValidationRules = clientRecord?.settings?.ipValidationRules;

			await this.db.updatePowCaptchaRecord(challengeRecord.challenge, {
				providedIp: getCompositeIpAddress(ip),
			});

			const ipValidation = await deepValidateIpAddress(
				ip,
				challengeIpAddress,
				this.logger,
				env.config.ipApi.apiKey,
				env.config.ipApi.baseUrl,
				ipValidationRules,
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
				await this.db.updatePowCaptchaRecord(challengeRecord.challenge, {
					result: {
						status: CaptchaStatus.disapproved,
						reason: "API.FAILED_IP_VALIDATION",
					},
				});
				return notVerifiedResponse;
			}
		}

		let score: number | undefined;
		if (challengeRecord.sessionId) {
			const sessionRecord = await this.db.getSessionRecordBySessionId(
				challengeRecord.sessionId,
			);
			if (sessionRecord) {
				score = computeFrictionlessScore(sessionRecord?.scoreComponents);
				this.logger.info(() => ({
					data: {
						scoreComponents: { ...(sessionRecord?.scoreComponents || {}) },
						score,
					},
				}));
			}
		}

		return { verified: true, ...(score ? { score } : {}) };
	}

	/**
	 * Decrypts behavioral data
	 * @param encryptedData - The encrypted behavioral data
	 * @param decryptKeys - Array of possible decryption keys to try
	 * @returns Decrypted behavioral data in unpacked format, or null if decryption fails
	 */
	private async decryptBehavioralData(
		encryptedData: string,
		decryptKeys: (string | undefined)[],
	): Promise<BehavioralDataResult | null> {
		const decryptBehavioralData = (
			await import("../detection/decodeBehavior.js")
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
}
