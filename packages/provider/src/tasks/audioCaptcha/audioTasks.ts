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

import type { AudioRenderSettings } from "@prosopo/audio-assets";
import {
	type AudioEvent,
	type CaptchaResult,
	CaptchaType,
	type ClientMetaData,
	type DecisionMachineInput,
	type IPAddress,
	type PoWChallengeId,
} from "@prosopo/types";
import type { AudioCaptchaRecord } from "@prosopo/types-database";
import { renderAudioClip } from "../audio/audioRenderer.js";
import {
	InteractiveCaptchaManager,
	type InteractiveCaptchaRecordUpdate,
	type MintedChallenge,
} from "../interactiveCaptcha/interactiveCaptchaManager.js";
import {
	normaliseAudioAnswer,
	validateAudioSolution,
} from "./audioTasksUtils.js";

/** `answer` is the transcript: persist it, never put it in a response. */
export interface AudioCaptchaChallenge extends MintedChallenge {
	/** WAV data URI. */
	clip: string;
	characterCount: number;
	answer: string;
	durationMs: number;
}

export class AudioCaptchaManager extends InteractiveCaptchaManager<AudioCaptchaRecord> {
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

	protected updateSubmissionResult(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		userSignature: string,
		coords: [number, number][][] | undefined,
	): Promise<void> {
		return this.db.updateAudioCaptchaRecordResult(
			challenge,
			result,
			false,
			true,
			userSignature,
			coords,
		);
	}

	/**
	 * An atomic claim rather than a read of `userSubmitted`: concurrent
	 * submissions would all read it unset and each get a verdict, enough to
	 * enumerate a short digit sequence.
	 */
	protected claimSubmission(record: AudioCaptchaRecord): Promise<boolean> {
		return this.db.claimAudioCaptchaSubmission(record.challenge);
	}

	protected markRecordChecked(challenge: PoWChallengeId): Promise<boolean> {
		return this.db.markAudioCaptchaRecordChecked(challenge);
	}

	protected decisionMachineEventFields(
		record: AudioCaptchaRecord,
	): Partial<DecisionMachineInput> {
		return { audioEvents: record.audioEvents, audioReplays: record.replays };
	}

	/**
	 * The renderer picks the digits, so the answer only exists once the clip
	 * does; the caller must store `answer` before responding.
	 */
	getAudioCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		settings: AudioRenderSettings,
	): AudioCaptchaChallenge {
		const minted = this.mintChallenge(userAccount, dappAccount);
		const { clip, characterCount, answer, durationMs } =
			renderAudioClip(settings);
		return { ...minted, clip, characterCount, answer, durationMs };
	}

	async verifyAudioCaptchaSolution(
		challenge: PoWChallengeId,
		providerChallengeSignature: string,
		submittedAnswer: string,
		replays: number,
		audioEvents: AudioEvent[],
		timeout: number,
		userTimestampSignature: string,
		ipAddress: IPAddress,
		behavioralData?: string,
		salt?: string,
		simdReadings?: string,
		clientMetaData?: ClientMetaData,
	): Promise<boolean> {
		return this.submitInteractiveCaptchaSolution({
			challenge,
			providerChallengeSignature,
			timeout,
			userTimestampSignature,
			ipAddress,
			behavioralData,
			salt,
			simdReadings,
			clientMetaData,
			isCorrect: (record) =>
				validateAudioSolution(submittedAnswer, record.answer),
			// Wrong answers are kept too: systematic mishearings are only
			// visible from the answers people actually typed.
			persistInteraction: () =>
				this.db.updateAudioCaptchaRecord(challenge, {
					audioEvents,
					replays,
					submittedAnswer: normaliseAudioAnswer(submittedAnswer),
				}),
		});
	}
}
