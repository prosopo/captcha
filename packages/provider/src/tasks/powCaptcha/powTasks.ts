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
	CaptchaType,
	DecisionMachineDecision,
	type DecisionMachineInput,
} from "@prosopo/types";
import {
	ApiParams,
	type BehavioralDataPacked,
	type CaptchaResult,
	CaptchaStatus,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	POW_SEPARATOR,
	type PoWCaptcha,
	type PoWChallengeId,
	type RequestHeaders,
} from "@prosopo/types";
import type {
	IProviderDatabase,
	PoWCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { at, extractData, verifyRecency } from "@prosopo/util";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";
import { deepValidateIpAddress } from "../../util.js";
import type { RedisWriteQueue } from "../../util/redisCache.js";
import { CaptchaManager } from "../captchaManager.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { checkTrafficFilter } from "../spam/checkTrafficFilter.js";
import { evaluateEmailSpamRules } from "../spam/evaluateEmailSpamRules.js";
import { checkPowSignature, validateSolution } from "./powTasksUtils.js";

const DEFAULT_POW_DIFFICULTY = 4;

export class PowCaptchaManager extends CaptchaManager {
	POW_SEPARATOR: string;
	private decisionMachineRunner: DecisionMachineRunner;

	constructor(
		db: IProviderDatabase,
		pair: KeyringPair,
		config: ProsopoConfigOutput,
		logger?: Logger,
		writeQueue?: RedisWriteQueue | null,
	) {
		super(db, pair, config, logger, writeQueue);
		this.POW_SEPARATOR = POW_SEPARATOR;
		this.decisionMachineRunner = new DecisionMachineRunner(db);
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
	 * @param {string} providerChallengeSignature - proof that the Provider provided the challenge
	 * @param {string} nonce - the string that the user has found that satisfies the PoW challenge
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the PoW captcha
	 * @param {string} userTimestampSignature
	 * @param ipAddress
	 * @param headers
	 * @param behavioralData
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
			const timeoutResult = {
				status: CaptchaStatus.disapproved,
				reason: "CAPTCHA.INVALID_TIMESTAMP" as const,
			};
			// Write pow record and session update in parallel
			const writePromises: Promise<void>[] = [
				this.db.updatePowCaptchaRecordResult(
					challenge,
					timeoutResult,
					false, //serverchecked
					true, // usersubmitted
					userTimestampSignature,
					coords,
				),
			];
			if (challengeRecord.sessionId) {
				writePromises.push(
					this.db.updateSessionRecord(challengeRecord.sessionId, {
						userSubmitted: true,
						result: timeoutResult,
					}),
				);
			}
			await Promise.all(writePromises);
			return false;
		}

		const correct = validateSolution(nonce, challenge, difficulty);

		let result: CaptchaResult = { status: CaptchaStatus.approved };
		if (!correct) {
			result = {
				status: CaptchaStatus.disapproved,
				reason: "CAPTCHA.INVALID_SOLUTION",
			};
		}

		// Accumulate behavioral data for a combined write with the result update.
		// Previously this was a separate DB write; now we merge it into a single
		// updatePowCaptchaRecord call below.
		let behavioralUpdates: Partial<PoWCaptchaRecord> = {};
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

					// Convert to packed format — will be written with the result update
					const packedData: BehavioralDataPacked = {
						c1: decryptedData.collector1 || [],
						c2: decryptedData.collector2 || [],
						c3: decryptedData.collector3 || [],
						d: decryptedData.deviceCapability,
					};

					behavioralUpdates = {
						behavioralDataPacked: packedData,
						deviceCapability: decryptedData.deviceCapability,
					};
				}
			} catch (error) {
				this.logger?.error(() => ({
					msg: "Failed to process behavioral data",
					err: error,
				}));
				// Don't fail the captcha if behavioral analysis fails
			}
		}

		// Write behavioral data first (sequential) so it's present when
		// updatePowCaptchaRecordResult triggers centralStreamer.streamPowUpdate(),
		// which reads back the full record.
		if (Object.keys(behavioralUpdates).length > 0) {
			await this.db.updatePowCaptchaRecord(challenge, behavioralUpdates);
		}

		// Then write result + session in parallel (different documents/collections).
		const writePromises: Promise<void>[] = [
			this.db.updatePowCaptchaRecordResult(
				challenge,
				result,
				false,
				true,
				userTimestampSignature,
				coords,
			),
		];

		if (challengeRecord.sessionId) {
			writePromises.push(
				this.db.updateSessionRecord(challengeRecord.sessionId, {
					userSubmitted: true,
					result,
				}),
			);
		}

		await Promise.all(writePromises);

		return correct;
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
	 * @param email
	 * @param spamEmailDomainCheckingEnabled
	 * @param spamFilter
	 * @param trafficFilter
	 */
	async serverVerifyPowCaptchaSolution(
		dappAccount: string,
		challenge: string,
		timeout: number,
		env: ProviderEnvironment,
		ip?: string,
		userAccessRulesStorage?: AccessRulesStorage,
		email?: string,
		spamEmailDomainCheckingEnabled = false,
		spamFilter?: ISpamFilterRules,
		trafficFilter?: ITrafficFilter,
	): Promise<{ verified: boolean; score?: number; reason?: string }> {
		const notVerified = (
			reason: string,
		): { verified: false; reason: string } => ({
			verified: false,
			reason,
		});

		const challengeRecord =
			await this.db.getPowCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			this.logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));

			return notVerified("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND");
		}

		if (challengeRecord.result.status !== CaptchaStatus.approved) {
			throw new ProsopoApiError("CAPTCHA.INVALID_SOLUTION", {
				context: {
					failedFuncName: this.serverVerifyPowCaptchaSolution.name,
					challenge,
				},
			});
		}

		if (challengeRecord.serverChecked)
			return notVerified("API.USER_ALREADY_VERIFIED");

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

		// Accumulate all pow captcha record updates in memory.
		// Instead of writing to the database after each validation check,
		// we collect updates and perform a single batch write at the end.
		// This reduces 6-11 individual writes down to 1-2 writes.
		const powRecordUpdates: Partial<PoWCaptchaRecord> = {};
		let failResult: CaptchaResult | undefined;
		let failReason: string | undefined;

		const recent = verifyRecency(challenge, timeout);
		if (!recent) {
			failResult = {
				status: CaptchaStatus.disapproved,
				reason: "API.TIMESTAMP_TOO_OLD" as const,
			};
			failReason = "API.TIMESTAMP_TOO_OLD";
		}

		// Check user access policies for hard blocks
		if (!failResult && userAccessRulesStorage) {
			try {
				const blockPolicy = await this.checkForHardBlock(
					userAccessRulesStorage,
					challengeRecord,
					challengeRecord.userAccount,
					challengeRecord.headers,
					challengeRecord.coords,
					challengeRecord.countryCode,
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
					failResult = {
						status: CaptchaStatus.disapproved,
						reason: "API.ACCESS_POLICY_BLOCK" as const,
					};
					failReason = "API.ACCESS_POLICY_BLOCK";
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to check user access policies in server PoW verification",
					error,
				}));
			}
		}

		// Check email domain against spam list if email is provided
		if (!failResult && email && spamEmailDomainCheckingEnabled) {
			try {
				const isSpam = await this.checkSpamEmail(email);
				if (isSpam) {
					const emailDomain = email.split("@")[1] || "unknown";
					this.logger.info(() => ({
						msg: "Spam email domain detected in server PoW verification",
						data: { challenge, dappAccount, emailDomain },
					}));
					failResult = {
						status: CaptchaStatus.disapproved,
						reason: "API.SPAM_EMAIL_DOMAIN",
					};
					failReason = "API.SPAM_EMAIL_DOMAIN";
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to check spam email domain in server PoW verification",
					error,
				}));
			}
		}

		// Spam filter: configurable per-site email pattern rules
		if (
			!failResult &&
			spamFilter?.enabled &&
			spamFilter.emailRules?.enabled &&
			email
		) {
			const result = evaluateEmailSpamRules(email, spamFilter.emailRules);
			if (result.isSpam) {
				this.logger.info(() => ({
					msg: "Spam filter rejected email in PoW verification",
					data: { challenge, dappAccount, reason: result.reason },
				}));
				failResult = {
					status: CaptchaStatus.disapproved,
					reason: "API.SPAM_EMAIL_RULE",
				};
				failReason = "API.SPAM_EMAIL_RULE";
			}
		}

		// Traffic filter: block VPN/proxy/Tor/abuser etc.
		// blockAbuser defaults to true so abusive networks are always blocked
		if (!failResult) {
			const effectiveTrafficFilter = { blockAbuser: true, ...trafficFilter };
			// if at least one true
			const hasTrafficFilter = Object.values(effectiveTrafficFilter).some(
				(v) => v,
			);
			const ipToCheck =
				ip || getIpAddressFromComposite(challengeRecord.ipAddress).address;
			if (ipToCheck && hasTrafficFilter) {
				const check = await checkTrafficFilter(
					ipToCheck,
					effectiveTrafficFilter,
					env.ipInfoService,
					this.logger,
				);
				if (check.isBlocked) {
					this.logger.info(() => ({
						msg: "Traffic filter rejected request in PoW verification",
						data: { challenge, dappAccount, ip, reason: check.reason },
					}));
					failResult = {
						status: CaptchaStatus.disapproved,
						reason: check.reason,
					};
					failReason = check.reason;
				}
			}
		}

		// IP validation: store provided IP and validate if rules enabled
		if (!failResult && ip) {
			const challengeIpAddress = getIpAddressFromComposite(
				challengeRecord.ipAddress,
			);

			// Get client settings for IP validation rules
			const clientRecord = await this.db.getClientRecord(dappAccount);
			const ipValidationRules = clientRecord?.settings?.ipValidationRules;

			// Accumulate providedIp update instead of writing immediately
			powRecordUpdates.providedIp = getCompositeIpAddress(ip);

			if (ipValidationRules?.enabled === true) {
				const ipValidation = await deepValidateIpAddress(
					ip,
					challengeIpAddress,
					this.logger,
					env.ipInfoService,
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
					failResult = {
						status: CaptchaStatus.disapproved,
						reason: "API.FAILED_IP_VALIDATION" as const,
					};
					failReason = "API.FAILED_IP_VALIDATION";
				}
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

		// Decision machine evaluation (only if no prior failures)
		if (!failResult) {
			try {
				const decisionInput: DecisionMachineInput = {
					userAccount: challengeRecord.userAccount,
					dappAccount: challengeRecord.dappAccount,
					captchaResult: "passed",
					headers: challengeRecord.headers,
					captchaType: CaptchaType.pow,
					behavioralDataPacked: challengeRecord.behavioralDataPacked,
					deviceCapability: challengeRecord.deviceCapability,
					countryCode: challengeRecord.countryCode,
				};

				const decision = await this.decisionMachineRunner.decide(
					decisionInput,
					this.logger,
				);

				if (decision.decision === DecisionMachineDecision.Deny) {
					this.logger.info(() => ({
						msg: "Decision machine denied PoW captcha in server verification",
						data: {
							challenge,
							userAccount: challengeRecord.userAccount,
							dappAccount,
							reason: decision.reason,
							score: decision.score,
							tags: decision.tags,
						},
					}));

					failResult = {
						status: CaptchaStatus.disapproved,
						reason: decision.reason || "CAPTCHA.DECISION_MACHINE_DENIED",
					};
					failReason = decision.reason || "CAPTCHA.DECISION_MACHINE_DENIED";
				} else {
					this.logger.debug(() => ({
						msg: "Decision machine allowed PoW captcha",
						data: {
							challenge,
							reason: decision.reason,
							score: decision.score,
							tags: decision.tags,
						},
					}));
				}
			} catch (error) {
				this.logger?.error(() => ({
					msg: "Failed to run decision machine in server PoW verification",
					err: error,
				}));
				// Don't fail the captcha if decision machine fails - default to allow
			}
		}

		// Single batch write: combine all accumulated pow record updates + result
		const finalResult: CaptchaResult = failResult || {
			status: CaptchaStatus.approved,
		};
		if (failResult) {
			powRecordUpdates.result = failResult;
		}

		// Write pow record updates and session update in parallel
		const writePromises: Promise<void>[] = [];

		if (Object.keys(powRecordUpdates).length > 0) {
			writePromises.push(
				this.db.updatePowCaptchaRecord(
					challengeRecord.challenge,
					powRecordUpdates,
				),
			);
		}

		if (challengeRecord.sessionId) {
			writePromises.push(
				this.db.updateSessionRecord(
					challengeRecord.sessionId,
					{
						serverChecked: true,
						result: finalResult,
					},
					true,
				),
			);
		}

		if (writePromises.length > 0) {
			await Promise.all(writePromises);
		}

		if (failReason) {
			return notVerified(failReason);
		}

		return { verified: true, ...(score ? { score } : {}) };
	}
}
