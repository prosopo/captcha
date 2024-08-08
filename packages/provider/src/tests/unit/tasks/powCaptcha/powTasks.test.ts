// Copyright 2021-2024 Prosopo (UK) Ltd.
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

import type { KeyringPair } from "@polkadot/keyring/types";
import { stringToHex, u8aToHex } from "@polkadot/util";
import { ProsopoEnvError } from "@prosopo/common";
import { ApiParams } from "@prosopo/types";
import type { Database } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	POW_SEPARATOR,
	PowCaptchaManager,
} from "../../../../tasks/powCaptcha/powTasks.js";
import {
	checkPowSignature,
	checkPowSolution,
	checkRecentPowSolution,
} from "../../../../tasks/powCaptcha/powTasksUtils.js";

vi.mock("@polkadot/util-crypto", () => ({
	signatureVerify: vi.fn(),
}));

vi.mock("@polkadot/util", () => ({
	u8aToHex: vi.fn(),
	stringToHex: vi.fn(),
}));

vi.mock("../../../../tasks/powCaptcha/powTasksUtils.js", () => ({
	checkRecentPowSolution: vi.fn(),
	checkPowSignature: vi.fn(),
	checkPowSolution: vi.fn(),
}));

describe("PowCaptchaManager", () => {
	let db: Database;
	let pair: KeyringPair;
	let powCaptchaManager: PowCaptchaManager;

	beforeEach(() => {
		db = {
			storePowCaptchaRecord: vi.fn(),
			getPowCaptchaRecordByChallenge: vi.fn(),
			updatePowCaptchaRecord: vi.fn(),
		} as unknown as Database;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		powCaptchaManager = new PowCaptchaManager(pair, db);

		vi.clearAllMocks();
	});

	describe("getPowCaptchaChallenge", () => {
		it("should generate a PoW captcha challenge", async () => {
			const userAccount = "userAccount";
			const dappAccount = "dappAccount";
			const origin = "origin";
			const challengeRegExp = new RegExp(
				`[0-9]+___${userAccount}___${dappAccount}`,
			);

			(pair.sign as any).mockReturnValueOnce("signedChallenge");
			(u8aToHex as any).mockReturnValueOnce("hexSignedChallenge");

			const result = await powCaptchaManager.getPowCaptchaChallenge(
				userAccount,
				dappAccount,
				origin,
			);

			expect(result.challenge.match(challengeRegExp)).toBeTruthy();
			expect(result.difficulty).toEqual(4);
			expect(result.signature).toEqual("hexSignedChallenge");
			expect(pair.sign).toHaveBeenCalledWith(stringToHex(result.challenge));
		});
	});

	describe("verifyPowCaptchaSolution", () => {
		it("should verify a valid PoW captcha solution", async () => {
			const timestamp = "testTimestamp";
			const userAccount = "testUserAccount";
			const challenge = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${pair.address}`;
			const difficulty = 4;
			const signature = "testSignature";
			const timestampSignature = "testTimestampSignature";
			const nonce = 12345;
			const timeout = 1000;

			(checkRecentPowSolution as any).mockImplementation(() => true);
			(checkPowSignature as any).mockImplementation(() => true);
			(checkPowSolution as any).mockImplementation(() => true);

			const result = await powCaptchaManager.verifyPowCaptchaSolution(
				challenge,
				difficulty,
				signature,
				nonce,
				timeout,
				timestampSignature,
			);

			expect(result).toBe(true);
			expect(checkRecentPowSolution).toHaveBeenCalledWith(challenge, timeout);
			expect(checkPowSignature).toHaveBeenCalledWith(
				timestamp,
				timestampSignature,
				userAccount,
				ApiParams.timestamp,
			);
			expect(checkPowSignature).toHaveBeenCalledWith(
				challenge,
				signature,
				pair.address,
				ApiParams.challenge,
			);
			expect(checkPowSolution).toHaveBeenCalledWith(
				nonce,
				challenge,
				difficulty,
			);
			expect(db.storePowCaptchaRecord).toHaveBeenCalledWith(challenge, false);
		});

		it("should throw an error if PoW captcha solution is invalid", async () => {
			const challenge = "testChallenge";
			const difficulty = 4;
			const signature = "testSignature";
			const nonce = 12345;
			const timeout = 1000;
			const timestampSignature = "testTimestampSignature";

			(checkRecentPowSolution as any).mockImplementation(() => {
				throw new ProsopoEnvError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
					context: {
						failedFuncName: "verifyPowCaptchaSolution",
					},
				});
			});

			await expect(
				powCaptchaManager.verifyPowCaptchaSolution(
					challenge,
					difficulty,
					signature,
					nonce,
					timeout,
					timestampSignature,
				),
			).rejects.toThrow(
				new ProsopoEnvError("CAPTCHA.INVALID_CAPTCHA_CHALLENGE", {
					context: {
						failedFuncName: "verifyPowCaptchaSolution",
					},
				}),
			);

			expect(checkRecentPowSolution).toHaveBeenCalledWith(challenge, timeout);
		});
	});

	describe("serverVerifyPowCaptchaSolution", () => {
		it("should verify a valid PoW captcha solution on the server", async () => {
			const dappAccount = "dappAccount";
			const challenge = "timestamp___userAccount___dappAccount";
			const timeout = 1000;
			const challengeRecord = {
				challenge,
				checked: false,
			};

			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			(checkRecentPowSolution as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
			);

			expect(result).toBe(true);
			expect(db.getPowCaptchaRecordByChallenge).toHaveBeenCalledWith(challenge);
			expect(checkRecentPowSolution).toHaveBeenCalledWith(challenge, timeout);
			expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(challenge, true);
		});

		it("should throw an error if challenge record is not found", async () => {
			const dappAccount = "dappAccount";
			const challenge = "timestamp___userAccount___dappAccount";
			const timeout = 1000;

			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(null);

			await expect(
				powCaptchaManager.serverVerifyPowCaptchaSolution(
					dappAccount,
					challenge,
					timeout,
				),
			).rejects.toThrow(
				new ProsopoEnvError("DATABASE.CAPTCHA_GET_FAILED", {
					context: {
						failedFuncName: "serverVerifyPowCaptchaSolution",
						challenge,
					},
				}),
			);

			expect(db.getPowCaptchaRecordByChallenge).toHaveBeenCalledWith(challenge);
		});
	});
});
