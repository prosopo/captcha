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
	type CaptchaSolutionEscalation,
	CaptchaStatus,
	CaptchaType,
	type KeyringPair,
	type PoWChallengeId,
	type PuzzleCaptchaStored,
	ResultReason,
} from "@prosopo/types";
import type {
	AudioCaptchaRecord,
	IProviderDatabase,
	PuzzleCaptchaRecord,
	SessionRecord,
} from "@prosopo/types-database";
import { getIPAddress, verifyRecency } from "@prosopo/util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import { AudioCaptchaManager } from "../../../../tasks/audioCaptcha/audioTasks.js";
import { applyRouter } from "../../../../tasks/frictionless/routingMachine.js";
import type {
	PostSolveRequest,
	PostSolveRouting,
} from "../../../../tasks/postSolveRouting.js";
import { PuzzleCaptchaManager } from "../../../../tasks/puzzleCaptcha/puzzleTasks.js";

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

vi.mock("../../../../tasks/frictionless/routingMachine.js", () => ({
	applyRouter: vi.fn(),
}));

const SESSION_ID = "session-1";
const CHALLENGE: PoWChallengeId = `${Date.now()}___user___dapp___1`;
const IP = getIPAddress("1.1.1.1");
const ESCALATION: CaptchaSolutionEscalation = {
	captchaType: CaptchaType.image,
	sessionId: "escalated-session",
};
const ESCALATED_RESULT = {
	status: CaptchaStatus.disapproved,
	reason: ResultReason.CAPTCHA_DECISION_MACHINE_DENIED,
};

const asSession = (captchaType: CaptchaType): SessionRecord =>
	({
		sessionId: SESSION_ID,
		captchaType,
		scoreComponents: { baseScore: 0 },
		webView: false,
	}) as unknown as SessionRecord;

const asPuzzleRecord = (
	partial: Partial<PuzzleCaptchaStored>,
): PuzzleCaptchaRecord =>
	({
		submittedAtTimestamp: new Date(),
		...partial,
	}) as unknown as PuzzleCaptchaRecord;

const asAudioRecord = (
	partial: Partial<AudioCaptchaStored>,
): AudioCaptchaRecord =>
	({
		submittedAtTimestamp: new Date(),
		...partial,
	}) as unknown as AudioCaptchaRecord;

describe("post-solve routing of puzzle and audio solves", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	const escalate = vi.fn<PostSolveRouting["escalate"]>();
	const postSolve: PostSolveRequest = {
		context: {
			ip: "1.1.1.1",
			device: { userAgent: "Mozilla/5.0", headers: {} },
			raw: { headers: {}, userAgent: "Mozilla/5.0" },
		},
		escalate,
	};

	beforeEach(() => {
		db = {
			getPuzzleCaptchaRecordByChallenge: vi.fn(),
			claimPuzzleCaptchaSubmission: vi.fn().mockResolvedValue(true),
			updatePuzzleCaptchaRecord: vi.fn(),
			updatePuzzleCaptchaRecordResult: vi.fn(),
			getAudioCaptchaRecordByChallenge: vi.fn(),
			claimAudioCaptchaSubmission: vi.fn().mockResolvedValue(true),
			updateAudioCaptchaRecord: vi.fn(),
			updateAudioCaptchaRecordResult: vi.fn(),
			getSessionRecordBySessionId: vi.fn(),
			updateSessionRecord: vi.fn(),
		} as unknown as IProviderDatabase;
		pair = {
			sign: vi.fn().mockReturnValue(new Uint8Array()),
			address: "testAddress",
		} as unknown as KeyringPair;

		vi.clearAllMocks();
		vi.mocked(u8aToHex).mockReturnValue("0xsigned");
		vi.mocked(stringToHex).mockImplementation((s) => `0xhex:${s}`);
		vi.mocked(verifyRecency).mockReturnValue(true);
		escalate.mockResolvedValue(ESCALATION);
	});

	describe("puzzle", () => {
		const puzzleEvents = [
			{ x: 30, y: 60, t: 0 },
			{ x: 100, y: 100, t: 400 },
		];
		let manager: PuzzleCaptchaManager;

		beforeEach(() => {
			manager = new PuzzleCaptchaManager({ db, pair, config: {} });
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge: CHALLENGE,
					userAccount: "user",
					dappAccount: "dapp",
					sessionId: SESSION_ID,
					originX: 30,
					originY: 60,
					targetX: 100,
					targetY: 100,
					tolerance: 15,
					ipAddress: getCompositeIpAddress(IP),
					result: { status: CaptchaStatus.pending },
				}),
			);
			vi.mocked(db.getSessionRecordBySessionId).mockResolvedValue(
				asSession(CaptchaType.puzzle),
			);
		});

		const drop = (finalX: number, finalY: number) =>
			manager.verifyPuzzleCaptchaSolution({
				challenge: CHALLENGE,
				providerChallengeSignature: "0xprovider",
				finalX,
				finalY,
				puzzleEvents,
				timeout: 60000,
				userTimestampSignature: "0xuser",
				ipAddress: IP,
				postSolve,
			});

		it("escalates a solve the routing machine sends on, and keeps its token from verifying", async () => {
			vi.mocked(applyRouter).mockResolvedValue({
				captchaType: CaptchaType.image,
				reason: "PUZZLE_SCRIPTED_DRAG",
			});

			await expect(drop(101, 99)).resolves.toEqual({
				verified: false,
				escalation: ESCALATION,
			});

			expect(vi.mocked(applyRouter).mock.calls[0]?.[0]).toMatchObject({
				phase: "postPuzzle",
				baseline: { captchaType: CaptchaType.puzzle },
				ctx: {
					raw: {
						puzzleEvents,
						puzzleOrigin: { x: 30, y: 60 },
						puzzleTarget: { x: 100, y: 100 },
					},
				},
			});
			expect(escalate.mock.calls[0]?.[0].origin).toMatchObject({
				sessionId: SESSION_ID,
				captchaType: CaptchaType.puzzle,
			});
			expect(db.updatePuzzleCaptchaRecordResult).toHaveBeenCalledWith(
				expect.objectContaining({ result: ESCALATED_RESULT }),
			);
		});

		it("lets a solve the machine keeps on puzzle stand", async () => {
			vi.mocked(applyRouter).mockResolvedValue({
				captchaType: CaptchaType.puzzle,
			});

			await expect(drop(101, 99)).resolves.toEqual({ verified: true });
			expect(escalate).not.toHaveBeenCalled();
		});

		it("never asks the machine about a wrong answer", async () => {
			await expect(drop(250, 20)).resolves.toEqual({ verified: false });
			expect(applyRouter).not.toHaveBeenCalled();
		});
	});

	describe("audio", () => {
		const audioEvents = [{ kind: "play" as const, t: 1 }];
		let manager: AudioCaptchaManager;

		beforeEach(() => {
			manager = new AudioCaptchaManager({ db, pair, config: {} });
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				asAudioRecord({
					challenge: CHALLENGE,
					userAccount: "user",
					dappAccount: "dapp",
					sessionId: SESSION_ID,
					answer: "96475",
					ipAddress: getCompositeIpAddress(IP),
					result: { status: CaptchaStatus.pending },
					userSubmitted: false,
				}),
			);
		});

		const answer = (submittedAnswer: string) =>
			manager.verifyAudioCaptchaSolution({
				challenge: CHALLENGE,
				providerChallengeSignature: "0xprovider",
				submittedAnswer,
				replays: 2,
				audioEvents,
				timeout: 60000,
				userTimestampSignature: "0xuser",
				ipAddress: IP,
				postSolve,
			});

		it("judges the clip on the visual type of the session it was served against", async () => {
			vi.mocked(db.getSessionRecordBySessionId).mockResolvedValue(
				asSession(CaptchaType.puzzle),
			);
			vi.mocked(applyRouter).mockResolvedValue({
				captchaType: CaptchaType.image,
			});

			await expect(answer("96475")).resolves.toEqual({
				verified: false,
				escalation: ESCALATION,
			});

			expect(vi.mocked(applyRouter).mock.calls[0]?.[0]).toMatchObject({
				phase: "postAudio",
				baseline: { captchaType: CaptchaType.puzzle },
				ctx: { raw: { audioEvents, audioReplays: 2 } },
			});
			expect(escalate.mock.calls[0]?.[0].origin).toMatchObject({
				captchaType: CaptchaType.audio,
			});
		});

		it("lets the solve stand when the machine keeps the session's own type", async () => {
			vi.mocked(db.getSessionRecordBySessionId).mockResolvedValue(
				asSession(CaptchaType.image),
			);
			vi.mocked(applyRouter).mockResolvedValue({
				captchaType: CaptchaType.image,
			});

			await expect(answer("96475")).resolves.toEqual({ verified: true });
			expect(escalate).not.toHaveBeenCalled();
		});

		it("skips routing when the session has no visual type to judge against", async () => {
			vi.mocked(db.getSessionRecordBySessionId).mockResolvedValue(
				asSession(CaptchaType.frictionless),
			);

			await expect(answer("96475")).resolves.toEqual({ verified: true });
			expect(applyRouter).not.toHaveBeenCalled();
		});
	});
});
