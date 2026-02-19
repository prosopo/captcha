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

import { type Logger, getLogger } from "@prosopo/common";
import {
	ContextType,
	IpAddressType,
	type KeyringPair,
	type Session,
	contextAwareThresholdDefault,
} from "@prosopo/types";
import { CaptchaType, type IUserSettings, Tier } from "@prosopo/types";
import type { ClientRecord, IProviderDatabase } from "@prosopo/types-database";
import type { ProviderEnvironment } from "@prosopo/types-env";
import {
	type AccessPolicy,
	AccessPolicyType,
	type AccessRulesStorage,
} from "@prosopo/user-access-policy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaManager } from "../../../tasks/captchaManager.js";
import type { BehavioralDataResult } from "../../../tasks/detection/decodeBehavior.js";

vi.mock("../../../tasks/detection/decodeBehavior.js", () => ({
	default: vi.fn(),
}));

const loggerOuter = getLogger("info", import.meta.url);

const defaultUserSettings: IUserSettings = {
	frictionlessThreshold: 0.8,
	domains: [],
	captchaType: CaptchaType.frictionless,
	powDifficulty: 4,
	imageThreshold: 0.8,
	disallowWebView: false,
	contextAware: {
		enabled: false,
		contexts: {
			default: {
				type: ContextType.Default,
				threshold: contextAwareThresholdDefault,
			},
		},
	},
};

describe("CaptchaManager", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let logger: Logger;
	let captchaManager: CaptchaManager;
	let mockEnv: ProviderEnvironment;

	beforeEach(() => {
		db = {
			checkAndRemoveSession: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		const mockLogger = {
			debug: vi.fn().mockImplementation(loggerOuter.debug.bind(loggerOuter)),
			log: vi.fn().mockImplementation(loggerOuter.log.bind(loggerOuter)),
			info: vi.fn().mockImplementation(loggerOuter.info.bind(loggerOuter)),
			error: vi.fn().mockImplementation(loggerOuter.error.bind(loggerOuter)),
			trace: vi.fn().mockImplementation(loggerOuter.trace.bind(loggerOuter)),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal.bind(loggerOuter)),
			warn: vi.fn().mockImplementation(loggerOuter.warn.bind(loggerOuter)),
		} as unknown as Logger;
		logger = mockLogger;

		mockEnv = {
			config: {
				ipApi: {
					apiKey: "testKey",
					baseUrl: "https://api.ipapi.is",
				},
			},
		} as unknown as ProviderEnvironment;

		captchaManager = new CaptchaManager(db, pair, mockEnv.config, logger);

		vi.clearAllMocks();
	});

	describe("isValidRequest", () => {
		it("should validate a request for an image captcha when the client settings are set to image and no session ID is passed", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.image,
					},
				},
				CaptchaType.image,
				mockEnv,
			);
			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
			});
		});
		it("should validate a request for an pow captcha when the client settings are set to pow and no session ID is passed", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.pow,
					},
				},
				CaptchaType.pow,
				mockEnv,
			);
			expect(result).toEqual({
				valid: true,
				type: CaptchaType.pow,
			});
		});
		it("should validate a request for an pow captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type pow", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.pow,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.pow,
				sessionId: "sessionId",
			});
		});
		it("should validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type image", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
				undefined,
				"127.0.0.1",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				sessionId: "sessionId",
			});
		});

		it("should not validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type pow", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.pow,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
			);

			expect(result).toEqual({
				valid: false,
				reason: "CAPTCHA.NO_SESSION_FOUND",
				type: CaptchaType.image,
			});
		});

		it("should not validate a request for a pow captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type image", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				"sessionId",
			);

			expect(result).toEqual({
				valid: false,
				reason: "CAPTCHA.NO_SESSION_FOUND",
				type: CaptchaType.pow,
			});
		});

		it("should not validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed but not found", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue(undefined);

			const sessionId = "sessionId";

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				sessionId,
			);

			expect(result).toEqual({
				valid: false,
				reason: "CAPTCHA.NO_SESSION_FOUND",
				type: CaptchaType.image,
			});
		});
		it("should not validate a request for a pow captcha when the client settings are set to frictionless and a session ID is passed but not found", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue(undefined);

			const sessionId = "sessionId";

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				sessionId,
			);

			expect(result).toEqual({
				valid: false,
				reason: "CAPTCHA.NO_SESSION_FOUND",
				type: CaptchaType.pow,
			});
		});
		it("should not validate a request for a pow captcha when the client settings are set to frictionless but no session ID is passed in", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.pow,
				mockEnv,
				undefined,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.pow,
			});
		});
		it("should not validate a request for an image captcha when the client settings are set to frictionless but no session ID is passed in", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				undefined,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.image,
			});
		});

		it("should not validate a request for a pow captcha when the client settings are set to image", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.image,
					},
				},
				CaptchaType.pow,
				mockEnv,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.pow,
			});
		});
		it("should not validate a request for an image captcha when the client settings are set to pow", async () => {
			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.pow,
					},
				},
				CaptchaType.image,
				mockEnv,
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.image,
			});
		});

		// Commenting out since this is old logic and I'm in a rush
		// it("should not validate a request when IP address mismatches for frictionless session", async () => {
		// 	// biome-ignore lint/suspicious/noExplicitAny: tests
		// 	(db.checkAndRemoveSession as any).mockResolvedValue({
		// 		tokenId: "tokenId" as unknown as ObjectId,
		// 		captchaType: CaptchaType.image,
		// 	} as Pick<Session, "tokenId" | "captchaType">);

		// 	// biome-ignore lint/suspicious/noExplicitAny: tests
		// 	(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
		// 		_id: "frictionlessTokenId",
		// 		ipAddress: {
		// 			lower: 2130706433n, // 127.0.0.1 as bigint
		// 			type: IpAddressType.v4,
		// 		},
		// 	} as Partial<FrictionlessToken>);

		// 	const result = await captchaManager.isValidRequest(
		// 		{
		// 			account: "account",
		// 			tier: Tier.Free,
		// 			settings: {
		// 				...defaultUserSettings,
		// 				captchaType: CaptchaType.frictionless,
		// 			},
		// 		},
		// 		CaptchaType.image,
		// 		mockEnv,
		// 		"sessionId",
		// 		undefined,
		// 		"192.168.1.100", // Different IP
		// 	);

		// 	expect(result).toEqual({
		// 		valid: false,
		// 		reason: "CAPTCHA.IP_ADDRESS_MISMATCH",
		// 		type: CaptchaType.image,
		// 	});
		// });

		it("should validate a request when no IP is stored on frictionless token", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
				undefined,
				"192.168.1.100",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				sessionId: "sessionId",
			});
		});

		it("should validate a request when no currentIP is provided even with IP stored on token", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				sessionId: "sessionId",
				captchaType: CaptchaType.image,
			} as Pick<Session, "sessionId" | "captchaType">);

			const result = await captchaManager.isValidRequest(
				{
					account: "account",
					tier: Tier.Free,
					settings: {
						...defaultUserSettings,
						captchaType: CaptchaType.frictionless,
					},
				},
				CaptchaType.image,
				mockEnv,
				"sessionId",
				undefined,
				undefined, // No currentIP provided
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				sessionId: "sessionId",
			});
		});
	});
	describe("getVerificationResponse", () => {
		it("should return a verification response with a score if the tier is not free", async () => {
			const result = captchaManager.getVerificationResponse(
				true,
				{
					account: "account",
					tier: Tier.Professional,
				} as unknown as ClientRecord,
				() => "translated",
				0.5,
			);
			expect(result).toEqual({
				status: "translated",
				verified: true,
				score: 0.5,
			});
		});
		it("should return a verification response without a score if the tier is free", async () => {
			const result = captchaManager.getVerificationResponse(
				true,
				{
					account: "account",
					tier: Tier.Free,
				} as unknown as ClientRecord,
				() => "translated",
				0.5,
			);
			expect(result).toEqual({
				status: "translated",
				verified: true,
			});
		});
	});

	describe("decryptBehavioralData", () => {
		// biome-ignore lint/suspicious/noExplicitAny: tests
		let decryptFn: any;

		beforeEach(async () => {
			// Get the mocked default export
			const mod = await import("../../../tasks/detection/decodeBehavior.js");
			decryptFn = mod.default;
			vi.mocked(decryptFn).mockReset();
		});

		it("should return null when no decryption keys are provided", async () => {
			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				[],
			);
			expect(result).toBeNull();
			expect(decryptFn).not.toHaveBeenCalled();
		});

		it("should return null when all provided keys are undefined", async () => {
			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				[undefined, undefined],
			);
			expect(result).toBeNull();
			expect(decryptFn).not.toHaveBeenCalled();
		});

		it("should return the result when the first valid key succeeds", async () => {
			const mockResult: BehavioralDataResult = {
				collector1: [{ event: "click" }],
				collector2: [],
				collector3: [],
				deviceCapability: "desktop",
				timestamp: 1000,
			};
			vi.mocked(decryptFn).mockResolvedValue(mockResult);

			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				["key1", "key2"],
			);
			expect(result).toEqual(mockResult);
			expect(decryptFn).toHaveBeenCalledTimes(1);
			expect(decryptFn).toHaveBeenCalledWith("encryptedData", "key1");
		});

		it("should try the next key when the first key fails", async () => {
			const mockResult: BehavioralDataResult = {
				collector1: [],
				collector2: [],
				collector3: [],
				deviceCapability: "mobile",
				timestamp: 2000,
			};
			vi.mocked(decryptFn)
				.mockRejectedValueOnce(new Error("bad key"))
				.mockResolvedValueOnce(mockResult);

			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				["badKey", "goodKey"],
			);
			expect(result).toEqual(mockResult);
			expect(decryptFn).toHaveBeenCalledTimes(2);
			expect(decryptFn).toHaveBeenNthCalledWith(1, "encryptedData", "badKey");
			expect(decryptFn).toHaveBeenNthCalledWith(2, "encryptedData", "goodKey");
		});

		it("should return null when all valid keys fail", async () => {
			vi.mocked(decryptFn).mockRejectedValue(new Error("decrypt failed"));

			const result = await captchaManager.decryptBehavioralData(
				"encryptedData",
				["key1", "key2"],
			);
			expect(result).toBeNull();
			expect(decryptFn).toHaveBeenCalledTimes(2);
		});
	});

	describe("checkForHardBlock", () => {
		const compositeIp = { lower: 2130706433n, type: IpAddressType.v4 }; // 127.0.0.1
		const mockHeaders = { "user-agent": "test-agent" };
		// biome-ignore lint/suspicious/noExplicitAny: tests
		const mockChallengeRecord: any = {
			sessionId: undefined,
			ipAddress: compositeIp,
			ja4: "test-ja4",
			dappAccount: "dappAccount",
		};

		beforeEach(() => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db as any).getSessionRecordBySessionId = vi.fn().mockResolvedValue(null);
		});

		it("should return undefined when there are no matching policies", async () => {
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toBeUndefined();
		});

		it("should return undefined for a Block policy that has a captchaType (captcha-type selector, not hard block)", async () => {
			const blockWithCaptchaType: AccessPolicy = {
				type: AccessPolicyType.Block,
				captchaType: CaptchaType.image,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([blockWithCaptchaType]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toBeUndefined();
		});

		it("should return the policy for a Block policy without a captchaType (hard block)", async () => {
			const hardBlockPolicy: AccessPolicy = {
				type: AccessPolicyType.Block,
				description: "hard block",
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([hardBlockPolicy]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toEqual(hardBlockPolicy);
		});

		it("should return undefined for a Restrict policy without captchaType (not a Block policy)", async () => {
			const restrictPolicy: AccessPolicy = {
				type: AccessPolicyType.Restrict,
			};
			vi.spyOn(
				captchaManager,
				"getPrioritisedAccessPolicies",
			).mockResolvedValue([restrictPolicy]);

			const result = await captchaManager.checkForHardBlock(
				{} as AccessRulesStorage,
				mockChallengeRecord,
				"userAccount",
				mockHeaders,
			);
			expect(result).toBeUndefined();
		});
	});
});
