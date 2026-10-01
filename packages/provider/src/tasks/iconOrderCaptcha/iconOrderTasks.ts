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

import { gradeClicks } from "@prosopo/icon-order-assets";
import {
	type CaptchaResult,
	CaptchaType,
	type ClientMetaData,
	type DecisionMachineInput,
	type IPAddress,
	type IconClick,
	type IconOrderEvent,
	type PoWChallengeId,
	type StoredIconTarget,
	iconOrderToleranceDefault,
} from "@prosopo/types";
import type { IconOrderCaptchaRecord } from "@prosopo/types-database";
import {
	type RenderedIconOrderImages,
	toStoredTargets,
} from "../iconOrder/iconOrderRenderer.js";
import {
	InteractiveCaptchaManager,
	type InteractiveCaptchaRecordUpdate,
	type MintedChallenge,
} from "../interactiveCaptcha/interactiveCaptchaManager.js";

/** `targets` is the answer: persist it, never put it in a response. */
export interface IconOrderCaptchaChallenge extends MintedChallenge {
	targets: StoredIconTarget[];
	tolerance: number;
	images: Omit<RenderedIconOrderImages, "targets">;
}

export class IconOrderCaptchaManager extends InteractiveCaptchaManager<IconOrderCaptchaRecord> {
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

	protected updateSubmissionResult(
		challenge: PoWChallengeId,
		result: CaptchaResult,
		userSignature: string,
		coords: [number, number][][] | undefined,
	): Promise<void> {
		return this.db.updateIconOrderCaptchaRecordResult(
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
	 * enumerate the ordering of a handful of icons.
	 */
	protected claimSubmission(record: IconOrderCaptchaRecord): Promise<boolean> {
		return this.db.claimIconOrderCaptchaSubmission(record.challenge);
	}

	protected markRecordChecked(challenge: PoWChallengeId): Promise<boolean> {
		return this.db.markIconOrderCaptchaRecordChecked(challenge);
	}

	protected decisionMachineEventFields(
		record: IconOrderCaptchaRecord,
	): Partial<DecisionMachineInput> {
		return { iconOrderEvents: record.iconOrderEvents };
	}

	/**
	 * The renderer decides where the icons land, so the answer only exists
	 * once the imagery does; the caller must store `targets` before responding.
	 */
	async getIconOrderCaptchaChallenge(
		userAccount: string,
		dappAccount: string,
		tolerance: number | undefined,
		renderImages: () => Promise<RenderedIconOrderImages>,
	): Promise<IconOrderCaptchaChallenge> {
		const minted = this.mintChallenge(userAccount, dappAccount);
		const { targets, ...images } = await renderImages();
		return {
			...minted,
			targets: toStoredTargets(targets),
			tolerance: tolerance ?? iconOrderToleranceDefault,
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
				gradeClicks(record.targets, clicks, record.tolerance),
			persistInteraction: () =>
				this.db.updateIconOrderCaptchaRecord(challenge, {
					clicks,
					iconOrderEvents,
				}),
		});
	}
}
