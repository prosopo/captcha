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
	POW_SEPARATOR,
	type PoWChallengeId,
	type PuzzleEvent,
	type RequestHeaders,
	puzzleToleranceDefault,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import { at, verifyRecency } from "@prosopo/util";
import {
	getCompositeIpAddress,
	getIpAddressFromComposite,
} from "../../compositeIpAddress.js";
import { deepValidateIpAddress } from "../../util.js";
import { CaptchaManager } from "../captchaManager.js";
import { DecisionMachineRunner } from "../decisionMachine/decisionMachineRunner.js";
import { computeFrictionlessScore } from "../frictionless/frictionlessTasksUtils.js";
import { checkPowSignature } from "../powCaptcha/powTasksUtils.js";
import { validatePuzzleSolution } from "./puzzleTasksUtils.js";

interface PuzzleCaptchaChallenge {
	challenge: PoWChallengeId;
	targetX: number;
	targetY: number;
	originX: number;
	originY: number;
	tolerance: number;
	providerSignature: string;
	requestedAtTimestamp: number;
}

export class PuzzleCaptchaManager extends CaptchaManager {
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
	 * @description Generates a Puzzle Captcha challenge for a given user and dapp
	 *
	 * @param {string} userAccount - user that is solving the captcha
	 * @param {string} dappAccount - dapp that is requesting the captcha
	 * @param origin - not currently used
	 * @param tolerance
	 */
	async getPuzzleCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		origin: string,
		tolerance?: number,
	): Promise<PuzzleCaptchaChallenge> {
		const resolvedTolerance = tolerance ?? puzzleToleranceDefault;
		const requestedAtTimestamp = Date.now();

		// Create nonce for the challenge
		const nonce = Math.floor(Math.random() * 1000000);

		// Use blockhash, userAccount and dappAccount for string for challenge
		const challenge: PoWChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));

		// Generate random target coordinates
		const targetX = Math.floor(Math.random() * (280 - 150 + 1)) + 150;
		const targetY = Math.floor(Math.random() * (170 - 30 + 1)) + 30;

		// Generate random origin coordinates
		const originX = Math.floor(Math.random() * (130 - 20 + 1)) + 20;
		const originY = Math.floor(Math.random() * (170 - 30 + 1)) + 30;

		return {
			challenge,
			targetX,
			targetY,
			originX,
			originY,
			tolerance: resolvedTolerance,
			providerSignature: challengeSignature,
			requestedAtTimestamp,
		};
	}

	/**
	 * @description Verifies a Puzzle Captcha solution for a given user and dapp
	 *
	 * @param {string} challenge - the challenge string
	 * @param {string} providerChallengeSignature - proof that the Provider provided the challenge
	 * @param {number} finalX - the final X coordinate of the puzzle
	 * @param {number} finalY - the final Y coordinate of the puzzle
	 * @param {PuzzleEvent[]} puzzleEvents - the puzzle event trail
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the captcha
	 * @param {string} userTimestampSignature
	 * @param ipAddress
	 * @param headers
	 * @param behavioralData
	 */
	async verifyPuzzleCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		finalX: number,
		finalY: number,
		puzzleEvents: PuzzleEvent[],
		timeout: number,
		userTimestampSignature: string,
		ipAddress: IPAddress,
		headers: RequestHeaders,
		behavioralData?: string,
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
			await this.db.getPuzzleCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			this.logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));
			// no record of this challenge
			return false;
		}

		// Single-use challenge: refuse re-submission. Unlike POW (hash-bound),
		// the puzzle answer space is small enough to brute-force, so each
		// challenge must accept exactly one submission.
		if (challengeRecord.userSubmitted) {
			this.logger.debug(() => ({
				msg: `Challenge already submitted: ${challenge}`,
			}));
			return false;
		}

		if (!verifyRecency(challenge, timeout)) {
			const timeoutResult = {
				status: CaptchaStatus.disapproved,
				reason: "CAPTCHA.INVALID_TIMESTAMP" as const,
			};
			await this.db.updatePuzzleCaptchaRecordResult(
				challenge,
				timeoutResult,
				false, //serverchecked
				true, // usersubmitted
				userTimestampSignature,
			);
			if (challengeRecord.sessionId) {
				await this.db.updateSessionRecord(challengeRecord.sessionId, {
					userSubmitted: true,
					result: timeoutResult,
				});
			}
			return false;
		}

		const correct = validatePuzzleSolution(
			finalX,
			finalY,
			challengeRecord.targetX,
			challengeRecord.targetY,
			challengeRecord.tolerance,
		);

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
					await this.db.updatePuzzleCaptchaRecord(challenge, {
						behavioralDataPacked: packedData,
						deviceCapability: decryptedData.deviceCapability,
						puzzleEvents,
					});
				}
			} catch (error) {
				this.logger?.error(() => ({
					msg: "Failed to process behavioral data",
					err: error,
				}));
				// Don't fail the captcha if behavioral analysis fails
			}
		} else {
			// Store puzzle events even without behavioral data
			await this.db.updatePuzzleCaptchaRecord(challenge, {
				puzzleEvents,
			});
		}

		await this.db.updatePuzzleCaptchaRecordResult(
			challenge,
			result,
			false,
			true,
			userTimestampSignature,
		);

		// Update the session record with submission result
		if (challengeRecord.sessionId) {
			await this.db.updateSessionRecord(challengeRecord.sessionId, {
				userSubmitted: true,
				result,
			});
		}

		return correct;
	}

	/**
	 * @description Verifies a Puzzle Captcha for a given user and dapp. This is called by the server to verify the user's solution
	 * and update the record in the database to show that the user has solved the captcha
	 *
	 * @param {string} dappAccount - the dapp that is requesting the captcha
	 * @param {string} challenge - the challenge string
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the captcha
	 * @param env - provider environment
	 * @param ip - optional IP address for validation
	 * @param userAccessRulesStorage - storage for querying user access policies
	 * @param email
	 * @param spamEmailDomainCheckingEnabled
	 */
	async serverVerifyPuzzleCaptchaSolution(
		dappAccount: string,
		challenge: string,
		timeout: number,
		env: ProviderEnvironment,
		ip?: string,
		userAccessRulesStorage?: AccessRulesStorage,
		email?: string,
		spamEmailDomainCheckingEnabled = false,
	): Promise<{ verified: boolean; score?: number }> {
		const notVerifiedResponse = { verified: false };

		const challengeRecord =
			await this.db.getPuzzleCaptchaRecordByChallenge(challenge);

		if (!challengeRecord) {
			this.logger.debug(() => ({
				msg: `No record of this challenge: ${challenge}`,
			}));

			return notVerifiedResponse;
		}

		if (challengeRecord.result.status !== CaptchaStatus.approved) {
			throw new ProsopoApiError("CAPTCHA.INVALID_SOLUTION", {
				context: {
					failedFuncName: this.serverVerifyPuzzleCaptchaSolution.name,
					challenge,
				},
			});
		}

		if (challengeRecord.serverChecked) return notVerifiedResponse;

		const challengeDappAccount = challengeRecord.dappAccount;

		if (dappAccount !== challengeDappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifyPuzzleCaptchaSolution.name,
					dappAccount,
					challengeDappAccount,
				},
			});
		}

		// -- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING ---- WARNING --
		// Do not move this code down or put any other code before it. We want to drop out as early as possible if the
		// solution has already been checked by the server. Moving this code around could result in solutions being
		// re-usable.
		await this.db.updatePuzzleCaptchaRecord(challengeRecord.challenge, {
			serverChecked: true,
			lastUpdatedTimestamp: new Date(),
		});
		// -- END WARNING --

		const recent = verifyRecency(challenge, timeout);
		if (!recent) {
			const disapprovedResult = {
				status: CaptchaStatus.disapproved,
				reason: "API.TIMESTAMP_TOO_OLD" as const,
			};
			await this.db.updatePuzzleCaptchaRecord(challengeRecord.challenge, {
				result: disapprovedResult,
			});
			if (challengeRecord.sessionId) {
				await this.db.updateSessionRecord(challengeRecord.sessionId, {
					serverChecked: true,
					result: disapprovedResult,
				});
			}
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
					challengeRecord.countryCode,
				);

				if (blockPolicy) {
					this.logger.info(() => ({
						msg: "User blocked by access policy in server puzzle verification",
						data: {
							challenge,
							userAccount: challengeRecord.userAccount,
							dappAccount,
							policy: blockPolicy,
						},
					}));
					const blockedResult = {
						status: CaptchaStatus.disapproved,
						reason: "API.ACCESS_POLICY_BLOCK" as const,
					};
					await this.db.updatePuzzleCaptchaRecord(challengeRecord.challenge, {
						result: blockedResult,
					});
					if (challengeRecord.sessionId) {
						await this.db.updateSessionRecord(challengeRecord.sessionId, {
							serverChecked: true,
							result: blockedResult,
						});
					}
					return notVerifiedResponse;
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to check user access policies in server puzzle verification",
					error,
				}));
			}
		}

		// Check email domain against spam list if email is provided
		if (email && spamEmailDomainCheckingEnabled) {
			try {
				const isSpam = await this.checkSpamEmail(email);
				if (isSpam) {
					const emailDomain = email.split("@")[1] || "unknown";
					this.logger.info(() => ({
						msg: "Spam email domain detected in server puzzle verification",
						data: { challenge, dappAccount, emailDomain },
					}));
					await this.db.updatePuzzleCaptchaRecord(challengeRecord.challenge, {
						result: {
							status: CaptchaStatus.disapproved,
							reason: "API.SPAM_EMAIL_DOMAIN",
						},
					});
					return notVerifiedResponse;
				}
			} catch (error) {
				this.logger.warn(() => ({
					msg: "Failed to check spam email domain in server puzzle verification",
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

			await this.db.updatePuzzleCaptchaRecord(challengeRecord.challenge, {
				providedIp: getCompositeIpAddress(ip),
			});

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
						msg: "IP validation failed for puzzle captcha",
						data: {
							ip,
							challengeIp: challengeIpAddress.address,
							error: ipValidation.errorMessage,
							distanceKm: ipValidation.distanceKm,
						},
					}));
					const ipFailResult = {
						status: CaptchaStatus.disapproved,
						reason: "API.FAILED_IP_VALIDATION" as const,
					};
					await this.db.updatePuzzleCaptchaRecord(challengeRecord.challenge, {
						result: ipFailResult,
					});
					if (challengeRecord.sessionId) {
						await this.db.updateSessionRecord(challengeRecord.sessionId, {
							serverChecked: true,
							result: ipFailResult,
						});
					}
					return notVerifiedResponse;
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

		// We know solution is correct by this point. Run decision machine evaluation to process additional checks.
		try {
			const decisionInput: DecisionMachineInput = {
				userAccount: challengeRecord.userAccount,
				dappAccount: challengeRecord.dappAccount,
				captchaResult: "passed",
				headers: challengeRecord.headers,
				captchaType: CaptchaType.puzzle,
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
					msg: "Decision machine denied puzzle captcha in server verification",
					data: {
						challenge,
						userAccount: challengeRecord.userAccount,
						dappAccount,
						reason: decision.reason,
						score: decision.score,
						tags: decision.tags,
					},
				}));

				const dmResult = {
					status: CaptchaStatus.disapproved,
					reason: decision.reason || "CAPTCHA.DECISION_MACHINE_DENIED",
				};
				await this.db.updatePuzzleCaptchaRecord(challengeRecord.challenge, {
					result: dmResult,
				});
				if (challengeRecord.sessionId) {
					await this.db.updateSessionRecord(challengeRecord.sessionId, {
						serverChecked: true,
						result: dmResult,
					});
				}
				return notVerifiedResponse;
			}

			this.logger.debug(() => ({
				msg: "Decision machine allowed puzzle captcha",
				data: {
					challenge,
					reason: decision.reason,
					score: decision.score,
					tags: decision.tags,
				},
			}));
		} catch (error) {
			this.logger?.error(() => ({
				msg: "Failed to run decision machine in server puzzle verification",
				err: error,
			}));
			// Don't fail the captcha if decision machine fails - default to allow
		}

		// Server verification passed — update session as approved and serverChecked
		if (challengeRecord.sessionId) {
			await this.db.updateSessionRecord(challengeRecord.sessionId, {
				serverChecked: true,
				result: { status: CaptchaStatus.approved },
			});
		}

		return { verified: true, ...(score ? { score } : {}) };
	}
}
