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
	type AudioCaptchaStored,
	CaptchaStatus,
	type ClientMetaData,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	type RequestHeaders,
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

// AudioCaptchaRecord = mongoose.Document & AudioCaptchaStored. The tests only
// care about a small subset of the stored fields; this helper widens a partial
// fixture to the full record type without sprinkling casts at every mock call
// site.
const asAudioRecord = (
	partial: Partial<AudioCaptchaStored>,
): AudioCaptchaRecord => {
	// Ensure `submittedAtTimestamp` is set on every mocked record (defaults to
	// "now"). The verify path's submit→verify recency check reads this field
	// directly off the record; undefined would resolve to +Infinity and
	// disapprove every test by default.
	const withDefaults: Partial<AudioCaptchaStored> = {
		submittedAtTimestamp: new Date(),
		...partial,
	};
	return withDefaults as unknown as AudioCaptchaRecord;
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

// The signature checks are powTasksUtils' and tested there. Stubbed to a no-op
// so each test can drive the path past them; the one test that cares asserts
// they ran before any database read.
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

	// The decisionMachineRunner is a private field on AudioCaptchaManager; the
	// cast lets the test stub it without making it public on the class.
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
			updateAudioCaptchaRecord: vi.fn(),
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
		vi.mocked(u8aToHex).mockReturnValue("0xsigned");
		vi.mocked(stringToHex).mockImplementation((s) => `0xhex:${s}`);
		vi.mocked(verifyRecency).mockReturnValue(true);
	});

	afterEach(() => {
		restoreDecisionMachine();
	});

	describe("getAudioCaptchaChallenge", () => {
		it("issues a signed challenge with a clip and the answer's length", async () => {
			const result = await audioCaptchaManager.getAudioCaptchaChallenge(
				"userAccount",
				"dappAccount",
				"origin",
			);

			expect(result.challenge).toMatch(
				/^[0-9]+___userAccount___dappAccount___[0-9]+$/,
			);
			expect(result.clip.startsWith("data:audio/wav;base64,")).toBe(true);
			expect(result.characterCount).toBe(result.answer.length);
			expect(result.providerSignature).toBe("0xsigned");
			expect(pair.sign).toHaveBeenCalled();
		});

		it("speaks only digits, so no letter confusions can be drawn", async () => {
			// The E-set (B, C, D, E, G, P, T, V, Z) is nine names separated only
			// by a short onset before an identical vowel, and collapses under
			// noise; the generator is digits-only for that reason.
			for (let i = 0; i < 20; i++) {
				const result = await audioCaptchaManager.getAudioCaptchaChallenge(
					"u",
					"d",
					"origin",
				);
				expect(result.answer).toMatch(/^[0-9]+$/);
			}
		});

		it("draws a different answer each time", async () => {
			const answers = new Set<string>();
			for (let i = 0; i < 20; i++) {
				const result = await audioCaptchaManager.getAudioCaptchaChallenge(
					"u",
					"d",
					"origin",
				);
				answers.add(result.answer);
			}
			// A generator that repeated itself would produce a finite set,
			// which is the whole reason the audio is synthesised rather than
			// drawn from a recorded corpus.
			expect(answers.size).toBeGreaterThan(1);
		});

		it("honours the digit count it is given", async () => {
			const result = await audioCaptchaManager.getAudioCaptchaChallenge(
				"u",
				"d",
				"origin",
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
				headers: { a: "1", b: "2", c: "3" } as RequestHeaders,
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
			extras: {
				salt?: string;
				clientMetaData?: ClientMetaData;
				timeout?: number;
			} = {},
		) =>
			audioCaptchaManager.verifyAudioCaptchaSolution(
				a.challenge,
				a.providerSignature,
				answer,
				0, // replays
				[], // audioEvents
				extras.timeout ?? 1000,
				a.userSignature,
				a.ipAddress,
				a.headers,
				undefined, // behavioralData
				extras.salt,
				undefined, // simdReadings
				extras.clientMetaData,
			);

		it("checks both signatures before it touches the database", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(null);

			await submit(a, "96475");

			// A caller who can't produce the signatures shouldn't cost a read.
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

		it.each([
			["9 6 4 7 5", "spaces"],
			["9-6-4-7-5", "dashes"],
			["96 475", "a single gap"],
			[" 96475 ", "surrounding whitespace"],
		])("accepts %s, typed with %s", async (typed) => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			// Failing any of these is a grader bug, not a wrong answer: assistive
			// technology inserts separators the user never typed.
			await expect(submit(a, typed)).resolves.toBe(true);
		});

		it("rejects a single wrong digit, with no edit-distance slack", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			// One allowed substitution widens the accepted set by far more
			// than it helps a genuine listener.
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

		it("rejects the right digits in the wrong order", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await expect(submit(a, "96457")).resolves.toBe(false);
		});

		it("rejects an answer with nothing in it", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await expect(submit(a, "   ")).resolves.toBe(false);
		});

		it("rejects everything when the stored transcript is somehow empty", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a, { answer: "" }),
			);

			// A record like this should not exist, but "" === "" would otherwise
			// pass every submission that normalises to nothing.
			await expect(submit(a, "")).resolves.toBe(false);
			await expect(submit(a, "12345")).resolves.toBe(false);
		});

		it("refuses a second submission against the same challenge", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a, { userSubmitted: true }),
			);

			// The answer space is small enough that repeated attempts against
			// a single challenge would matter.
			await expect(submit(a, "96475")).resolves.toBe(false);
			expect(db.updateAudioCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("will not let a replay of a correct answer pass either", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a, {
					userSubmitted: true,
					result: { status: CaptchaStatus.approved },
				}),
			);

			await expect(submit(a, "96475")).resolves.toBe(false);
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

		it("disapproves a malformed salt without grading the answer", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await expect(submit(a, "96475", { salt: "0x010200" })).resolves.toBe(
				false,
			);
			expect(db.updateAudioCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_SALT,
				},
				false,
				true,
				a.userSignature,
				undefined,
			);
		});

		it("keeps a wrong answer, which is where phoneme confusions show up", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await submit(a, "9 6 4 7 6");

			// Stored normalised, so "users type 9 when 5 was spoken" is
			// countable without re-parsing separators.
			expect(db.updateAudioCaptchaRecord).toHaveBeenCalledWith(
				a.challenge,
				expect.objectContaining({ submittedAnswer: "96476" }),
			);
		});

		it("records the session id the widget was rendered with", async () => {
			const a = buildArgs();
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				pendingRecord(a),
			);

			await submit(a, "96475", {
				clientMetaData: { clientSessionId: "jti-1" },
			});

			// Without this the verify-time correlation has nothing to compare
			// against and every correlating site would see a mismatch.
			expect(db.updateAudioCaptchaRecord).toHaveBeenCalledWith(
				a.challenge,
				expect.objectContaining({
					clientMetaData: { clientSessionId: "jti-1" },
				}),
			);
		});
	});

	describe("serverVerifyAudioCaptchaSolution", () => {
		const dappAccount = DAPP_ACCOUNT;
		const challenge = "1234567___user___dappAccount___1";

		it("returns verified:false when the challenge record does not exist", async () => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(null);

			const result = await audioCaptchaManager.serverVerifyAudioCaptchaSolution(
				dappAccount,
				challenge,
				1000,
				mockEnv,
			);

			expect(result.verified).toBe(false);
		});

		it("throws when the stored result is not approved", async () => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				asAudioRecord({
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
				audioCaptchaManager.serverVerifyAudioCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				),
			).rejects.toBeInstanceOf(ProsopoApiError);
		});

		it("returns verified:false when the solution has already been server-checked", async () => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				asAudioRecord({
					challenge,
					dappAccount,
					result: { status: CaptchaStatus.approved },
					serverChecked: true,
				}),
			);

			const result = await audioCaptchaManager.serverVerifyAudioCaptchaSolution(
				dappAccount,
				challenge,
				1000,
				mockEnv,
			);

			expect(result.verified).toBe(false);
			expect(db.updateAudioCaptchaRecord).not.toHaveBeenCalled();
		});

		it("throws when the dappAccount on the record does not match", async () => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				asAudioRecord({
					challenge,
					dappAccount: "differentDapp",
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
				}),
			);

			await expect(
				audioCaptchaManager.serverVerifyAudioCaptchaSolution(
					dappAccount,
					challenge,
					1000,
					mockEnv,
				),
			).rejects.toThrow();
		});

		it("disapproves a solve the dapp server came back for too late", async () => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				asAudioRecord({
					challenge,
					dappAccount,
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
					submittedAtTimestamp: new Date(Date.now() - 120_000),
				}),
			);

			const result = await audioCaptchaManager.serverVerifyAudioCaptchaSolution(
				dappAccount,
				challenge,
				1000,
				mockEnv,
			);

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
	});

	describe("serverVerifyAudioCaptchaSolution client session correlation", () => {
		// clientSessionId is the last positional argument, after storeMetadata.
		const invoke = async (
			challenge: string,
			dappAccount: string,
			clientSessionId: string | undefined,
		) =>
			audioCaptchaManager.serverVerifyAudioCaptchaSolution(
				dappAccount,
				challenge,
				60_000,
				mockEnv,
				undefined, // ip
				undefined, // userAccessRulesStorage
				undefined, // email
				false, // spamEmailDomainCheckingEnabled
				undefined, // spamFilter
				undefined, // trafficFilter
				false, // storeMetadata
				clientSessionId,
			);

		const seedApprovedAudio = (
			challenge: string,
			dappAccount: string,
			clientMetaData?: ClientMetaData,
		) => {
			vi.mocked(db.getAudioCaptchaRecordByChallenge).mockResolvedValue(
				asAudioRecord({
					challenge: challenge as PoWChallengeId,
					dappAccount,
					userAccount: "user",
					answer: "96475",
					result: { status: CaptchaStatus.approved },
					serverChecked: false,
					headers: { a: "1" },
					...(clientMetaData && { clientMetaData }),
				}),
			);
			vi.mocked(db.updateAudioCaptchaRecord).mockResolvedValue(undefined);
			mockDecisionMachine(
				vi.fn().mockResolvedValue({
					decision: "allow",
					reason: undefined,
					score: 1,
				}),
			);
		};

		it("verifies when the recorded session id matches", async () => {
			const challenge = "10___u___dappAccount";
			seedApprovedAudio(challenge, DAPP_ACCOUNT, {
				clientSessionId: "jti-1",
			});

			const result = await invoke(challenge, DAPP_ACCOUNT, "jti-1");

			expect(result.verified).toBe(true);
		});

		it("rejects with CLIENT_SESSION_MISMATCH when the ids differ", async () => {
			const challenge = "11___u___dappAccount";
			seedApprovedAudio(challenge, DAPP_ACCOUNT, {
				clientSessionId: "jti-1",
			});

			const result = await invoke(challenge, DAPP_ACCOUNT, "jti-2");

			expect(result.verified).toBe(false);
			expect(db.updateAudioCaptchaRecord).toHaveBeenCalledWith(
				challenge,
				expect.objectContaining({
					result: {
						status: CaptchaStatus.disapproved,
						reason: ResultReason.CLIENT_SESSION_MISMATCH,
					},
				}),
			);
		});

		it("rejects when the solve carries no session id at all", async () => {
			const challenge = "12___u___dappAccount";
			seedApprovedAudio(challenge, DAPP_ACCOUNT);

			// A token minted outside the site's session, or by an older widget,
			// looks exactly like this.
			const result = await invoke(challenge, DAPP_ACCOUNT, "jti-1");

			expect(result.verified).toBe(false);
		});

		it("does not correlate when the dapp server sends no session id", async () => {
			const challenge = "13___u___dappAccount";
			seedApprovedAudio(challenge, DAPP_ACCOUNT, {
				clientSessionId: "jti-1",
			});

			const result = await invoke(challenge, DAPP_ACCOUNT, undefined);

			expect(result.verified).toBe(true);
		});
	});
});
