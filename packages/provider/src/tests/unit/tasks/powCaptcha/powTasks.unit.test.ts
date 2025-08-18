// Copyright 2021-2025 Prosopo (UK) Ltd.
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
	ApiParams,
	CaptchaStatus,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	type RequestHeaders,
} from "@prosopo/types";
import {
	type IProviderDatabase,
	IpAddressType,
	type PoWCaptchaStored,
} from "@prosopo/types-database";
import { getIPAddress, verifyRecency } from "@prosopo/util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompositeIpAddress } from "../../../../compositeIpAddress.js";
import { PowCaptchaManager } from "../../../../tasks/powCaptcha/powTasks.js";
import {
	checkPowSignature,
	validateSolution,
} from "../../../../tasks/powCaptcha/powTasksUtils.js";

vi.mock("@prosopo/util-crypto", () => ({
	signatureVerify: vi.fn(),
}));

vi.mock("@polkadot/util", () => ({
	u8aToHex: vi.fn(),
	stringToHex: vi.fn(),
}));

vi.mock(
	"@prosopo/util",
	async (
		importOriginal: () => // biome-ignore lint/suspicious/noExplicitAny: <explanation>
			| Record<string, any>
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			| PromiseLike<Record<string, any>>,
	) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const actual = (await importOriginal()) as Record<string, any>;
		return {
			...actual,
			verifyRecency: vi.fn(),
		};
	},
);

vi.mock("../../../../tasks/powCaptcha/powTasksUtils.js", () => ({
	checkPowSignature: vi.fn(),
	validateSolution: vi.fn(),
}));

describe("PowCaptchaManager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let powCaptchaManager: PowCaptchaManager;

	beforeEach(() => {
		db = {
			storePowCaptchaRecord: vi.fn(),
			getPowCaptchaRecordByChallenge: vi.fn(),
			updatePowCaptchaRecord: vi.fn(),
			markDappUserPoWCommitmentsChecked: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		powCaptchaManager = new PowCaptchaManager(db, pair);

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

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(pair.sign as any).mockReturnValueOnce("signedChallenge");
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(u8aToHex as any).mockReturnValueOnce("hexSignedChallenge");

			const result = await powCaptchaManager.getPowCaptchaChallenge(
				userAccount,
				dappAccount,
				origin,
			);

			expect(result.challenge.match(challengeRegExp)).toBeTruthy();
			expect(result.difficulty).toEqual(4);
			expect(result.providerSignature).toEqual("hexSignedChallenge");
			expect(pair.sign).toHaveBeenCalledWith(stringToHex(result.challenge));
		});
	});

	describe("verifyPowCaptchaSolution", () => {
		it("should verify a valid PoW captcha solution", async () => {
			const requestedAtTimestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${requestedAtTimestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${pair.address}`;
			const difficulty = 4;
			const providerSignature = "testSignature";
			const userSignature = "testTimestampSignature";
			const nonce = 12345;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty,
				dappAccount: pair.address,
				userAccount,
				requestedAtTimestamp,
				result: { status: CaptchaStatus.pending },
				userSubmitted: false,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature,
				lastUpdatedTimestamp: Date.now(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(checkPowSignature as any).mockImplementation(() => true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(validateSolution as any).mockImplementation(() => true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.updatePowCaptchaRecord as any).mockResolvedValue(true); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.markDappUserPoWCommitmentsChecked as any).mockResolvedValue(true);

			const verifyPowCaptchaSolutionArgs: Parameters<
				typeof powCaptchaManager.verifyPowCaptchaSolution
			> = [
				challenge,
				providerSignature,
				nonce,
				timeout,
				userSignature,
				ipAddress,
				headers,
			];

			const result = await powCaptchaManager.verifyPowCaptchaSolution(
				...verifyPowCaptchaSolutionArgs,
			);

			expect(result).toBe(true);

			// Will cause build to fail if args change
			const verifyRecencyArgs: Parameters<typeof verifyRecency> = [
				challenge,
				timeout,
			];

			expect(verifyRecency).toHaveBeenCalledWith(...verifyRecencyArgs);

			const checKPowSignatureArgs1: Parameters<typeof checkPowSignature> = [
				requestedAtTimestamp.toString(),
				userSignature,
				userAccount,
				ApiParams.timestamp,
			];

			expect(checkPowSignature).toHaveBeenCalledWith(...checKPowSignatureArgs1);

			const checKPowSignatureArgs2: Parameters<typeof checkPowSignature> = [
				challenge,
				providerSignature,
				pair.address,
				ApiParams.challenge,
			];

			expect(checkPowSignature).toHaveBeenCalledWith(...checKPowSignatureArgs2);

			const validateSolutionArgs: Parameters<typeof validateSolution> = [
				nonce,
				challenge,
				difficulty,
			];

			expect(validateSolution).toHaveBeenCalledWith(...validateSolutionArgs);

			const updatePowCaptchaRecordArgs: Parameters<
				typeof db.updatePowCaptchaRecord
			> = [
				challenge,
				{ status: CaptchaStatus.approved },
				false,
				true,
				userSignature,
			];

			expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(
				...updatePowCaptchaRecordArgs,
			);
		});

		it("should throw an error if PoW captcha solution is invalid", async () => {
			const challenge: PoWChallengeId = `${12345}${POW_SEPARATOR}userAccount${POW_SEPARATOR}dappAccount`;
			const difficulty = 4;
			const signature = "testSignature";
			const nonce = 12345;
			const timeout = 1000;
			const timestampSignature = "testTimestampSignature";
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			const challengeRecord: PoWCaptchaStored = {
				challenge,
				dappAccount: pair.address,
				userAccount: "testUserAccount",
				requestedAtTimestamp: 12345,
				result: { status: CaptchaStatus.pending },
				userSubmitted: false,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				difficulty,
				lastUpdatedTimestamp: 0,
			};
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => {
				return true;
			});

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(validateSolution as any).mockImplementation(() => false);

			expect(
				await powCaptchaManager.verifyPowCaptchaSolution(
					challenge,
					signature,
					nonce,
					timeout,
					timestampSignature,
					ipAddress,
					headers,
				),
			).toBe(false);

			expect(verifyRecency).toHaveBeenCalledWith(challenge, timeout);
		});
	});

	describe("serverVerifyPowCaptchaSolution", () => {
		it("should verify a valid PoW captcha solution on the server", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const challengeRecord: Partial<PoWCaptchaStored> = {
				challenge,
				dappAccount,
				userAccount,
				requestedAtTimestamp: timestamp,
				serverChecked: false,
				result: { status: CaptchaStatus.approved },
			};
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
			);

			expect(result.verified).toBe(true);
			expect(db.getPowCaptchaRecordByChallenge).toHaveBeenCalledWith(challenge);
			expect(verifyRecency).toHaveBeenCalledWith(challenge, timeout);

			const markDappUserPoWCommitmentsCheckedArgs: Parameters<
				typeof db.markDappUserPoWCommitmentsChecked
			> = [[challenge]];

			expect(db.markDappUserPoWCommitmentsChecked).toHaveBeenCalledWith(
				...markDappUserPoWCommitmentsCheckedArgs,
			);
		});

		it("should return verified:false if a challenge cannot be found", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456678;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(null);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
			);
			expect(result.verified).toBe(false);

			expect(db.getPowCaptchaRecordByChallenge).toHaveBeenCalledWith(challenge);
		});

		it("should return verified:false if an ip is received and it does not match the one on the challenge record", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = "8.8.8.8";
			const challengeRecord: Partial<PoWCaptchaStored> = {
				challenge,
				dappAccount,
				userAccount,
				requestedAtTimestamp: timestamp,
				serverChecked: false,
				result: { status: CaptchaStatus.approved },
				ipAddress: {
					lower: getIPAddress("1.1.1.1").bigInt(),
					type: IpAddressType.v4,
				},
			};
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				ipAddress,
			);

			expect(result.verified).toBe(false);
		});
	});
});
