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

import {
	type CaptchaResult,
	CaptchaType,
	type ClientMetaData,
	type DecisionMachineInput,
	type IPAddress,
	type ISpamFilterRules,
	type ITrafficFilter,
	type PoWChallengeId,
	type PuzzleEvent,
	type RequestHeaders,
	puzzleToleranceDefault,
} from "@prosopo/types";
import type { PuzzleCaptchaRecord } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { AccessRulesStorage } from "@prosopo/user-access-policy";
import {
	InteractiveCaptchaManager,
	type InteractiveCaptchaRecordUpdate,
	type MintedChallenge,
} from "../interactiveCaptcha/interactiveCaptchaManager.js";
import { validatePuzzleSolution } from "./puzzleTasksUtils.js";

interface PuzzleCaptchaChallenge extends MintedChallenge {
	targetX: number;
	targetY: number;
	originX: number;
	originY: number;
	tolerance: number;
}

export class PuzzleCaptchaManager extends InteractiveCaptchaManager<PuzzleCaptchaRecord> {
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

	protected updateSubmissionResult(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		userSignature: string,
		coords: [number, number][][] | undefined,
	): Promise<void> {
		return this.db.updatePuzzleCaptchaRecordResult(
			challenge,
			result,
			false,
			true,
			userSignature,
			coords,
		);
	}

	protected async claimSubmission(
		record: PuzzleCaptchaRecord,
	): Promise<boolean> {
		return !record.userSubmitted;
	}

	protected markRecordChecked(challenge: PoWChallengeId): Promise<boolean> {
		return this.db.markPuzzleCaptchaRecordChecked(challenge);
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
		const { challenge, providerSignature, requestedAtTimestamp } =
			this.mintChallenge(userAccount, dappAccount);

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
			tolerance: tolerance ?? puzzleToleranceDefault,
			providerSignature,
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
				validatePuzzleSolution(
					finalX,
					finalY,
					record.targetX,
					record.targetY,
					record.tolerance,
				),
			persistInteraction: () =>
				this.db.updatePuzzleCaptchaRecord(challenge, { puzzleEvents }),
		});
	}

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
