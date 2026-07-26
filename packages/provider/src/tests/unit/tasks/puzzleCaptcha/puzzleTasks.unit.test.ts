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
	CaptchaType,
	FrictionlessReason,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	type PuzzleCaptchaStored,
	type RequestHeaders,
	ResultReason,
	type Session,
} from "@prosopo/types";
import type {
	IProviderDatabase,
	PuzzleCaptchaRecord,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { embedData, getIPAddress, verifyRecency } from "@prosopo/util";
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
): PuzzleCaptchaRecord => {
	// Ensure `submittedAtTimestamp` is set on every mocked record (defaults
	// to "now"). The verify path's submit→verify recency check reads this
	// field directly off the record; undefined would resolve to +Infinity
	// and disapprove every test by default. Tests that need recency to
	// fail set submittedAtTimestamp explicitly to a stale value.
	const withDefaults: Partial<PuzzleCaptchaStored> = {
		submittedAtTimestamp: new Date(),
		...partial,
	};
	return withDefaults as unknown as PuzzleCaptchaRecord;
};

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
				result: { status: CaptchaStatus.disapproved },
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

		it("auto-fails with CAPTCHA_INVALID_SALT when salt decodes to invalid coords", async () => {
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
				userSubmitted: false,
			};
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord(challengeRecord),
			);
			vi.mocked(db.updatePuzzleCaptchaRecordResult).mockResolvedValue(
				undefined,
			);

			const malformedSalt = "0x010200";

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
				undefined, // behavioralData
				malformedSalt,
			);

			expect(result).toBe(false);
			expect(validatePuzzleSolution).not.toHaveBeenCalled();
			expect(db.updatePuzzleCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_SALT,
				},
				false, // serverChecked
				true, // userSubmitted
				a.userSignature,
				undefined, // coords must NOT be the bad value
			);
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
				undefined, // coords — no salt supplied in this test
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
				undefined, // coords — no salt supplied in this test
			);
			// puzzleEvents stored when no behavioral data
			expect(db.updatePuzzleCaptchaRecord).toHaveBeenCalledWith(
				a.challenge,
				expect.objectContaining({ puzzleEvents: [{ x: 1, y: 1, t: 1 }] }),
			);
		});

		// Locks in the contract added by the puzzle DM threading PR (#2873):
		// the widget encodes the trusted checkbox click into the salt as
		// [x, y]; the provider decodes and persists them as coords[0][0].
		// The cypress spec only asserts /captcha/puzzle fires — this test
		// asserts the coords actually land on the record, so a regression
		// that drops the decode (or writes [0,0]) surfaces here.
		it("extracts checkbox click coords from salt and persists them as coords[0][0]", async () => {
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

			// Match the widget's client-side salt encoding (see
			// procaptcha-puzzle/src/services/Manager.ts submitSolution):
			// random hex + embedData(x, y). We use a fixed hex string
			// here rather than randomAsHex — the file-wide `u8aToHex`
			// mock (line 143) returns "0xsigned" for every call, which
			// breaks randomAsHex's byte→hex conversion, so a literal is
			// the only reliable way to hand embedData a long-enough hex
			// buffer in this test file.
			const clickX = 158;
			const clickY = 42;
			const coordsToEmbed = [clickX, clickY];
			const salt = embedData(`0x${"a".repeat(64)}`, coordsToEmbed);

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
				undefined, // behavioralData
				salt,
			);

			expect(result).toBe(true);
			expect(db.updatePuzzleCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{ status: CaptchaStatus.approved },
				false,
				true,
				a.userSignature,
				// The whole contract: coords[0] is the "click" tile, coords[0][0]
				// is the [x, y] pair the widget embedded. A regression that drops
				// the decode or writes [0, 0] fails this exact match.
				[[[clickX, clickY]]],
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
				undefined, // coords — no salt supplied in this test
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
						reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
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
					// Stale submit time → submit→verify delta exceeds any
					// sane timeout. Triggers the recency-fail branch.
					submittedAtTimestamp: new Date(0),
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

		// Locks in the ordering: checkForHardBlock at line ~509 short-
		// circuits before the decisionMachineRunner.decide() call at
		// line ~741. If a request matches BOTH a hard-block access
		// policy AND a DM that would deny with a different reason, the
		// commitment must carry ACCESS_POLICY_BLOCK — not the DM's
		// reason. Guards against a refactor that accidentally flips the
		// order (letting DM decide first and win the reason field),
		// which would break audit trails that distinguish operator-set
		// blocks from DM-set denies.
		it("access-policy hard block wins over DM deny — commitment reason is ACCESS_POLICY_BLOCK", async () => {
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

			// Stub checkForHardBlock to return a matching Block policy.
			// The real path queries userAccessRulesStorage via
			// getPrioritisedAccessPolicies; short-circuiting the method
			// avoids reconstructing that whole Redis fixture for one
			// order-of-operations assertion.
			const originalCheckForHardBlock = puzzleCaptchaManager.checkForHardBlock;
			puzzleCaptchaManager.checkForHardBlock = vi.fn().mockResolvedValue({
				type: "block",
				description: "test-hard-block",
			});

			// DM would ALSO deny with a distinguishable reason — this is
			// the whole point: the assertion below must match the AP
			// reason, not this one.
			const decideSpy = vi.fn().mockResolvedValue({
				decision: "deny",
				reason: "CAPTCHA.DM_WOULD_HAVE_DENIED",
				score: 0,
			});
			mockDecisionMachine(decideSpy);

			try {
				const result =
					await puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
						dappAccount,
						challenge,
						1000,
						mockEnv,
						undefined, // ip
						// Truthy storage triggers the checkForHardBlock branch;
						// the stub above ignores whatever's passed here.
						// biome-ignore lint/suspicious/noExplicitAny: test stub
						{} as any,
					);

				expect(result.verified).toBe(false);
				// AP reason wins. DM's reason must NOT appear.
				expect(db.updatePuzzleCaptchaRecord).toHaveBeenCalledWith(
					challenge,
					expect.objectContaining({
						result: expect.objectContaining({
							status: CaptchaStatus.disapproved,
							reason: ResultReason.ACCESS_POLICY_BLOCK,
						}),
					}),
				);
				// DM should never have been consulted — checkForHardBlock
				// short-circuits before the DM branch runs.
				expect(decideSpy).not.toHaveBeenCalled();
			} finally {
				puzzleCaptchaManager.checkForHardBlock = originalCheckForHardBlock;
			}
		});

		it("forwards every session-derived field into the decide() input", async () => {
			const sessionId = "puzzle-session-id";
			vi.mocked(db.getPuzzleCaptchaRecordByChallenge).mockResolvedValue(
				asPuzzleRecord({
					challenge,
					dappAccount,
					userAccount: "user",
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
					headers: { a: "1" },
					sessionId,
				}),
			);
			vi.mocked(verifyRecency).mockImplementation(() => true);

			const ipAddress = getIPAddress("1.1.1.1");
			const sessionRecord: Session = {
				sessionId,
				createdAt: new Date(),
				token: "test-token",
				score: 0.42,
				threshold: 0.27,
				scoreComponents: {
					baseScore: 1,
					unverifiedHost: 0.2,
					dnsAsymmetry: 0.5,
					triggeredDetectors: [27],
					shadowDomPenalty: false,
				},
				ipAddress: getCompositeIpAddress(ipAddress),
				captchaType: CaptchaType.puzzle,
				webView: false,
				iFrame: true,
				decryptedHeadHash: "h".repeat(16),
				userSitekeyIpHash: "ush",
				reason: FrictionlessReason.BOT_SCORE_ABOVE_THRESHOLD,
				ruleType: ["ja4Hash"],
				simdReadings: {
					supported: true,
					schema: 1,
					timerResolutionMs: 0.1,
					runsPerOp: 3,
					durationMs: 200,
					ops: [],
				},
			};
			vi.mocked(db.getSessionRecordBySessionId).mockResolvedValue(
				sessionRecord,
			);

			const decideSpy = vi
				.fn()
				.mockResolvedValue({ decision: "allow" } as const);
			mockDecisionMachine(decideSpy);

			await puzzleCaptchaManager.serverVerifyPuzzleCaptchaSolution(
				dappAccount,
				challenge,
				1000,
				mockEnv,
			);

			expect(decideSpy).toHaveBeenCalledOnce();
			const input = decideSpy.mock.calls[0]?.[0];
			expect(input.captchaType).toBe(CaptchaType.puzzle);
			expect(input.threshold).toBe(sessionRecord.threshold);
			expect(input.scoreComponents).toEqual(sessionRecord.scoreComponents);
			expect(input.decryptedHeadHash).toBe(sessionRecord.decryptedHeadHash);
			expect(input.userSitekeyIpHash).toBe(sessionRecord.userSitekeyIpHash);
			expect(input.simdReadings).toEqual(sessionRecord.simdReadings);
			expect(input.frictionlessReason).toBe(sessionRecord.reason);
			expect(input.ruleType).toEqual(sessionRecord.ruleType);
			expect(input.webView).toBe(sessionRecord.webView);
			expect(input.iFrame).toBe(sessionRecord.iFrame);
			expect(typeof input.score).toBe("number");
		});
	});
});
