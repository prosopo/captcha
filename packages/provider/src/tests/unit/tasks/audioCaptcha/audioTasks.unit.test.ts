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
import {
	type AudioCaptchaStored,
	CaptchaStatus,
	CaptchaType,
	DecisionMachineDecision,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	ResultReason,
} from "@prosopo/types";
import type {
	AudioCaptchaRecord,
	IProviderDatabase,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { getIPAddress, verifyRecency } from "@prosopo/util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import { resolveAudioRenderSettings } from "../../../../tasks/audio/audioRenderer.js";
import { AudioCaptchaManager } from "../../../../tasks/audioCaptcha/audioTasks.js";
import type { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";
import { checkPowSignature } from "../../../../tasks/powCaptcha/powTasksUtils.js";

type DecideFn = DecisionMachineRunner["decide"];

const asAudioRecord = (
	partial: Partial<AudioCaptchaStored>,
): AudioCaptchaRecord =>
	({
		submittedAtTimestamp: new Date(),
		...partial,
	}) as unknown as AudioCaptchaRecord;

const DEFAULT_SETTINGS = resolveAudioRenderSettings();

vi.mock("@polkadot/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@polkadot/util")>();
	return { ...actual, u8aToHex: vi.fn(), stringToHex: vi.fn() };
});

vi.mock("@prosopo/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/util")>();
	return { ...actual, verifyRecency: vi.fn() };
});

vi.mock("../../../../tasks/powCaptcha/powTasksUtils.js", () => ({
	checkPowSignature: vi.fn(),
}));

describe("AudioCaptchaManager", () => {
	const DAPP_ACCOUNT = "dappAccount";
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let audioCaptchaManager: AudioCaptchaManager;
	let mockEnv: ProviderEnvironment;
	let originalDecide: DecideFn | undefined;

	const decisionMachineHandle = () =>
		audioCaptchaManager as unknown as {
			decisionMachineRunner: { decide: DecideFn };
		};

	const mockDecisionMachine = (mockFn: DecideFn) => {
		originalDecide = decisionMachineHandle().decisionMachineRunner.decide;
		decisionMachineHandle().decisionMachineRunner.decide = mockFn;
	};

	const restoreDecisionMachine = () => {
		if (originalDecide) {
			decisionMachineHandle().decisionMachineRunner.decide = originalDecide;
			originalDecide = undefined;
		}
	};

	beforeEach(() => {
		db = {
			storeAudioCaptchaRecord: vi.fn(),
			getAudioCaptchaRecordByChallenge: vi.fn(),
			claimAudioCaptchaSubmission: vi.fn().mockResolvedValue(true),
			updateAudioCaptchaRecord: vi.fn(),
			markAudioCaptchaRecordChecked: vi.fn().mockResolvedValue(true),
			updateAudioCaptchaRecordResult: vi.fn(),
			getClientRecord: vi.fn(),
			getSessionRecordBySessionId: vi.fn(),
			updateSessionRecord: vi.fn(),
			getSpamEmailDomain: vi.fn(),
			countCommitmentsByNormalisedEmail: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn().mockReturnValue(new Uint8Array()),
			address: "testAddress",
		} as unknown as KeyringPair;

		mockEnv = {
			ipInfoService: { lookup: vi.fn() },
			config: {},
		} as unknown as ProviderEnvironment;

		audioCaptchaManager = new AudioCaptchaManager(db, pair, mockEnv.config);

		vi.clearAllMocks();
		vi.mocked(db.claimAudioCaptchaSubmission).mockResolvedValue(true);
		vi.mocked(u8aToHex).mockReturnValue("0xsigned");
		vi.mocked(stringToHex).mockImplementation((s) => `0xhex:${s}`);
		vi.mocked(verifyRecency).mockReturnValue(true);
	});

	afterEach(() => {
		restoreDecisionMachine();
	});

	describe("getAudioCaptchaChallenge", () => {
		it("issues a signed challenge with a clip and the answer's length", () => {
			const result = audioCaptchaManager.getAudioCaptchaChallenge(
				"userAccount",
				"dappAccount",
				DEFAULT_SETTINGS,
			);

			expect(result.challenge).toMatch(
				/^[0-9]+___userAccount___dappAccount___[0-9]+$/,
			);
			expect(result.clip.startsWith("data:audio/wav;base64,")).toBe(true);
			expect(result.characterCount).toBe(result.answer.length);
			expect(result.providerSignature).toBe("0xsigned");
			expect(pair.sign).toHaveBeenCalled();
		});

		it("speaks only digits", () => {
			for (let i = 0; i < 20; i++) {
				const result = audioCaptchaManager.getAudioCaptchaChallenge(
					"u",
					"d",
					DEFAULT_SETTINGS,
				);
				expect(result.answer).toMatch(/^[0-9]+$/);
			}
		});

		it("draws a different answer each time", () => {
			const answers = new Set<string>();
			for (let i = 0; i < 20; i++) {
				const result = audioCaptchaManager.getAudioCaptchaChallenge(
					"u",
					"d",
					DEFAULT_SETTINGS,
				);
				answers.add(result.answer);
			}
			expect(answers.size).toBeGreaterThan(1);
		});

		it("honours the digit count it is given", () => {
			const result = audioCaptchaManager.getAudioCaptchaChallenge(
				"u",
				"d",
				resolveAudioRenderSettings({ digitCount: 3 }),
			);
			expect(result.answer).toHaveLength(3);
			expect(result.characterCount).toBe(3);
		});
	});

	describe("verifyAudioCaptchaSolution", () => {
		const buildArgs = () => {
			const timestamp = 123456789;
			const userAccount = "user";
			const dappAccount = "dapp";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}${POW_SEPARATOR}1`;
			return {
				timestamp,
				userAccount,
				dappAccount,
				challenge,
				providerSignature: "0xprov",
				userSignature: "0xuser",
				ipAddress: getIPAddress("1.1.1.1"),
			};
		};

		const pendingRecord = (
			a: ReturnType<typeof buildArgs>,
			overrides: Partial<AudioCaptchaStored> = {},
		): AudioCaptchaRecord =>
			asAudioRecord({
				challenge: a.challenge,
				dappAccount: a.dappAccount,
				userAccount: a.userAccount,
				answer: "96475",
				ipAddress: getCompositeIpAddress(a.ipAddress),
				result: { status: CaptchaStatus.pending },
				userSubmitted: false,
				...overrides,
			});

		const submit = (
			a: ReturnType<typeof buildArgs>,
			answer: string,
		): Promise<boolean> =>
			audioCaptchaManager.verifyAudioCaptchaSolution(
				a.challenge,
				a.providerSignature,
				answer,
				2,
				[{ kind: "play", t: 1 }],
				1000,
				a.userSignature,
				a.ipAddress,
			);

		it("checks both signatures before it touches the database", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(null);

			await submit(a, "96475");

			expect(checkPowSignature).toHaveBeenCalledTimes(2);
		});

		it("returns false when no challenge record exists", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(null);

			await expect(submit(a, "96475")).resolves.toBe(false);
			expect(db.updateAudioCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("accepts the exact answer", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await expect(submit(a, "96475")).resolves.toBe(true);
			expect(db.updateAudioCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{ status: CaptchaStatus.approved },
				false,
				true,
				a.userSignature,
				undefined,
			);
		});

		it("records a wrong answer as a user failure", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await expect(submit(a, "96476")).resolves.toBe(false);
			expect(db.updateAudioCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
				},
				false,
				true,
				a.userSignature,
				undefined,
			);
		});

		it("refuses a second submission against the same challenge", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a, { userSubmitted: true }),
			);
			vi.mocked(db.claimAudioCaptchaSubmission).mockResolvedValue(false);

			await expect(submit(a, "96475")).resolves.toBe(false);
			expect(db.updateAudioCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("grades nothing when it loses the claim on an unsubmitted record", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a, { userSubmitted: false }),
			);
			vi.mocked(db.claimAudioCaptchaSubmission).mockResolvedValue(false);

			await expect(submit(a, "96475")).resolves.toBe(false);
			expect(db.updateAudioCaptchaRecordResult).not.toHaveBeenCalled();
			expect(db.updateAudioCaptchaRecord).not.toHaveBeenCalled();
		});

		it("claims the submission before grading it", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a, { userSubmitted: false }),
			);

			await submit(a, "96475");

			expect(db.claimAudioCaptchaSubmission).toHaveBeenCalledTimes(1);
			expect(db.claimAudioCaptchaSubmission).toHaveBeenCalledWith(a.challenge);
			const claimOrder = vi
				.mocked(db.claimAudioCaptchaSubmission)
				.mock.invocationCallOrder.at(0);
			const gradeOrder = vi
				.mocked(db.updateAudioCaptchaRecordResult)
				.mock.invocationCallOrder.at(0);
			expect(claimOrder).toBeLessThan(gradeOrder ?? Number.POSITIVE_INFINITY);
		});

		it("disapproves a stale challenge without grading it", async () => {
			const a = buildArgs();
			vi.mocked(verifyRecency).mockReturnValue(false);
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await expect(submit(a, "96475")).resolves.toBe(false);
			expect(db.updateAudioCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_TIMESTAMP,
				},
				false,
				true,
				a.userSignature,
				undefined,
			);
		});

		it("persists the normalised answer and the trail even when wrong", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await submit(a, "9 6 4 7 6");

			expect(db.updateAudioCaptchaRecord).toHaveBeenCalledWith(a.challenge, {
				audioEvents: [{ kind: "play", t: 1 }],
				replays: 2,
				submittedAnswer: "96476",
			});
		});
	});

	describe("serverVerifyInteractiveCaptchaSolution", () => {
		const challenge = "1234567___user___dappAccount___1";

		const verify = () =>
			audioCaptchaManager.serverVerifyInteractiveCaptchaSolution(
				DAPP_ACCOUNT,
				challenge,
				60_000,
				mockEnv,
			);

		const approvedRecord = (
			overrides: Partial<AudioCaptchaStored> = {},
		): AudioCaptchaRecord =>
			asAudioRecord({
				challenge,
				dappAccount: DAPP_ACCOUNT,
				userAccount: "user",
				answer: "96475",
				result: { status: CaptchaStatus.approved },
				serverChecked: false,
				headers: { a: "1" },
				...overrides,
			});

		it("returns verified:false when a concurrent verify claimed the record first", async () => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				approvedRecord(),
			);
			vi.mocked(db.markAudioCaptchaRecordChecked).mockResolvedValue(false);

			const result = await verify();

			expect(result.verified).toBe(false);
			expect(db.markAudioCaptchaRecordChecked).toHaveBeenCalledWith(challenge);
		});

		it("disapproves a solve the dapp server came back for too late", async () => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				approvedRecord({
					submittedAtTimestamp: new Date(Date.now() - 120_000),
				}),
			);

			const result = await verify();

			expect(result.verified).toBe(false);
			expect(db.updateAudioCaptchaRecord).toHaveBeenCalledWith(
				challenge,
				expect.objectContaining({
					result: {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.TIMESTAMP_TOO_OLD,
					},
				}),
			);
		});

		it("hands the decision machine the audio trail", async () => {
			const decide = vi.fn<DecideFn>().mockResolvedValue({
				decision: DecisionMachineDecision.Allow,
				reason: undefined,
				score: 1,
			});
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				approvedRecord({ audioEvents: [{ kind: "play", t: 1 }], replays: 2 }),
			);
			mockDecisionMachine(decide);

			await expect(verify()).resolves.toEqual(
				expect.objectContaining({ verified: true }),
			);

			const [input] = decide.mock.calls[0] ?? [];
			expect(input).toEqual(
				expect.objectContaining({
					captchaType: CaptchaType.audio,
					audioEvents: [{ kind: "play", t: 1 }],
					audioReplays: 2,
				}),
			);
		});
	});
});
