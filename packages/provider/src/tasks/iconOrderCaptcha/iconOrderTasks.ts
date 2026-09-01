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
import { gradeClicks } from "@prosopo/icon-order-assets";
import {
	ApiParams,
	type BehavioralDataPacked,
	type CaptchaResult,
	CaptchaStatus,
	CaptchaType,
	type ClientMetaData,
	type DecisionMachineInput,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	type IconClick,
	type IconOrderEvent,
	type PoWChallengeId,
	type RequestHeaders,
	ResultReason,
	SimdReadingsStage,
	type StoredIconTarget,
	iconOrderToleranceDefault,
	isBlockingCaptchaResult,
} from "@prosopo/types";
import type { IconOrderCaptchaRecord } from "@prosopo/types-database";
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
	type RenderedIconOrderImages,
	toStoredTargets,
} from "../iconOrder/iconOrderRenderer.js";
import {
	InteractiveCaptchaManager,
	type InteractiveCaptchaRecordUpdate,
} from "../interactiveCaptcha/interactiveCaptchaManager.js";
import { checkPowSignature } from "../powCaptcha/powTasksUtils.js";

/**
 * A minted icon-order challenge.
 *
 * `targets` is the answer and belongs on the challenge record, never in a
 * response. It comes out of the renderer rather than being drawn separately,
 * because the icons' positions ARE their pixels — there is no independent
 * "target" to pick first the way there is for a puzzle notch.
 */
export interface IconOrderCaptchaChallenge {
	challenge: PoWChallengeId;
	targets: StoredIconTarget[];
	tolerance: number;
	providerSignature: string;
	requestedAtTimestamp: number;
	images: Omit<RenderedIconOrderImages, "targets">;
}

export class IconOrderCaptchaManager extends InteractiveCaptchaManager {
	protected readonly captchaType = CaptchaType.iconOrder;
	protected readonly logLabel = "icon-order";

	protected getRecordByChallenge(
		challenge: string,
	): Promise<IconOrderCaptchaRecord | null> {
		return this.db.getIconOrderCaptchaRecordByChallenge(challenge);
	}

	protected updateRecord(
		challenge: PoWChallengeId,
		updates: InteractiveCaptchaRecordUpdate,
	): Promise<void> {
		return this.db.updateIconOrderCaptchaRecord(challenge, updates);
	}

	protected decisionMachineEventFields(
		record: IconOrderCaptchaRecord,
	): Partial<DecisionMachineInput> {
		return { iconOrderEvents: record.iconOrderEvents };
	}

	/**
	 * @description Mint an icon-order challenge for a given user and dapp.
	 *
	 * Rendering happens here rather than in the endpoint, because for this
	 * type the imagery IS the answer: the renderer decides where the icons
	 * land, so the caller cannot persist a target before pixels exist. The
	 * ordering guarantee the puzzle type gets by storing first is preserved
	 * differently — the endpoint stores the returned `targets` before it
	 * responds, so a crash between render and store means the user never
	 * receives a challenge the server cannot score.
	 *
	 * @param userAccount - user that is solving the captcha
	 * @param dappAccount - dapp that is requesting the captcha
	 * @param origin - not currently used
	 * @param tolerance - hit radius as a multiple of each icon's own size
	 * @param renderImages - injected renderer; defaults to the real one
	 */
	async getIconOrderCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		origin: string,
		tolerance: number | undefined,
		renderImages: () => Promise<RenderedIconOrderImages>,
	): Promise<IconOrderCaptchaChallenge> {
		const resolvedTolerance = tolerance ?? iconOrderToleranceDefault;
		const requestedAtTimestamp = Date.now();

		const nonce = Math.floor(Math.random() * 1000000);
		const challenge: PoWChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));

		const { targets, ...images } = await renderImages();

		return {
			challenge,
			targets: toStoredTargets(targets),
			tolerance: resolvedTolerance,
			providerSignature: challengeSignature,
			requestedAtTimestamp,
			images,
		};
	}

	async verifyIconOrderCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		clicks: IconClick[],
		iconOrderEvents: IconOrderEvent[],
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
			await this.db.getIconOrderCaptchaRecordByChallenge(challenge);

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

		// Single-use challenge: refuse re-submission. This matters more here
		// than anywhere: the answer is an ordered subset of a handful of
		// on-screen positions, so repeated guesses against one challenge
		// would be enumerable. Each challenge accepts exactly one submission.
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
			await this.db.updateIconOrderCaptchaRecordResult(
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
					...(isBlockingCaptchaResult(CaptchaType.iconOrder, badSaltResult) && {
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
			await this.db.updateIconOrderCaptchaRecordResult(
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
					...(isBlockingCaptchaResult(CaptchaType.iconOrder, timeoutResult) && {
						blocked: true,
					}),
				});
			}
			return false;
		}

		// Grading reads the answer straight off the stored record — the
		// client was never told where the icons are, so the only way to
		// produce a passing sequence is to have looked at the frame.
		const correct = gradeClicks(
			challengeRecord.targets,
			clicks,
			challengeRecord.tolerance,
		);

		let result: CaptchaResult = { status: CaptchaStatus.approved };
		if (!correct) {
			result = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
			};
		}

		// Solved-counter writes: fire-and-forget, only on a correct solve.
		// Runs before any decision-machine veto.
		if (correct && this.usageCounters) {
			const dappAccount = at(challengeSplit, 2);
			this.usageCounters.incrManyAsync(
				dappAccount,
				buildAllWindowIncrements(
					"solved",
					CaptchaType.iconOrder,
					ipAddress.address,
					userAccount,
				),
			);
		}

		// Persist the clicks and the pointer trail unconditionally so the raw
		// interaction survives even when the behavioural payload is absent or
		// its decryption fails (missing bundle, ciphertext / key mismatch).
		// See the matching note on the puzzle type: gating this write on
		// decryption succeeding loses the trail for legitimate solves AND
		// trips the "no-cache request with no behavioural data" DM rule.
		await this.db.updateIconOrderCaptchaRecord(challenge, {
			clicks,
			iconOrderEvents,
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

					await this.db.updateIconOrderCaptchaRecord(challenge, {
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
			await this.db.updateIconOrderCaptchaRecord(challenge, {
				clientMetaData: storedClientMetaData,
			});
		}

		await this.db.updateIconOrderCaptchaRecordResult(
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
				...(isBlockingCaptchaResult(CaptchaType.iconOrder, result) && {
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
	 * Server-side verification for the icon-order type.
	 *
	 * The pipeline itself is shared — see
	 * `InteractiveCaptchaManager.serverVerifyInteractiveCaptchaSolution`.
	 */
	async serverVerifyIconOrderCaptchaSolution(
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
