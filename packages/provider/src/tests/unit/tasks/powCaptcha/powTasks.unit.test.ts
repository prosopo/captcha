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
});
