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
import { CaptchaType, type DecisionMachineInput } from "@prosopo/types";
import {
	ApiParams,
	type BehavioralDataPacked,
	type CaptchaResult,
	CaptchaStatus,
	type ClientMetaData,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	type PoWChallengeId,
	type PuzzleEvent,
	type RequestHeaders,
	ResultReason,
	SimdReadingsStage,
	isBlockingCaptchaResult,
	puzzleToleranceDefault,
} from "@prosopo/types";
import type { PuzzleCaptchaRecord } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import {
	assertCoordsSafe,
	at,
	extractData,
	verifyRecency,
} from "@prosopo/util";
import { buildAllWindowIncrements } from "../../util/usageCounters.js";
import { toStoredClientMetaData } from "../../utils/clientMetaData.js";
import {
	InteractiveCaptchaManager,
	type InteractiveCaptchaRecordUpdate,
} from "../interactiveCaptcha/interactiveCaptchaManager.js";
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

export class PuzzleCaptchaManager extends InteractiveCaptchaManager {
	protected readonly captchaType = CaptchaType.puzzle;
	protected readonly logLabel = "puzzle";

	protected getRecordByChallenge(
		challenge: string,
	): Promise<PuzzleCaptchaRecord | null> {
		return this.db.getPuzzleCaptchaRecordByChallenge(challenge);
	}

	protected updateRecord(
		challenge: PoWChallengeId,
		updates: InteractiveCaptchaRecordUpdate,
	): Promise<void> {
		return this.db.updatePuzzleCaptchaRecord(challenge, updates);
	}

	protected decisionMachineEventFields(
		record: PuzzleCaptchaRecord,
	): Partial<DecisionMachineInput> {
		return { puzzleEvents: record.puzzleEvents };
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
		salt?: string,
		simdReadings?: string,
		clientMetaData?: ClientMetaData,
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

		// Extract coordinates from salt if provided — mirrors the POW
		// flow. Invalid salt input disapproves the request.
		let coords: [number, number][][] | undefined;
		let saltDecodeError: unknown;
		if (salt) {
			try {
				const extractedData = extractData(salt);
				if (extractedData.length >= 2) {
					const built: [number, number][][] = [
						[[extractedData[0], extractedData[1]] as [number, number]],
					];
					assertCoordsSafe(built, "coords");
					coords = built;
				}
			} catch (error) {
				saltDecodeError = error;
				this.logger.warn(() => ({
					msg: "Failed to extract coordinates from salt",
					error,
					salt,
				}));
			}
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

		if (saltDecodeError) {
			const badSaltResult = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_SALT,
			};
			await this.db.updatePuzzleCaptchaRecordResult(
				challenge,
				badSaltResult,
				false, // serverChecked
				true, // userSubmitted
				userTimestampSignature,
				undefined, // never persist the bad coords
			);
			if (challengeRecord.sessionId) {
				await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
					userSubmitted: true,
					result: badSaltResult,
					// Stamp `blocked=true` so downstream aggregations (portal
					// Overview, audit search, etc.) can key off a single
					// field. See `isBlockingCaptchaResult`.
					...(isBlockingCaptchaResult(CaptchaType.puzzle, badSaltResult) && {
						blocked: true,
					}),
				});
			}
			return false;
		}

		if (!verifyRecency(challenge, timeout)) {
			const timeoutResult = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_TIMESTAMP,
			};
			await this.db.updatePuzzleCaptchaRecordResult(
				challenge,
				timeoutResult,
				false, //serverchecked
				true, // usersubmitted
				userTimestampSignature,
				coords,
			);
			if (challengeRecord.sessionId) {
				await this.updateSessionRecordWithCache(challengeRecord.sessionId, {
					userSubmitted: true,
					result: timeoutResult,
					...(isBlockingCaptchaResult(CaptchaType.puzzle, timeoutResult) && {
						blocked: true,
					}),
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
				reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
			};
		}

		// Solved-counter writes: fire-and-forget, only on a correct puzzle.
		// Runs before any decision-machine veto.
		if (correct && this.usageCounters) {
			const dappAccount = at(challengeSplit, 2);
			this.usageCounters.incrManyAsync(
				dappAccount,
				buildAllWindowIncrements(
					"solved",
					CaptchaType.puzzle,
					ipAddress.address,
					userAccount,
				),
			);
		}

		// Persist puzzleEvents unconditionally so the raw event trail survives
		// even when the behavioural payload is absent or its decryption fails
		// (missing bundle, ciphertext / key mismatch, etc.). Previously the
		// puzzleEvents write was gated on decryption succeeding, so legitimate
		// solves whose bundle couldn't be resolved lost the event trail AND
		// tripped the "no-cache request with no behavioural data" DM rule.
		await this.db.updatePuzzleCaptchaRecord(challenge, {
			puzzleEvents,
		});

		// Process behavioral data if provided
		if (behavioralData) {
			try {
				// The behavioural payload was encrypted by this session's detector
				// pool bundle; resolve it from the bundleId promoted onto the
				// session record (no key pool — the detector lives only on
				// providers).
				const bundle = await this.resolveBundleBySessionId(
					challengeRecord.sessionId,
				);

				// Decrypt the behavioral data (returns unpacked format)
				const decryptedData = await this.decryptBehavioralData(
					behavioralData,
					bundle,
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

					await this.db.updatePuzzleCaptchaRecord(challenge, {
						behavioralDataPacked: packedData,
						deviceCapability: decryptedData.deviceCapability,
					});
				}
			} catch (error) {
				this.logger?.error(() => ({
					msg: "Failed to process behavioral data",
					err: error,
				}));
				// Don't fail the captcha if behavioral analysis fails
			}
		}

		const storedClientMetaData = toStoredClientMetaData(clientMetaData);
		if (storedClientMetaData) {
			await this.db.updatePuzzleCaptchaRecord(challenge, {
				clientMetaData: storedClientMetaData,
			});
		}

		await this.db.updatePuzzleCaptchaRecordResult(
			challenge,
			result,
			false,
			true,
			userTimestampSignature,
			coords,
		);

		// Update the session record with submission result
		if (challengeRecord.sessionId) {
			const linkedSessionId = challengeRecord.sessionId;
			await this.updateSessionRecordWithCache(linkedSessionId, {
				userSubmitted: true,
				result,
				...(isBlockingCaptchaResult(CaptchaType.puzzle, result) && {
					blocked: true,
				}),
				// Mirror the render-time metadata onto the session so the session
				// row carries the same clientSessionId the verify call correlates
				// against.
				...(storedClientMetaData && {
					clientMetaData: storedClientMetaData,
				}),
			});
			if (simdReadings) {
				await this.decryptAndAttachSimdReadingsIfAbsent(
					linkedSessionId,
					simdReadings,
					SimdReadingsStage.submit,
				);
			}
		}

		return correct;
	}

	/**
	 * Server-side verification for the puzzle type.
	 *
	 * The pipeline itself is shared — see
	 * `InteractiveCaptchaManager.serverVerifyInteractiveCaptchaSolution`. This
	 * wrapper exists so callers keep the type-named entry point they already
	 * use; the record accessors above are what make it puzzle-specific.
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
		spamFilter?: ISpamFilterRules,
		trafficFilter?: ITrafficFilter,
		storeMetadata = false,
		clientSessionId?: string,
	): Promise<{ verified: boolean; score?: number; sessionId?: string }> {
		return this.serverVerifyInteractiveCaptchaSolution(
			dappAccount,
			challenge,
			timeout,
			env,
			ip,
			userAccessRulesStorage,
			email,
			spamEmailDomainCheckingEnabled,
			spamFilter,
			trafficFilter,
			storeMetadata,
			clientSessionId,
		);
	}
}
