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

import { type Logger, getLogger } from "@prosopo/common";
import type { KeyringPair } from "@prosopo/types";
import { CaptchaType, type IUserSettings, Tier } from "@prosopo/types";
import {
	type ClientRecord,
	type FrictionlessToken,
	type IProviderDatabase,
	IpAddressType,
	type Session,
} from "@prosopo/types-database";
import type { ObjectId } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaManager } from "../../../tasks/captchaManager.js";
import { ProviderEnvironment } from "@prosopo/types-env";

const loggerOuter = getLogger("info", import.meta.url);

const defaultUserSettings: IUserSettings = {
	frictionlessThreshold: 0.8,
	domains: [],
	captchaType: CaptchaType.frictionless,
	powDifficulty: 4,
	imageThreshold: 0.8,
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
			getFrictionlessTokenRecordByTokenId: vi.fn(),
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

		captchaManager = new CaptchaManager(db, pair, logger);

		mockEnv = {
			ipApiKey: "testKey",
			ipApiUrl: "https://api.ipapi.is",
		} as unknown as ProviderEnvironment;

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
				tokenId: "tokenId" as unknown as ObjectId,
				captchaType: CaptchaType.pow,
			} as Pick<Session, "tokenId" | "captchaType">);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
				ipAddress: {
					lower: 2130706433n, // 127.0.0.1 as bigint
					type: IpAddressType.v4,
				},
			} as Partial<FrictionlessToken>);

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
				frictionlessTokenId: "frictionlessTokenId",
			});
		});
		it("should validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type image", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				tokenId: "tokenId" as unknown as ObjectId,
				captchaType: CaptchaType.image,
			} as Pick<Session, "tokenId" | "captchaType">);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
				ipAddress: {
					lower: 2130706433n, // 127.0.0.1 as bigint
					type: IpAddressType.v4,
				},
			} as Partial<FrictionlessToken>);

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
				frictionlessTokenId: "frictionlessTokenId",
			});
		});

		it("should not validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed and found with captcha type pow", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				tokenId: "tokenId" as unknown as ObjectId,
				captchaType: CaptchaType.pow,
			} as Pick<Session, "tokenId" | "captchaType">);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
			});

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
				tokenId: "tokenId" as unknown as ObjectId,
				captchaType: CaptchaType.image,
			} as Pick<Session, "tokenId">);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
			});

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

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
			});

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

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
			});

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

		it("should not validate a request when IP address mismatches for frictionless session", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				tokenId: "tokenId" as unknown as ObjectId,
				captchaType: CaptchaType.image,
			} as Pick<Session, "tokenId" | "captchaType">);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
				ipAddress: {
					lower: 2130706433n, // 127.0.0.1 as bigint
					type: IpAddressType.v4,
				},
			} as Partial<FrictionlessToken>);

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
				"192.168.1.100", // Different IP
			);

			expect(result).toEqual({
				valid: false,
				reason: "CAPTCHA.IP_ADDRESS_MISMATCH",
				type: CaptchaType.image,
			});
		});

		it("should validate a request when no IP is stored on frictionless token", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				tokenId: "tokenId" as unknown as ObjectId,
				captchaType: CaptchaType.image,
			} as Pick<Session, "tokenId" | "captchaType">);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
				// No ipAddress field
			});

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
				frictionlessTokenId: "frictionlessTokenId",
			});
		});

		it("should validate a request when no currentIP is provided even with IP stored on token", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				tokenId: "tokenId" as unknown as ObjectId,
				captchaType: CaptchaType.image,
			} as Pick<Session, "tokenId" | "captchaType">);

			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.getFrictionlessTokenRecordByTokenId as any).mockResolvedValue({
				_id: "frictionlessTokenId",
				ipAddress: {
					lower: 2130706433n, // 127.0.0.1 as bigint
					type: IpAddressType.v4,
				},
			} as Partial<FrictionlessToken>);

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
				frictionlessTokenId: "frictionlessTokenId",
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
});
