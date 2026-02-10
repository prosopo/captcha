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
	ApiParams,
	CaptchaStatus,
	CaptchaType,
	type KeyringPair,
	POW_SEPARATOR,
	type PoWChallengeId,
	type RequestHeaders,
} from "@prosopo/types";
import type {
	BehavioralDataPacked,
	IProviderDatabase,
	PoWCaptchaStored,
	Session,
} from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	AccessPolicyType,
	type AccessRulesStorage,
} from "@prosopo/user-access-policy";
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
	let mockEnv: ProviderEnvironment;

	beforeEach(() => {
		db = {
			storePowCaptchaRecord: vi.fn(),
			getPowCaptchaRecordByChallenge: vi.fn(),
			updatePowCaptchaRecordResult: vi.fn(),
			updatePowCaptchaRecord: vi.fn(),
			markDappUserPoWCommitmentsChecked: vi.fn(),
			getClientRecord: vi.fn(),
			getSessionRecordBySessionId: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		mockEnv = {
			config: {
				ipApi: {
					apiKey: "testKey",
					baseUrl: "https://api.ipapi.is",
				},
			},
		} as unknown as ProviderEnvironment;

		powCaptchaManager = new PowCaptchaManager(db, pair, mockEnv.config);

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
				requestedAtTimestamp: new Date(requestedAtTimestamp),
				result: { status: CaptchaStatus.pending },
				userSubmitted: false,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature,
				lastUpdatedTimestamp: new Date(),
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
			(db.updatePowCaptchaRecordResult as any).mockResolvedValue(true); // biome-ignore lint/suspicious/noExplicitAny: TODO fix
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
				undefined, // salt (optional)
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
				typeof db.updatePowCaptchaRecordResult
			> = [
				challenge,
				{ status: CaptchaStatus.approved },
				false,
				true,
				userSignature,
				undefined, // coords (optional)
			];

			expect(db.updatePowCaptchaRecordResult).toHaveBeenCalledWith(
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
				requestedAtTimestamp: new Date(12345),
				result: { status: CaptchaStatus.pending },
				userSubmitted: false,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				difficulty,
				lastUpdatedTimestamp: new Date(0),
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
					undefined, // salt (optional)
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
				requestedAtTimestamp: new Date(timestamp),
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
				mockEnv,
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
				mockEnv,
			);
			expect(result.verified).toBe(false);

			expect(db.getPowCaptchaRecordByChallenge).toHaveBeenCalledWith(challenge);
		});

		it("should return verified:false when user is blocked by access policy", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			const sessionId = "test-session-id";
			const decryptedHeadHash = "abc123def456";

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				sessionId,
			};

			const sessionRecord: Session = {
				sessionId,
				createdAt: new Date(),
				token: "test-token",
				score: 0.5,
				threshold: 0.5,
				scoreComponents: { baseScore: 0.5 },
				providerSelectEntropy: 13337,
				ipAddress: getCompositeIpAddress(ipAddress),
				captchaType: CaptchaType.pow,
				webView: false,
				iFrame: false,
				decryptedHeadHash,
			};

			// Mock the user access rules storage with a Block policy (no captchaType = hard block)
			const mockAccessRulesStorage: AccessRulesStorage = {
				findRules: vi.fn().mockResolvedValue([
					{
						type: AccessPolicyType.Block,
						headHash: decryptedHeadHash,
						// No captchaType - this should be treated as hard block
					},
				]),
				insertRules: vi.fn(),
				deleteRules: vi.fn(),
				deleteAllRules: vi.fn(),
				fetchRules: vi.fn(),
				getMissingRuleIds: vi.fn(),
				findRuleIds: vi.fn(),
				fetchAllRuleIds: vi.fn(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getSessionRecordBySessionId as any) = vi
				.fn()
				.mockResolvedValue(sessionRecord);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
				undefined, // ip
				mockAccessRulesStorage,
			);

			expect(result.verified).toBe(false);
		});

		it("should not block when access policy has captchaType (not a hard block)", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			const sessionId = "test-session-id";
			const decryptedHeadHash = "abc123def456";

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				sessionId,
			};

			const sessionRecord: Session = {
				sessionId,
				createdAt: new Date(),
				token: "test-token",
				score: 0.5,
				threshold: 0.5,
				scoreComponents: { baseScore: 0.5 },
				providerSelectEntropy: 13337,
				ipAddress: getCompositeIpAddress(ipAddress),
				captchaType: CaptchaType.pow,
				webView: false,
				iFrame: false,
				decryptedHeadHash,
			};

			// Mock the user access rules storage with a Block policy that has captchaType
			// This should NOT be treated as a hard block
			const mockAccessRulesStorage: AccessRulesStorage = {
				findRules: vi.fn().mockResolvedValue([
					{
						type: AccessPolicyType.Block,
						headHash: decryptedHeadHash,
						captchaType: CaptchaType.image, // Has captchaType - should be ignored for hard blocking
					},
				]),
				insertRules: vi.fn(),
				deleteRules: vi.fn(),
				deleteAllRules: vi.fn(),
				fetchRules: vi.fn(),
				getMissingRuleIds: vi.fn(),
				findRuleIds: vi.fn(),
				fetchAllRuleIds: vi.fn(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getSessionRecordBySessionId as any) = vi
				.fn()
				.mockResolvedValue(sessionRecord);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
				undefined, // ip
				mockAccessRulesStorage,
			);

			// Should pass since the Block policy has captchaType (not a hard block)
			expect(result.verified).toBe(true);
		});

		it("should verify successfully when no blocking access policy exists", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
			};

			// Mock the user access rules storage with empty rules (no blocking policy)
			const mockAccessRulesStorage: AccessRulesStorage = {
				findRules: vi.fn().mockResolvedValue([]),
				insertRules: vi.fn(),
				deleteRules: vi.fn(),
				deleteAllRules: vi.fn(),
				fetchRules: vi.fn(),
				getMissingRuleIds: vi.fn(),
				findRuleIds: vi.fn(),
				fetchAllRuleIds: vi.fn(),
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
				mockEnv,
				undefined, // ip
				mockAccessRulesStorage,
			);

			expect(result.verified).toBe(true);
		});
	});

	describe("serverVerifyPowCaptchaSolution with decision machine", () => {
		it("should allow when decision machine returns allow", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			const behavioralDataPacked: BehavioralDataPacked = {
				c1: [1, 2, 3],
				c2: [4, 5, 6],
				c3: [7, 8, 9],
				d: "test-device",
			};

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				behavioralDataPacked,
				deviceCapability: "test-device",
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
				mockEnv,
			);

			expect(result.verified).toBe(true);
		});

		it("should deny when decision machine returns deny", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			const behavioralDataPacked: BehavioralDataPacked = {
				c1: [1, 2, 3],
				c2: [4, 5, 6],
				c3: [7, 8, 9],
				d: "suspicious-device",
			};

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				behavioralDataPacked,
				deviceCapability: "suspicious-device",
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.updatePowCaptchaRecord as any).mockResolvedValue(undefined);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			// Mock decision machine to deny based on device capability
			const originalDecide =
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				(powCaptchaManager as any).decisionMachineRunner.decide;
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = vi
				.fn()
				.mockResolvedValue({
					decision: "deny",
					reason: "Suspicious device detected",
					score: 0,
				});

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
			);

			expect(result.verified).toBe(false);

			// Restore original decision machine
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = originalDecide;
		});

		it("should allow when no behavioral data is present (no decision machine run)", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				// No behavioralDataPacked - decision machine should not run
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
				mockEnv,
			);

			expect(result.verified).toBe(true);
		});

		it("should default to allow if decision machine fails", async () => {
			const dappAccount = "dappAccount";
			const timestamp = 123456789;
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}`;
			const timeout = 1000;
			const ipAddress = getIPAddress("1.1.1.1");
			const headers: RequestHeaders = { a: "1", b: "2", c: "3" };
			const behavioralDataPacked: BehavioralDataPacked = {
				c1: [1, 2, 3],
				c2: [4, 5, 6],
				c3: [7, 8, 9],
				d: "test-device",
			};

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				behavioralDataPacked,
				deviceCapability: "test-device",
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			// Mock decision machine to throw an error
			const originalDecide =
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				(powCaptchaManager as any).decisionMachineRunner.decide;
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = vi
				.fn()
				.mockRejectedValue(new Error("Decision machine error"));

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
			);

			// Should default to allow on error
			expect(result.verified).toBe(true);

			// Restore original decision machine
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = originalDecide;
		});
	});

	describe("IP Validation Guard Conditions", () => {
		it("should skip IP validation when ipValidationRules is undefined", async () => {
			const dappAccount = "testDappAccount";
			const userAccount = "testUserAccount";
			const challenge: PoWChallengeId = `123456789${POW_SEPARATOR}userAccount${POW_SEPARATOR}${pair.address}`;
			const timeout = 1000;
			const ip = "1.1.1.1";

			const challengeRecord: PoWCaptchaStored = {
				dappAccount,
				userAccount,
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				challenge,
				serverChecked: false,
				difficulty: 4,
				requestedAtTimestamp: new Date(),
				ipAddress: getCompositeIpAddress(ip),
				headers: { a: "1", b: "2", c: "3" },
				ja4: "ja4",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getClientRecord as any).mockResolvedValue({
				settings: {
					// ipValidationRules is undefined
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(checkPowSignature as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(validateSolution as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
				ip,
			);

			// Should succeed without IP validation
			expect(result.verified).toBe(true);
			// updatePowCaptchaRecord should only be called once for providedIp, not for IP validation failure
			expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(challenge, {
				providedIp: getCompositeIpAddress(ip),
			});
		});

		it("should skip IP validation when ipValidationRules.enabled is false", async () => {
			const dappAccount = pair.address;
			const challenge: PoWChallengeId = `123456789${POW_SEPARATOR}userAccount${POW_SEPARATOR}${pair.address}`;
			const timeout = 1000;
			const ip = "1.1.1.1";

			const challengeRecord: PoWCaptchaStored = {
				userAccount: "userAccount",
				challenge,
				serverChecked: false,
				difficulty: 4,
				dappAccount,
				result: {
					status: CaptchaStatus.approved,
				},
				requestedAtTimestamp: new Date(),
				ipAddress: getCompositeIpAddress(ip),
				headers: { a: "1", b: "2", c: "3" },
				ja4: "ja4",
				providerSignature: "testSignature",
				userSubmitted: true,
				lastUpdatedTimestamp: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getClientRecord as any).mockResolvedValue({
				settings: {
					ipValidationRules: {
						enabled: false, // Explicitly disabled
						actions: {
							countryChangeAction: "reject",
							cityChangeAction: "reject",
						},
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(checkPowSignature as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(validateSolution as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
				ip,
			);

			// Should succeed without IP validation even though rules are configured
			expect(result.verified).toBe(true);
			expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(challenge, {
				providedIp: getCompositeIpAddress(ip),
			});
		});

		it("should skip IP validation when ipValidationRules.enabled is undefined", async () => {
			const dappAccount = pair.address;
			const challenge: PoWChallengeId = `123456789${POW_SEPARATOR}userAccount${POW_SEPARATOR}${pair.address}`;
			const timeout = 1000;
			const ip = "1.1.1.1";

			const challengeRecord: PoWCaptchaStored = {
				dappAccount,
				challenge,
				serverChecked: false,
				difficulty: 4,
				result: {
					status: CaptchaStatus.approved,
				},
				requestedAtTimestamp: new Date(),
				ipAddress: getCompositeIpAddress(ip),
				userAccount: "userAccount",
				headers: { a: "1", b: "2", c: "3" },
				ja4: "ja4",
				providerSignature: "testSignature",
				userSubmitted: true,
				lastUpdatedTimestamp: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getClientRecord as any).mockResolvedValue({
				settings: {
					ipValidationRules: {
						// enabled field is missing/undefined
						actions: {
							countryChangeAction: "reject",
							cityChangeAction: "reject",
						},
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(checkPowSignature as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(validateSolution as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
				ip,
			);

			// Should succeed without IP validation when enabled is undefined
			expect(result.verified).toBe(true);
			expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(challenge, {
				providedIp: getCompositeIpAddress(ip),
			});
		});

		it("should skip IP validation when clientRecord is null", async () => {
			const dappAccount = pair.address;
			const challenge: PoWChallengeId = `123456789${POW_SEPARATOR}userAccount${POW_SEPARATOR}${pair.address}`;
			const timeout = 1000;
			const ip = "1.1.1.1";

			const challengeRecord: PoWCaptchaStored = {
				dappAccount,
				challenge,
				serverChecked: false,
				difficulty: 4,
				result: {
					status: CaptchaStatus.approved,
				},
				requestedAtTimestamp: new Date(),
				ipAddress: getCompositeIpAddress(ip),
				userAccount: "userAccount",
				headers: { a: "1", b: "2", c: "3" },
				ja4: "ja4",
				providerSignature: "testSignature",
				userSubmitted: true,
				lastUpdatedTimestamp: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getClientRecord as any).mockResolvedValue(null);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(checkPowSignature as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(validateSolution as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
				ip,
			);

			// Should succeed without IP validation when client record is null
			expect(result.verified).toBe(true);
			expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(challenge, {
				providedIp: getCompositeIpAddress(ip),
			});
		});

		it("should skip IP validation when no IP is provided", async () => {
			const dappAccount = pair.address;
			const challenge: PoWChallengeId = `123456789${POW_SEPARATOR}userAccount${POW_SEPARATOR}${pair.address}`;
			const timeout = 1000;

			const challengeRecord: PoWCaptchaStored = {
				dappAccount,
				challenge,
				serverChecked: false,
				difficulty: 4,
				result: {
					status: CaptchaStatus.approved,
				},
				requestedAtTimestamp: new Date(),
				ipAddress: getCompositeIpAddress("1.1.1.1"),
				userAccount: "userAccount",
				headers: { a: "1", b: "2", c: "3" },
				ja4: "ja4",
				providerSignature: "testSignature",
				userSubmitted: true,
				lastUpdatedTimestamp: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getClientRecord as any).mockResolvedValue({
				settings: {
					ipValidationRules: {
						enabled: true,
						actions: {
							countryChangeAction: "reject",
						},
					},
				},
			});
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(checkPowSignature as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(validateSolution as any).mockReturnValue(true);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			// No IP provided
			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
			);

			// Should succeed - no IP provided means IP validation is skipped
			expect(result.verified).toBe(true);
		});
	});

	describe("Decision machine with no-cache header and no behavioral data", () => {
		it("should deny when no-cache header is present and no behavioral data exists", async () => {
			const dappAccount = "5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm";
			const timestamp = 1770650564052;
			const userAccount = "5CBFuSD5rgzhwVLLtDsA1WbLVkfrrAMEHdbiBBuZ78QvcEpv";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}${POW_SEPARATOR}351147`;
			const timeout = 1000;
			const ipAddress = getIPAddress("81.159.254.145");

			// Headers matching the user's real-world scenario
			const headers: RequestHeaders = {
				host: "pronode2.prosopo.io",
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
				"content-length": "182",
				accept: "*/*",
				"accept-encoding": "gzip, deflate, br, zstd",
				"accept-language": "de,de-DE;q=0.9,en;q=0.8",
				"cache-control": "no-cache", // This is the key header
				"content-type": "application/json",
				dnt: "1",
				origin: "https://www.twickets.live",
				pragma: "no-cache",
				priority: "u=1, i",
				"prosopo-site-key": dappAccount,
				"prosopo-user": userAccount,
				referer: "https://www.twickets.live/",
				"sec-ch-ua":
					'"Google Chrome";v="126", "Chromium";v="126", "Not_A Brand";v="24"',
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": '"Windows"',
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "cross-site",
			};

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "t13d1516h2_8daaf6152771_02713d6af862",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				sessionId: "pronode2-6d5deeee-78f1-4af0-97b3-f070037438dd",
				// NOTE: No behavioralDataPacked - this is key to the test
			};

			// Decision machine source code matching the user's actual decision machine
			const decisionMachineSource = `
/**
 * Decision machine for blocking German requests with no-cache header
 */

function checkNoCacheNoBehavioural(headers, behavioralDataPacked) {
	const cacheControl =
		"cache-control" in headers ? headers["cache-control"] : "";

	const hasNoCache = cacheControl.toLowerCase().includes("no-cache");

	const hasNoBehavioralData =
		!behavioralDataPacked || behavioralDataPacked === "0";

	if (hasNoCache && hasNoBehavioralData) {
		return {
			decision: "deny",
			reason: "no-cache request with no behavioral data",
			score: 0,
			tags: ["blocked"],
		};
	}

	return null;
}

module.exports = (input) => {
	const {
		userAccount,
		dappAccount,
		captchaResult,
		headers,
		captchaType,
		countryCode,
		behavioralDataPacked,
	} = input;

	const noCacheNoBehavioural = checkNoCacheNoBehavioural(
		headers,
		behavioralDataPacked,
	);
	if (noCacheNoBehavioural) {
		return noCacheNoBehavioural;
	}

	if (captchaResult === "passed") {
		return {
			decision: "allow",
			reason: "Captcha verification successful",
			score: 100,
			tags: [\`captcha-type:\${captchaType || "unknown"}\`],
		};
	}

	return {
		decision: "deny",
		reason: "Captcha verification failed",
		score: 0,
		tags: ["blocked"],
	};
};
`;

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getSessionRecordBySessionId as any).mockResolvedValue(undefined);

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.updatePowCaptchaRecord as any).mockResolvedValue(undefined);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			// Mock the decision machine runner to use the real decision machine source
			const originalDecide =
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				(powCaptchaManager as any).decisionMachineRunner.decide;

			// Create a mock that executes the actual decision machine code
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = async (
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				input: any,
			) => {
				// Execute the decision machine source code

				const module = { exports: {} };
				// biome-ignore lint/security/noGlobalEval: This is a test
				const decideFn = eval(
					`(function() { ${decisionMachineSource}; return module.exports; })()`,
				);
				return decideFn(input);
			};

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
			);

			// The captcha should be DENIED because:
			// 1. cache-control header contains "no-cache"
			// 2. No behavioral data is present (behavioralDataPacked is undefined)
			expect(result.verified).toBe(false);
			expect(db.updatePowCaptchaRecord).toHaveBeenCalledWith(challenge, {
				result: {
					status: CaptchaStatus.disapproved,
					reason: "no-cache request with no behavioral data",
				},
			});

			// Restore original decision machine
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = originalDecide;
		});

		it("should allow when no-cache header is present but behavioral data exists", async () => {
			const dappAccount = "5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm";
			const timestamp = 1770650564052;
			const userAccount = "5CBFuSD5rgzhwVLLtDsA1WbLVkfrrAMEHdbiBBuZ78QvcEpv";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}${POW_SEPARATOR}351147`;
			const timeout = 1000;
			const ipAddress = getIPAddress("81.159.254.145");

			const headers: RequestHeaders = {
				"cache-control": "no-cache",
				"user-agent": "Mozilla/5.0",
			};

			const behavioralDataPacked: BehavioralDataPacked = {
				c1: [1, 2, 3],
				c2: [4, 5, 6],
				c3: [7, 8, 9],
				d: "test-device",
			};

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "t13d1516h2_8daaf6152771_02713d6af862",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				behavioralDataPacked, // Has behavioral data
				deviceCapability: "test-device",
			};

			const decisionMachineSource = `
function checkNoCacheNoBehavioural(headers, behavioralDataPacked) {
	const cacheControl =
		"cache-control" in headers ? headers["cache-control"] : "";
	const hasNoCache = cacheControl.toLowerCase().includes("no-cache");
	const hasNoBehavioralData =
		!behavioralDataPacked || behavioralDataPacked === "0";

	if (hasNoCache && hasNoBehavioralData) {
		return {
			decision: "deny",
			reason: "no-cache request with no behavioral data",
			score: 0,
			tags: ["blocked"],
		};
	}
	return null;
}

module.exports = (input) => {
	const noCacheNoBehavioural = checkNoCacheNoBehavioural(
		input.headers,
		input.behavioralDataPacked,
	);
	if (noCacheNoBehavioural) {
		return noCacheNoBehavioural;
	}

	if (input.captchaResult === "passed") {
		return {
			decision: "allow",
			reason: "Captcha verification successful",
			score: 100,
			tags: [\`captcha-type:\${input.captchaType || "unknown"}\`],
		};
	}

	return {
		decision: "deny",
		reason: "Captcha verification failed",
		score: 0,
		tags: ["blocked"],
	};
};
`;

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const originalDecide =
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				(powCaptchaManager as any).decisionMachineRunner.decide;

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = async (
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				input: any,
			) => {
				const module = { exports: {} };
				// biome-ignore lint/security/noGlobalEval: This is a test
				const decideFn = eval(
					`(function() { ${decisionMachineSource}; return module.exports; })()`,
				);
				return decideFn(input);
			};

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
			);

			// Should be allowed because behavioral data exists
			expect(result.verified).toBe(true);

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = originalDecide;
		});

		it("should allow when behavioral data is missing but no no-cache header", async () => {
			const dappAccount = "5EZVvsHMrKCFKp5NYNoTyDjTjetoVo1Z4UNNbTwJf1GfN6Xm";
			const timestamp = 1770650564052;
			const userAccount = "5CBFuSD5rgzhwVLLtDsA1WbLVkfrrAMEHdbiBBuZ78QvcEpv";
			const challenge: PoWChallengeId = `${timestamp}${POW_SEPARATOR}${userAccount}${POW_SEPARATOR}${dappAccount}${POW_SEPARATOR}351147`;
			const timeout = 1000;
			const ipAddress = getIPAddress("81.159.254.145");

			const headers: RequestHeaders = {
				"user-agent": "Mozilla/5.0",
				// No cache-control header
			};

			const challengeRecord: PoWCaptchaStored = {
				challenge,
				difficulty: 4,
				dappAccount,
				userAccount,
				requestedAtTimestamp: new Date(timestamp),
				result: { status: CaptchaStatus.approved },
				userSubmitted: true,
				serverChecked: false,
				ipAddress: getCompositeIpAddress(ipAddress),
				headers,
				ja4: "t13d1516h2_8daaf6152771_02713d6af862",
				providerSignature: "testSignature",
				lastUpdatedTimestamp: new Date(),
				// No behavioralDataPacked
			};

			const decisionMachineSource = `
function checkNoCacheNoBehavioural(headers, behavioralDataPacked) {
	const cacheControl =
		"cache-control" in headers ? headers["cache-control"] : "";
	const hasNoCache = cacheControl.toLowerCase().includes("no-cache");
	const hasNoBehavioralData =
		!behavioralDataPacked || behavioralDataPacked === "0";

	if (hasNoCache && hasNoBehavioralData) {
		return {
			decision: "deny",
			reason: "no-cache request with no behavioral data",
			score: 0,
			tags: ["blocked"],
		};
	}
	return null;
}

module.exports = (input) => {
	const noCacheNoBehavioural = checkNoCacheNoBehavioural(
		input.headers,
		input.behavioralDataPacked,
	);
	if (noCacheNoBehavioural) {
		return noCacheNoBehavioural;
	}

	if (input.captchaResult === "passed") {
		return {
			decision: "allow",
			reason: "Captcha verification successful",
			score: 100,
			tags: [\`captcha-type:\${input.captchaType || "unknown"}\`],
		};
	}

	return {
		decision: "deny",
		reason: "Captcha verification failed",
		score: 0,
		tags: ["blocked"],
	};
};
`;

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(db.getPowCaptchaRecordByChallenge as any).mockResolvedValue(
				challengeRecord,
			);
			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(verifyRecency as any).mockImplementation(() => true);

			const originalDecide =
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				(powCaptchaManager as any).decisionMachineRunner.decide;

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = async (
				// biome-ignore lint/suspicious/noExplicitAny: TODO fix
				input: any,
			) => {
				const module = { exports: {} };
				// biome-ignore lint/security/noGlobalEval: This is a test
				const decideFn = eval(
					`(function() { ${decisionMachineSource}; return module.exports; })()`,
				);
				return decideFn(input);
			};

			const result = await powCaptchaManager.serverVerifyPowCaptchaSolution(
				dappAccount,
				challenge,
				timeout,
				mockEnv,
			);

			// Should be allowed because no-cache header is missing
			expect(result.verified).toBe(true);

			// biome-ignore lint/suspicious/noExplicitAny: TODO fix
			(powCaptchaManager as any).decisionMachineRunner.decide = originalDecide;
		});
	});
});
