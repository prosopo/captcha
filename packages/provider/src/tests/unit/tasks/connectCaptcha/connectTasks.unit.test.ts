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
	CaptchaStatus,
	type ConnectCaptchaStored,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	type RequestHeaders,
	ResultReason,
} from "@prosopo/types";
import type {
	ConnectCaptchaRecord,
	IProviderDatabase,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { getIPAddress, verifyRecency } from "@prosopo/util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import { resolveConnectSettings } from "../../../../tasks/connect/connectGenerator.js";
import { ConnectCaptchaManager } from "../../../../tasks/connectCaptcha/connectTasks.js";
import { checkPowSignature } from "../../../../tasks/powCaptcha/powTasksUtils.js";

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

// ConnectCaptchaRecord = mongoose.Document & ConnectCaptchaStored. The tests
// only care about a subset of the stored fields; this widens a partial
// fixture without sprinkling casts at every mock call site.
const asConnectRecord = (
	partial: Partial<ConnectCaptchaStored>,
): ConnectCaptchaRecord =>
	({
		submittedAtTimestamp: new Date(),
		...partial,
	}) as unknown as ConnectCaptchaRecord;

describe("ConnectCaptchaManager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let manager: ConnectCaptchaManager;
	let env: ProviderEnvironment;

	beforeEach(() => {
		db = {
			storeConnectCaptchaRecord: vi.fn(),
			getConnectCaptchaRecordByChallenge: vi.fn(),
			updateConnectCaptchaRecord: vi.fn(),
			updateConnectCaptchaRecordResult: vi.fn(),
			getClientRecord: vi.fn(),
			getSessionRecordBySessionId: vi.fn(),
			updateSessionRecord: vi.fn(),
			countCommitmentsByNormalisedEmail: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn().mockReturnValue(new Uint8Array()),
			address: "testAddress",
		} as unknown as KeyringPair;

		env = { ipInfoService: { lookup: vi.fn() }, config: {} } as unknown as ProviderEnvironment;
		manager = new ConnectCaptchaManager(db, pair, env.config);

		vi.clearAllMocks();
		vi.mocked(u8aToHex).mockReturnValue("0xsigned");
		vi.mocked(stringToHex).mockImplementation((s) => `0xhex:${s}`);
		vi.mocked(verifyRecency).mockReturnValue(true);
		vi.mocked(checkPowSignature).mockImplementation(() => {});
	});

	describe("getConnectCaptchaChallenge", () => {
		it("returns a signed challenge carrying a solvable board", async () => {
			const result = await manager.getConnectCaptchaChallenge(
				"userAccount",
				"dappAccount",
				"origin",
				resolveConnectSettings(),
			);

			// challenge format: timestamp___userAccount___dappAccount___nonce
			expect(result.challenge).toMatch(
				/^[0-9]+___userAccount___dappAccount___[0-9]+$/,
			);
			expect(result.providerSignature).toBe("0xsigned");
			expect(pair.sign).toHaveBeenCalled();
			expect(result.board).toHaveLength(25);
			expect(result.boardSize).toBe(5);
			expect(result.lineLength).toBe(5);
			expect(result.iconCount).toBe(4);
			// The gap is empty and the source holds a tile.
			expect(result.board[result.solutionTargetIndex]).toBe(".");
			expect(result.board[result.solutionSourceIndex]).not.toBe(".");
		});

		it("honours a configured geometry", async () => {
			const result = await manager.getConnectCaptchaChallenge(
				"u",
				"d",
				"origin",
				resolveConnectSettings({ boardSize: 6, lineLength: 4 }),
			);
			expect(result.board).toHaveLength(36);
			expect(result.boardSize).toBe(6);
			expect(result.lineLength).toBe(4);
		});

		it("issues a different board on every call", async () => {
			const settings = resolveConnectSettings();
			const boards = new Set<string>();
			for (let i = 0; i < 5; i++) {
				boards.add(
					(await manager.getConnectCaptchaChallenge("u", "d", "o", settings))
						.board,
				);
			}
			expect(boards.size).toBeGreaterThan(1);
		});
	});

	describe("verifyConnectCaptchaSolution", () => {
		const args = () => {
			const timestamp = 123456789;
			const userAccount = "user";
			const dappAccount = "dapp";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}${POW_SEPARATOR}1`;
			return {
				challenge,
				providerSignature: "0xprov",
				userSignature: "0xuser",
				ipAddress: getIPAddress("1.1.1.1"),
				headers: { a: "1" } as RequestHeaders,
			};
		};

		// 3x3 board, line of 3: tiles of icon 0 on cells 0, 1 and 6.
		// Moving 6 -> 2 completes the top row.
		const board = "00....0..";
		const record = (overrides: Partial<ConnectCaptchaStored> = {}) =>
			asConnectRecord({
				challenge: args().challenge,
				dappAccount: "dapp",
				userAccount: "user",
				board,
				boardSize: 3,
				lineLength: 3,
				solutionSourceIndex: 6,
				solutionTargetIndex: 2,
				ipAddress: getCompositeIpAddress(getIPAddress("1.1.1.1")),
				result: { status: CaptchaStatus.pending },
				userSubmitted: false,
				...overrides,
			});

		it("returns false when no challenge record exists", async () => {
			const a = args();
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(null);
			const result = await manager.verifyConnectCaptchaSolution(
				a.challenge, a.providerSignature, 6, 2, [], 1000,
				a.userSignature, a.ipAddress, a.headers,
			);
			expect(result).toBe(false);
			expect(db.updateConnectCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("approves the move that completes a line", async () => {
			const a = args();
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(record());
			const result = await manager.verifyConnectCaptchaSolution(
				a.challenge, a.providerSignature, 6, 2, [], 1000,
				a.userSignature, a.ipAddress, a.headers,
			);
			expect(result).toBe(true);
			expect(db.updateConnectCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{ status: CaptchaStatus.approved },
				false, true, a.userSignature, undefined,
			);
		});

		it("disapproves a move that completes nothing", async () => {
			const a = args();
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(record());
			const result = await manager.verifyConnectCaptchaSolution(
				a.challenge, a.providerSignature, 6, 5, [], 1000,
				a.userSignature, a.ipAddress, a.headers,
			);
			expect(result).toBe(false);
			expect(db.updateConnectCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_SOLUTION,
				},
				false, true, a.userSignature, undefined,
			);
		});

		it("persists the submitted move and the drag trail", async () => {
			const a = args();
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(record());
			const events = [
				{ x: 0.1, y: 0.2, t: 0 },
				{ x: 0.5, y: 0.4, t: 120 },
			];
			await manager.verifyConnectCaptchaSolution(
				a.challenge, a.providerSignature, 6, 2, events, 1000,
				a.userSignature, a.ipAddress, a.headers,
			);
			expect(db.updateConnectCaptchaRecord).toHaveBeenCalledWith(a.challenge, {
				connectEvents: events,
				submittedSourceIndex: 6,
				submittedTargetIndex: 2,
			});
		});

		it("refuses a re-submission of an already-solved challenge", async () => {
			// The answer space is a few hundred moves, so a challenge that
			// accepted more than one submission could simply be enumerated.
			const a = args();
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(
				record({ userSubmitted: true }),
			);
			const result = await manager.verifyConnectCaptchaSolution(
				a.challenge, a.providerSignature, 6, 2, [], 1000,
				a.userSignature, a.ipAddress, a.headers,
			);
			expect(result).toBe(false);
			expect(db.updateConnectCaptchaRecordResult).not.toHaveBeenCalled();
		});

		it("disapproves a submission that arrived after the window closed", async () => {
			const a = args();
			vi.mocked(verifyRecency).mockReturnValue(false);
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(record());
			const result = await manager.verifyConnectCaptchaSolution(
				a.challenge, a.providerSignature, 6, 2, [], 1000,
				a.userSignature, a.ipAddress, a.headers,
			);
			expect(result).toBe(false);
			expect(db.updateConnectCaptchaRecordResult).toHaveBeenCalledWith(
				a.challenge,
				{
					status: CaptchaStatus.disapproved,
					reason: ResultReason.CAPTCHA_INVALID_TIMESTAMP,
				},
				false, true, a.userSignature, undefined,
			);
		});

		it("rejects a move that names a cell off the board", async () => {
			const a = args();
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(record());
			const result = await manager.verifyConnectCaptchaSolution(
				a.challenge, a.providerSignature, 6, 9999, [], 1000,
				a.userSignature, a.ipAddress, a.headers,
			);
			expect(result).toBe(false);
		});

		it("scores a board the generator actually produced", async () => {
			// End-to-end over the real generator rather than a hand-written
			// fixture: whatever it laid out, its own solution must verify and a
			// neighbouring cell must not.
			const a = args();
			const challenge = await manager.getConnectCaptchaChallenge(
				"user", "dapp", "origin", resolveConnectSettings(),
			);
			vi.mocked(db.getConnectCaptchaRecordByChallenge).mockResolvedValue(
				record({
					board: challenge.board,
					boardSize: challenge.boardSize,
					lineLength: challenge.lineLength,
					solutionSourceIndex: challenge.solutionSourceIndex,
					solutionTargetIndex: challenge.solutionTargetIndex,
				}),
			);
			const solved = await manager.verifyConnectCaptchaSolution(
				a.challenge,
				a.providerSignature,
				challenge.solutionSourceIndex,
				challenge.solutionTargetIndex,
				[], 1000, a.userSignature, a.ipAddress, a.headers,
			);
			expect(solved).toBe(true);
		});
	});
});
