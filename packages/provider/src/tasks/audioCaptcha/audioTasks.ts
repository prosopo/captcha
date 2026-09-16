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
import type { AudioRenderSettings } from "@prosopo/audio-assets";
import {
	ApiParams,
	type AudioEvent,
	type BehavioralDataPacked,
	type CaptchaResult,
	CaptchaStatus,
	CaptchaType,
	type ClientMetaData,
	type DecisionMachineInput,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	type PoWChallengeId,
	type RequestHeaders,
	ResultReason,
	SimdReadingsStage,
	isBlockingCaptchaResult,
} from "@prosopo/types";
import type { AudioCaptchaRecord } from "@prosopo/types-database";
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
	type RenderedAudioClip,
	renderAudioClip,
	resolveAudioRenderSettings,
} from "../audio/audioRenderer.js";
import {
	InteractiveCaptchaManager,
	type InteractiveCaptchaRecordUpdate,
} from "../interactiveCaptcha/interactiveCaptchaManager.js";
import { checkPowSignature } from "../powCaptcha/powTasksUtils.js";
import {
	normaliseAudioAnswer,
	validateAudioSolution,
} from "./audioTasksUtils.js";

interface AudioCaptchaChallenge {
	challenge: PoWChallengeId;
	/** WAV data URI handed straight to the widget's `<audio>` element. */
	clip: string;
	/** How many characters the user must type. Safe to publish. */
	characterCount: number;
	/**
	 * The spoken transcript.
	 *
	 * The caller persists this on the challenge record and must not put
	 * it in a response. `GetAudioCaptchaResponse` has no field it could
	 * be assigned to, which is the structural half of that guarantee.
	 */
	answer: string;
	durationMs: number;
	providerSignature: string;
	requestedAtTimestamp: number;
}

export class AudioCaptchaManager extends InteractiveCaptchaManager {
	protected readonly captchaType = CaptchaType.audio;
	protected readonly logLabel = "audio";

	protected getRecordByChallenge(
		challenge: string,
	): Promise<AudioCaptchaRecord | null> {
		return this.db.getAudioCaptchaRecordByChallenge(challenge);
	}

	protected updateRecord(
		challenge: PoWChallengeId,
		updates: InteractiveCaptchaRecordUpdate,
	): Promise<void> {
		return this.db.updateAudioCaptchaRecord(challenge, updates);
	}

	protected decisionMachineEventFields(
		record: AudioCaptchaRecord,
	): Partial<DecisionMachineInput> {
		return { audioEvents: record.audioEvents, audioReplays: record.replays };
	}

	/**
	 * @description Generates an Audio Captcha challenge for a given user and dapp
	 *
	 * @param {string} userAccount - user that is solving the captcha
	 * @param {string} dappAccount - dapp that is requesting the captcha
	 * @param origin - not currently used
	 * @param settings - resolved per-render tunables
	 */
	async getAudioCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		origin: string,
		settings?: AudioRenderSettings,
	): Promise<AudioCaptchaChallenge> {
		const requestedAtTimestamp = Date.now();

		// Create nonce for the challenge
		const nonce = Math.floor(Math.random() * 1000000);

		// Use timestamp, userAccount and dappAccount for the challenge id
		const challenge: PoWChallengeId = `${requestedAtTimestamp}___${userAccount}___${dappAccount}___${nonce}`;
		const challengeSignature = u8aToHex(this.pair.sign(stringToHex(challenge)));

		const rendered: RenderedAudioClip = renderAudioClip(
			settings ?? resolveAudioRenderSettings(),
		);

		return {
			challenge,
			clip: rendered.clip,
			characterCount: rendered.characterCount,
			answer: rendered.answer,
			durationMs: rendered.durationMs,
			providerSignature: challengeSignature,
			requestedAtTimestamp,
		};
	}

	/**
	 * @description Verifies a Audio Captcha solution for a given user and dapp
	 *
	 * @param {string} challenge - the challenge string
	 * @param {string} providerChallengeSignature - proof that the Provider provided the challenge
	 * @param {string} submittedAnswer - what the user typed
	 * @param {number} replays - how many times the clip was played
	 * @param {AudioEvent[]} audioEvents - playback / typing event trail
	 * @param {number} timeout - the time in milliseconds since the Provider was selected to provide the captcha
	 * @param {string} userTimestampSignature
	 * @param ipAddress
	 * @param headers
	 * @param behavioralData
	 */
	async verifyAudioCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		submittedAnswer: string,
		replays: number,
		audioEvents: AudioEvent[],
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
			await this.db.getAudioCaptchaRecordByChallenge(challenge);

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

		// Single-use challenge: refuse re-submission. Unlike POW, which is
		// hash-bound, the answer space here is small enough that repeated
		// attempts against one challenge would matter, so each challenge
		// accepts exactly one submission. This is also what makes "wrong
		// answer means a fresh challenge" the only possible retry policy —
		// the old clip is spent.
		//
		// Claimed atomically rather than read off `challengeRecord` above:
		// concurrent submissions all read the same unclaimed record, so a
		// read-then-check leaves a window in which each of them is graded and
		// handed a verdict — which is the enumeration this is here to stop.
		// Everything that can produce a verdict lives below this point.
		if (!(await this.db.claimAudioCaptchaSubmission(challenge))) {
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
			await this.db.updateAudioCaptchaRecordResult(
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
					...(isBlockingCaptchaResult(CaptchaType.audio, badSaltResult) && {
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
			await this.db.updateAudioCaptchaRecordResult(
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
					...(isBlockingCaptchaResult(CaptchaType.audio, timeoutResult) && {
						blocked: true,
					}),
				});
			}
			return false;
		}

		const correct = validateAudioSolution(
			submittedAnswer,
			challengeRecord.answer,
		);

		let result: CaptchaResult = { status: CaptchaStatus.approved };
		if (!correct) {
			result = {
				status: CaptchaStatus.disapproved,
				reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
			};
		}

		// Solved-counter writes: fire-and-forget, only on a correct answer.
		// Runs before any decision-machine veto.
		if (correct && this.usageCounters) {
			const dappAccount = at(challengeSplit, 2);
			this.usageCounters.incrManyAsync(
				dappAccount,
				buildAllWindowIncrements(
					"solved",
					CaptchaType.audio,
					ipAddress.address,
					userAccount,
				),
			);
		}

		// Persist the event trail and the submitted answer unconditionally,
		// so they survive even when the behavioural payload is absent or its
		// decryption fails (missing bundle, ciphertext / key mismatch). The
		// puzzle flow learned this the hard way: gating the event write on
		// decryption succeeding lost the trail on legitimate solves whose
		// bundle could not be resolved, AND tripped the "no-cache request
		// with no behavioural data" decision-machine rule.
		//
		// `submittedAnswer` is stored even when wrong — especially when
		// wrong. Systematic confusions ("users type 9 when 5 was spoken")
		// are a phoneme-table problem, and there is no way to see them
		// without keeping the incorrect answers.
		await this.db.updateAudioCaptchaRecord(challenge, {
			audioEvents,
			replays,
			submittedAnswer: normaliseAudioAnswer(submittedAnswer),
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

					await this.db.updateAudioCaptchaRecord(challenge, {
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
			await this.db.updateAudioCaptchaRecord(challenge, {
				clientMetaData: storedClientMetaData,
			});
		}

		await this.db.updateAudioCaptchaRecordResult(
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
				...(isBlockingCaptchaResult(CaptchaType.audio, result) && {
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
	 * Server-side verification for the audio type.
	 *
	 * The pipeline itself is shared — see
	 * `InteractiveCaptchaManager.serverVerifyInteractiveCaptchaSolution`.
	 */
	async serverVerifyAudioCaptchaSolution(
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
