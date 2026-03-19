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
import { ProsopoEnvError } from "@prosopo/common";
import {
	ApiParams,
	type BehavioralDataPacked,
	CaptchaStatus,
	CaptchaType,
	DecisionMachineDecision,
	type DecisionMachineInput,
	type GetPuzzleCaptchaResponse,
	type IPAddress,
	type MouseMovementPoint,
	type PuzzleCaptchaSolutionResponse,
	type RequestHeaders,
	type TouchEventPoint,
} from "@prosopo/types";
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

const DEFAULT_PUZZLE_TOLERANCE_PX = 10;
// Images from database datasets – random solved captcha images
const PUZZLE_IMAGE_WIDTH = 320;
const PUZZLE_IMAGE_HEIGHT = 160;
const PUZZLE_PIECE_SIZE = 42; // l in the frontend Verify component

function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function computeTrailStddev(trailY: number[]): number {
	if (trailY.length === 0) return 0;
	const avg = trailY.reduce((a, b) => a + b, 0) / trailY.length;
	const variance =
		trailY.reduce((sum, y) => sum + (y - avg) ** 2, 0) / trailY.length;
	return Math.sqrt(variance);
}

function isMouseMovementPoint(point: unknown): point is MouseMovementPoint {
	return (
		typeof point === "object" &&
		point !== null &&
		typeof (point as any).x === "number" &&
		typeof (point as any).y === "number" &&
		typeof (point as any).timestamp === "number"
	);
}

function isTouchEventPoint(point: unknown): point is TouchEventPoint {
	return (
		typeof point === "object" &&
		point !== null &&
		typeof (point as any).x === "number" &&
		typeof (point as any).y === "number" &&
		typeof (point as any).timestamp === "number" &&
		typeof (point as any).eventType === "string"
	);
}

export class PuzzleCaptchaManager extends CaptchaManager {
	/**
	 * Generate a puzzle captcha challenge.
	 * Picks a random solved captcha from the database and uses its image,
	 * generates a random destX position for the puzzle piece,
	 * signs the challengeId with the provider keypair, stores the record, and returns
	 * the challenge to the client.
	 */
	async getPuzzleCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
	): Promise<GetPuzzleCaptchaResponse> {
		const requestedAtTimestamp = Date.now();
		const nonce = Math.floor(Math.random() * 1_000_000);
		const puzzleChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;

		// Get a dataset with at least one solved captcha
		const datasetId = await this.db.getDatasetIdWithSolvedCaptchasOfSizeN(1);
		if (!datasetId) {
			throw new ProsopoEnvError("DATABASE.DATASET_NOT_FOUND", {
				context: {
					failedFuncName: this.getPuzzleCaptchaChallenge.name,
					message: "No dataset with solved captchas found",
				},
			});
		}

		// Get a random solved captcha from the dataset
		const solvedCaptchas = await this.db.getRandomCaptcha(true, datasetId, 1);
		if (!solvedCaptchas || solvedCaptchas.length === 0) {
			throw new ProsopoEnvError("DATABASE.CAPTCHA_GET_FAILED", {
				context: {
					failedFuncName: this.getPuzzleCaptchaChallenge.name,
					datasetId,
					message: "No solved captchas found in dataset",
				},
			});
		}

		const captcha = at(solvedCaptchas, 0);
		// Use the first item from the captcha (should be an image)
		const imageItem = captcha.items[0];
		if (!imageItem || imageItem.type !== "image") {
			throw new ProsopoEnvError("DATABASE.CAPTCHA_INVALID", {
				context: {
					failedFuncName: this.getPuzzleCaptchaChallenge.name,
					captchaId: captcha.captchaId,
					message: "Captcha does not contain a valid image",
				},
			});
		}

		const imgUrl = imageItem.data;

		// r=9, L = l + r*2 + 3 = 42 + 9*2 + 3 = 63
		const L = PUZZLE_PIECE_SIZE + 9 * 2 + 3;
		const destX = getRandomInt(L + 10, PUZZLE_IMAGE_WIDTH - (L + 10));
		const blockY = getRandomInt(10 + 9 * 2, PUZZLE_IMAGE_HEIGHT - (L + 10));

		const providerSignature = u8aToHex(
			this.pair.sign(stringToHex(puzzleChallengeId)),
		);

		return {
			[ApiParams.puzzleChallengeId]: puzzleChallengeId,
			imgUrl,
			[ApiParams.destX]: destX,
			blockY,
			[ApiParams.timestamp]: requestedAtTimestamp.toString(),
			[ApiParams.signature]: {
				[ApiParams.provider]: {
					[ApiParams.puzzleChallengeId]: providerSignature,
				},
			},
			[ApiParams.status]: "ok",
		};
	}

	/**
	 * Client-side submit: verify signatures, record freshness, slider accuracy, and Y-trail
	 * bot detection. Stores result and returns verified boolean.
	 */
	async verifyPuzzleCaptchaSolution(
		puzzleChallengeId: string,
		providerChallengeSignature: string,
		sliderLeft: number,
		timeout: number,
		userTimestampSignature: string,
		ipAddress: IPAddress,
		headers: RequestHeaders,
		behavioralData?: string,
	): Promise<boolean> {
		// Verify provider signed the challengeId
		checkPowSignature(
			puzzleChallengeId,
			providerChallengeSignature,
			this.pair.address,
			ApiParams.puzzleChallengeId,
		);

		// Extract timestamp and user from challengeId (same format as PoW)
		const parts = puzzleChallengeId.split("___");
		const timestamp = Number.parseInt(at(parts, 0));
		const userAccount = at(parts, 1);

		// Verify user signed the timestamp
		checkPowSignature(
			timestamp.toString(),
			userTimestampSignature,
			userAccount,
			ApiParams.timestamp,
		);

		const record = await this.db.getPuzzleCaptchaRecordById(puzzleChallengeId);
		if (!record) {
			this.logger.debug(() => ({
				msg: `No puzzle record found for challengeId: ${puzzleChallengeId}`,
			}));
			return false;
		}

		const tolerancePx = record.tolerancePx ?? DEFAULT_PUZZLE_TOLERANCE_PX;

		if (!verifyRecency(puzzleChallengeId, timeout)) {
			await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
				result: {
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.INVALID_TIMESTAMP",
				},
				userSubmitted: true,
				sliderLeft,
			});
			return false;
		}

		// Verify slider accuracy
		const spliced = Math.abs(sliderLeft - record.destX) < tolerancePx;

		// Extract trail data from behavioral data for bot detection
		let verified = false;
		if (behavioralData) {
			try {
				const decryptKeys = [
					...(await this.getDetectorKeys()),
					process.env.BOT_DECRYPTION_KEY,
				];
				const decryptedData = await this.decryptBehavioralData(
					behavioralData,
					decryptKeys,
				);
				if (decryptedData) {
					// Extract trail data from mouse/touch movements
					const trailData: number[] = [];
					if (
						decryptedData.collector1 &&
						Array.isArray(decryptedData.collector1)
					) {
						// Mouse movements - extract Y coordinates
						for (const point of decryptedData.collector1) {
							if (isMouseMovementPoint(point)) {
								trailData.push(point.y);
							}
						}
					}
					if (
						decryptedData.collector2 &&
						Array.isArray(decryptedData.collector2)
					) {
						// Touch movements - extract Y coordinates
						for (const point of decryptedData.collector2) {
							if (isTouchEventPoint(point)) {
								trailData.push(point.y);
							}
						}
					}

					// Verify Y-axis trail std deviation is non-zero (bot detection)
					const stddev = computeTrailStddev(trailData);
					verified = stddev !== 0;

					const packedData: BehavioralDataPacked = {
						c1: decryptedData.collector1 || [],
						c2: decryptedData.collector2 || [],
						c3: decryptedData.collector3 || [],
						d: decryptedData.deviceCapability,
					};
					await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
						behavioralDataPacked: packedData,
						deviceCapability: decryptedData.deviceCapability,
					});
				}
			} catch (error) {
				this.logger.error(() => ({
					msg: "Failed to process behavioral data for puzzle captcha",
					err: error,
				}));
			}
		}

		const correct = spliced && verified;

		const result = correct
			? { status: CaptchaStatus.approved as const }
			: {
					status: CaptchaStatus.disapproved as const,
					reason: "CAPTCHA.INVALID_SOLUTION" as const,
				};

		await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
			result,
			userSubmitted: true,
			userSignature: userTimestampSignature,
			sliderLeft,
		});

		return correct;
	}

	getPuzzleVerificationResponse(
		verified: boolean,
	): PuzzleCaptchaSolutionResponse {
		return {
			[ApiParams.status]: "ok",
			[ApiParams.verified]: verified,
		};
	}

	/**
	 * Server-side verification of a puzzle captcha. Called by the dapp's backend.
	 * Checks the puzzle record, recency, IP, access policy, spam email, and
	 * runs the decision machine before confirming the result.
	 */
	async serverVerifyPuzzleCaptchaSolution(
		dappAccount: string,
		puzzleChallengeId: string,
		timeout: number,
		env: ProviderEnvironment,
		ip?: string,
		userAccessRulesStorage?: AccessRulesStorage,
		email?: string,
		spamEmailDomainCheckingEnabled = false,
	): Promise<{ verified: boolean; score?: number }> {
		const notVerifiedResponse = { verified: false };

		const record = await this.db.getPuzzleCaptchaRecordById(puzzleChallengeId);

		if (!record) {
			this.logger.debug(() => ({
				msg: `No puzzle record found for id: ${puzzleChallengeId}`,
			}));
			return notVerifiedResponse;
		}

		if (record.result?.status !== CaptchaStatus.approved) {
			return notVerifiedResponse;
		}

		if (record.serverChecked) return notVerifiedResponse;

		if (dappAccount !== record.dappAccount) {
			throw new ProsopoEnvError("CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND", {
				context: {
					failedFuncName: this.serverVerifyPuzzleCaptchaSolution.name,
					dappAccount,
					recordDappAccount: record.dappAccount,
				},
			});
		}

		// Mark as server-checked immediately to prevent replays
		await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
			serverChecked: true,
		});

		const recent = verifyRecency(puzzleChallengeId, timeout);
		if (!recent) {
			const disapprovedResult = {
				status: CaptchaStatus.disapproved,
				reason: "API.TIMESTAMP_TOO_OLD" as const,
			};
			await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
				result: disapprovedResult,
			});
			if (record.sessionId) {
				await this.db.updateSessionRecord(record.sessionId, {
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
					record,
					record.userAccount,
					record.headers,
					undefined,
					record.countryCode,
				);

				if (blockPolicy) {
					const blockedResult = {
						status: CaptchaStatus.disapproved,
						reason: "API.ACCESS_POLICY_BLOCK" as const,
					};
					await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
						result: blockedResult,
					});
					if (record.sessionId) {
						await this.db.updateSessionRecord(record.sessionId, {
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

		// Check email domain against spam list
		if (email && spamEmailDomainCheckingEnabled) {
			try {
				const isSpam = await this.checkSpamEmail(email);
				if (isSpam) {
					await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
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

		// Validate IP address if provided
		if (ip) {
			const challengeIpAddress = getIpAddressFromComposite(record.ipAddress);
			const clientRecord = await this.db.getClientRecord(dappAccount);
			const ipValidationRules = clientRecord?.settings?.ipValidationRules;

			await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
				providedIp: getCompositeIpAddress(ip),
			});

			if (ipValidationRules?.enabled === true) {
				const ipValidation = await deepValidateIpAddress(
					ip,
					challengeIpAddress,
					this.logger,
					env.config.ipApi.apiKey,
					env.config.ipApi.baseUrl,
					ipValidationRules,
				);

				if (!ipValidation.isValid) {
					const ipFailResult = {
						status: CaptchaStatus.disapproved,
						reason: "API.FAILED_IP_VALIDATION" as const,
					};
					await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
						result: ipFailResult,
					});
					if (record.sessionId) {
						await this.db.updateSessionRecord(record.sessionId, {
							serverChecked: true,
							result: ipFailResult,
						});
					}
					return notVerifiedResponse;
				}
			}
		}

		let score: number | undefined;
		if (record.sessionId) {
			const sessionRecord = await this.db.getSessionRecordBySessionId(
				record.sessionId,
			);
			if (sessionRecord) {
				score = computeFrictionlessScore(sessionRecord.scoreComponents);
			}
		}

		// Run decision machine
		try {
			const decisionInput: DecisionMachineInput = {
				userAccount: record.userAccount,
				dappAccount: record.dappAccount,
				captchaResult: "passed",
				headers: record.headers,
				captchaType: CaptchaType.puzzle,
				behavioralDataPacked: record.behavioralDataPacked,
				deviceCapability: record.deviceCapability,
				countryCode: record.countryCode,
			};

			const decisionMachineRunner = new DecisionMachineRunner(this.db);
			const decision = await decisionMachineRunner.decide(
				decisionInput,
				this.logger,
			);

			if (decision.decision === DecisionMachineDecision.Deny) {
				const dmResult = {
					status: CaptchaStatus.disapproved,
					reason: decision.reason || "CAPTCHA.DECISION_MACHINE_DENIED",
				};
				await this.db.updatePuzzleCaptchaRecord(puzzleChallengeId, {
					result: dmResult,
				});
				if (record.sessionId) {
					await this.db.updateSessionRecord(record.sessionId, {
						serverChecked: true,
						result: dmResult,
					});
				}
				return notVerifiedResponse;
			}
		} catch (error) {
			this.logger.error(() => ({
				msg: "Failed to run decision machine in server puzzle verification",
				err: error,
			}));
			// Default to allow if decision machine fails
		}

		// Approved — update session
		if (record.sessionId) {
			await this.db.updateSessionRecord(record.sessionId, {
				serverChecked: true,
				result: { status: CaptchaStatus.approved },
			});
		}

		return { verified: true, ...(score !== undefined ? { score } : {}) };
	}
}
