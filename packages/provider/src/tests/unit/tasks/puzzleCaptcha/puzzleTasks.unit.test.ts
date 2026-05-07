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
import { ProsopoApiError } from "@prosopo/common";
import {
	CaptchaStatus,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	type PuzzleCaptchaStored,
	type RequestHeaders,
} from "@prosopo/types";
import type {
	IProviderDatabase,
	PuzzleCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { getIPAddress, verifyRecency } from "@prosopo/util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import type { DecisionMachineRunner } from "../../../../tasks/decisionMachine/decisionMachineRunner.js";
import { checkPowSignature } from "../../../../tasks/powCaptcha/powTasksUtils.js";
import { PuzzleCaptchaManager } from "../../../../tasks/puzzleCaptcha/puzzleTasks.js";
import { validatePuzzleSolution } from "../../../../tasks/puzzleCaptcha/puzzleTasksUtils.js";

type DecideFn = DecisionMachineRunner["decide"];

// PuzzleCaptchaRecord = mongoose.Document & PuzzleCaptchaStored. The tests
// only care about a small subset of the stored fields; this helper widens
// a partial fixture to the full record type without sprinkling casts at
// every mock call site.
const asPuzzleRecord = (
	partial: Partial<PuzzleCaptchaStored>,
): PuzzleCaptchaRecord => partial as unknown as PuzzleCaptchaRecord;

vi.mock("@polkadot/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@polkadot/util")>();
	return {
		...actual,
		u8aToHex: vi.fn(),
		stringToHex: vi.fn(),
	};
});

vi.mock("@prosopo/util", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@prosopo/util")>();
	return {
		...actual,
		verifyRecency: vi.fn(),
	};
});

vi.mock("../../../../tasks/powCaptcha/powTasksUtils.js", () => ({
	checkPowSignature: vi.fn(),
}));

vi.mock("../../../../tasks/puzzleCaptcha/puzzleTasksUtils.js", () => ({
	validatePuzzleSolution: vi.fn(),
}));

describe("PuzzleCaptchaManager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let puzzleCaptchaManager: PuzzleCaptchaManager;
	let mockEnv: ProviderEnvironment;
	let originalDecide: DecideFn | undefined;

	// The decisionMachineRunner is a private field on PuzzleCaptchaManager;
	// the cast lets the test stub it without making it public on the class.
	const decisionMachineHandle = () =>
		puzzleCaptchaManager as unknown as {
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
			storePuzzleCaptchaRecord: vi.fn(),
			getPuzzleCaptchaRecordByChallenge: vi.fn(),
			updatePuzzleCaptchaRecord: vi.fn(),
			updatePuzzleCaptchaRecordResult: vi.fn(),
			getClientRecord: vi.fn(),
			getSessionRecordBySessionId: vi.fn(),
			updateSessionRecord: vi.fn(),
			getDetectorKeys: vi.fn().mockResolvedValue([]),
			getSpamEmailDomain: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn().mockReturnValue(new Uint8Array()),
			address: "testAddress",
		} as unknown as KeyringPair;

		mockEnv = {
			ipInfoService: {
				lookup: vi.fn(),
			},
			config: {},
		} as unknown as ProviderEnvironment;

		puzzleCaptchaManager = new PuzzleCaptchaManager(db, pair, mockEnv.config);

		vi.clearAllMocks();
		vi.mocked(u8aToHex).mockReturnValue("0xsigned");
		vi.mocked(stringToHex).mockImplementation((s) => `0xhex:${s}`);
	});

	afterEach(() => {
		restoreDecisionMachine();
	});

	describe("getPuzzleCaptchaChallenge", () => {
		it("returns a challenge with target/origin coordinates within bounds", async () => {
			const result = await puzzleCaptchaManager.getPuzzleCaptchaChallenge(
				"userAccount",
				"dappAccount",
				"origin",
			);

			// challenge format: timestamp___userAccount___dappAccount___nonce
			expect(result.challenge).toMatch(
				/^[0-9]+___userAccount___dappAccount___[0-9]+$/,
			);
			expect(result.targetX).toBeGreaterThanOrEqual(150);
			expect(result.targetX).toBeLessThanOrEqual(280);
			expect(result.targetY).toBeGreaterThanOrEqual(30);
			expect(result.targetY).toBeLessThanOrEqual(170);
			expect(result.originX).toBeGreaterThanOrEqual(20);
			expect(result.originX).toBeLessThanOrEqual(130);
			expect(result.originY).toBeGreaterThanOrEqual(30);
			expect(result.originY).toBeLessThanOrEqual(170);
			expect(result.providerSignature).toBe("0xsigned");
			expect(pair.sign).toHaveBeenCalled();
		});

		it("falls back to the default tolerance when none is provided", async () => {
			const result = await puzzleCaptchaManager.getPuzzleCaptchaChallenge(
				"u",
				"d",
				"origin",
			);
			expect(result.tolerance).toBe(15);
		});

		it("honors a custom tolerance", async () => {
			const result = await puzzleCaptchaManager.getPuzzleCaptchaChallenge(
				"u",
				"d",
				"origin",
				42,
			);
			expect(result.tolerance).toBe(42);
		});
	});

	describe("verifyPuzzleCaptchaSolution", () => {
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
				headers: { a: "1", b: "2", c: "3" } as RequestHeaders,
			};
		};

		it("returns false when no challenge record exists", async () => {
			const a = buildArgs();

			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(null);

			const result = await puzzleCaptchaManager.verifyPuzzleCaptchaSolution(
				a.challenge,
				a.providerSignature,
				100,
				100,
				[],
				1000,
				a.userSignature,
				a.ipAddress,
				a.headers,
			);

			expect(result).toBe(false);
			expect(db.updatePuzzleCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("refuses re-submission of an already-submitted challenge (replay guard)", async () => {
			const a = buildArgs();
			const challengeRecord: Partial<PuzzleCaptchaStored> = {
				challenge: a.challenge,
				dappAccount: a.dappAccount,
				userAccount: a.userAccount,
				targetX: 100,
				targetY: 100,
				tolerance: 15,
				ipAddress: getCompositeIpAddress(a.ipAddress),
				result: { status: CaptchaStatus.disapproved, reason: "" },
				userSubmitted: true,
			};
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord(challengeRecord),
			);

			const result = await puzzleCaptchaManager.verifyPuzzleCaptchaSolution(
				a.challenge,
				a.providerSignature,
				100,
				100,
				[],
				1000,
				a.userSignature,
				a.ipAddress,
				a.headers,
			);

			expect(result).toBe(false);
			expect(validatePuzzleSolution).not.toHaveBeenCalled();
			expect(db.updatePuzzleCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("returns false and records a timeout when the challenge is not recent", async () => {
			const a = buildArgs();
			const challengeRecord: Partial<PuzzleCaptchaStored> = {
				challenge: a.challenge,
				dappAccount: a.dappAccount,
				userAccount: a.userAccount,
				targetX: 100,
				targetY: 100,
				tolerance: 15,
				ipAddress: getCompositeIpAddress(a.ipAddress),
				result: { status: CaptchaStatus.pending },
			};

			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord(challengeRecord),
			);
			vi.mocked(verifyRecency).mockImplementation(() => false);

			const result = await puzzleCaptchaManager.verifyPuzzleCaptchaSolution(
				a.challenge,
				a.providerSignature,
				100,
				100,
				[],
				1000,
				a.userSignature,
				a.ipAddress,
				a.headers,
			);

			expect(result).toBe(false);
			expect(db.updatePuzzleCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				expect.objectContaining({
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.INVALID_TIMESTAMP",
				}),
				false,
				true,
				a.userSignature,
			);
		});

		it("returns true and approves when the solution is within tolerance", async () => {
			const a = buildArgs();
			const challengeRecord: Partial<PuzzleCaptchaStored> = {
				challenge: a.challenge,
				dappAccount: a.dappAccount,
				userAccount: a.userAccount,
				targetX: 100,
				targetY: 100,
				tolerance: 15,
				ipAddress: getCompositeIpAddress(a.ipAddress),
				result: { status: CaptchaStatus.pending },
			};

			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord(challengeRecord),
			);
			vi.mocked(verifyRecency).mockImplementation(() => true);
			vi.mocked(validatePuzzleSolution).mockReturnValue(true);

			const result = await puzzleCaptchaManager.verifyPuzzleCaptchaSolution(
				a.challenge,
				a.providerSignature,
				102,
				101,
				[{ x: 1, y: 1, t: 1 }],
				1000,
				a.userSignature,
				a.ipAddress,
				a.headers,
			);

			expect(result).toBe(true);
			expect(checkPowSignature).toHaveBeenCalled();
			expect(db.updatePuzzleCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{ status: CaptchaStatus.approved },
				false,
				true,
				a.userSignature,
			);
			// puzzleEvents stored when no behavioral data
			expect(db.updatePuzzleCaptchaRecord).toHaveBeenCalledWith(
				a.challenge,
				expect.objectContaining({ puzzleEvents: [{ x: 1, y: 1, t: 1 }] }),
			);
		});

		it("returns false and disapproves when the solution is outside tolerance", async () => {
			const a = buildArgs();
			const challengeRecord: Partial<PuzzleCaptchaStored> = {
				challenge: a.challenge,
				dappAccount: a.dappAccount,
				userAccount: a.userAccount,
				targetX: 100,
				targetY: 100,
				tolerance: 15,
				ipAddress: getCompositeIpAddress(a.ipAddress),
				result: { status: CaptchaStatus.pending },
			};

			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord(challengeRecord),
			);
			vi.mocked(verifyRecency).mockImplementation(() => true);
			vi.mocked(validatePuzzleSolution).mockReturnValue(false);

			const result = await puzzleCaptchaManager.verifyPuzzleCaptchaSolution(
				a.challenge,
				a.providerSignature,
				500,
				500,
				[],
				1000,
				a.userSignature,
				a.ipAddress,
				a.headers,
			);

			expect(result).toBe(false);
			expect(db.updatePuzzleCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				expect.objectContaining({
					status: CaptchaStatus.disapproved,
					reason: "CAPTCHA.INVALID_SOLUTION",
				}),
				false,
				true,
				a.userSignature,
			);
		});
	});

	describe("serverVerifyPuzzleCaptchaSolution", () => {
		const dappAccount = "dappAccount";
		const challenge = "1234567___user___dappAccount___1";

		it("returns verified:false when the challenge record does not exist", async () => {
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(null);

			const result =
				await puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				);

			expect(result.verified).toBe(false);
		});

		it("throws when the stored result is not approved", async () => {
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge,
					dappAccount,
					result: {
						status: CaptchaStatus.disapproved,
						reason: "CAPTCHA.INVALID_SOLUTION",
					},
					serverChecked: false,
				}),
			);

			await expect(
				puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				),
			).rejects.toBeInstanceOf(ProsopoApiError);
		});

		it("returns verified:false when the solution has already been server-checked", async () => {
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge,
					dappAccount,
					result: { status: CaptchaStatus.approved },
					serverChecked: true,
				}),
			);

			const result =
				await puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				);

			expect(result.verified).toBe(false);
			expect(db.updatePuzzleCaptchaRecord).not.toHaveBeenCalled();
		});

		it("throws when the dappAccount on the record does not match", async () => {
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge,
					dappAccount: "differentDapp",
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
				}),
			);

			await expect(
				puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				),
			).rejects.toThrow();
		});

		it("returns verified:false and writes a timeout result when not recent", async () => {
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge,
					dappAccount,
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
				}),
			);
			vi.mocked(verifyRecency).mockImplementation(() => false);

			const result =
				await puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				);

			expect(result.verified).toBe(false);
			expect(db.updatePuzzleCaptchaRecord).toHaveBeenCalledWith(
				challenge,
				expect.objectContaining({
					result: expect.objectContaining({
						status: CaptchaStatus.disapproved,
						reason: "API.TIMESTAMP_TOO_OLD",
					}),
				}),
			);
		});

		it("returns verified:true on the happy path", async () => {
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge,
					dappAccount,
					userAccount: "user",
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
					headers: { a: "1" },
				}),
			);
			vi.mocked(verifyRecency).mockImplementation(() => true);
			mockDecisionMachine(
				vi.fn().mockResolvedValue({
					decision: "allow",
					reason: undefined,
					score: 1,
				}),
			);

			const result =
				await puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				);

			expect(result.verified).toBe(true);
			// Records that the solution has been server-checked, gating reuse.
			expect(db.updatePuzzleCaptchaRecord).toHaveBeenCalledWith(
				challenge,
				expect.objectContaining({ serverChecked: true }),
			);
		});

		it("returns verified:false when the decision machine denies", async () => {
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge,
					dappAccount,
					userAccount: "user",
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
					headers: { a: "1" },
				}),
			);
			vi.mocked(verifyRecency).mockImplementation(() => true);
			mockDecisionMachine(
				vi.fn().mockResolvedValue({
					decision: "deny",
					reason: "CAPTCHA.BOT_DETECTED",
					score: 0,
				}),
			);

			const result =
				await puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				);

			expect(result.verified).toBe(false);
			expect(db.updatePuzzleCaptchaRecord).toHaveBeenCalledWith(
				challenge,
				expect.objectContaining({
					result: expect.objectContaining({
						status: CaptchaStatus.disapproved,
						reason: "CAPTCHA.BOT_DETECTED",
					}),
				}),
			);
		});
	});
});
