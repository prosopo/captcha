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
import type {
	ClientRecord,
	IProviderDatabase,
	Session,
} from "@prosopo/types-database";
import type { ObjectId } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptchaManager } from "../../../tasks/captchaManager.js";

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
			debug: vi.fn().mockImplementation(loggerOuter.debug),
			log: vi.fn().mockImplementation(loggerOuter.log),
			info: vi.fn().mockImplementation(loggerOuter.info),
			error: vi.fn().mockImplementation(loggerOuter.error),
			trace: vi.fn().mockImplementation(loggerOuter.trace),
			fatal: vi.fn().mockImplementation(loggerOuter.fatal),
			warn: vi.fn().mockImplementation(loggerOuter.warn),
		} as unknown as Logger;
		logger = mockLogger;

		captchaManager = new CaptchaManager(db, pair, logger);

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
			);
			expect(result).toEqual({
				valid: true,
				type: CaptchaType.pow,
			});
		});
		it("should validate a request for an pow captcha when the client settings are set to frictionless and a session ID is passed and found", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				tokenId: "tokenId" as unknown as ObjectId,
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
				"sessionId",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.pow,
				frictionlessTokenId: "frictionlessTokenId",
			});
		});
		it("should validate a request for an image captcha when the client settings are set to frictionless and a session ID is passed and found", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: tests
			(db.checkAndRemoveSession as any).mockResolvedValue({
				tokenId: "tokenId" as unknown as ObjectId,
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
				CaptchaType.image,
				"sessionId",
			);

			expect(result).toEqual({
				valid: true,
				type: CaptchaType.image,
				frictionlessTokenId: "frictionlessTokenId",
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
			);

			expect(result).toEqual({
				valid: false,
				reason: "API.INCORRECT_CAPTCHA_TYPE",
				type: CaptchaType.image,
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
