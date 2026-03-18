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

import { getLogger } from "@prosopo/common";
import type { ProsopoConfigOutput } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkSpamEmail } from "../../../../tasks/spam/checkSpamEmail.js";

describe("checkSpamEmail", () => {
	let db: IProviderDatabase;
	let config: ProsopoConfigOutput;
	const logger = getLogger("info", "checkSpamEmail.unit.test");

	beforeEach(() => {
		// Mock database
		db = {
			getSpamEmailDomain: vi.fn(),
		} as unknown as IProviderDatabase;

		// Mock config
		config = {
			ipApi: {
				baseUrl: "https://api.ipapi.is",
				apiKey: "test-key",
			},
		} as ProsopoConfigOutput;

		// Mock logger warn
		logger.warn = vi.fn();
		vi.clearAllMocks();
	});

	it("should check database for single-word domains without @", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const result = await checkSpamEmail("invalid-email", db, config, logger);
		expect(result).toBe(false);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("invalid-email");
	});

	it("should handle domain-only format (without @)", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
			domain: "spammydomain.com",
		});

		const result = await checkSpamEmail("spammydomain.com", db, config, logger);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spammydomain.com");
	});

	it("should handle @domain.com format", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
			domain: "spammydomain.com",
		});

		const result = await checkSpamEmail(
			"@spammydomain.com",
			db,
			config,
			logger,
		);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spammydomain.com");
	});

	it("should handle user@domain.com format", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
			domain: "spammydomain.com",
		});

		const result = await checkSpamEmail(
			"user@spammydomain.com",
			db,
			config,
			logger,
		);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spammydomain.com");
	});

	it("should return false when email domain is not in spam list", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const result = await checkSpamEmail(
			"user@legitimate.com",
			db,
			config,
			logger,
		);
		expect(result).toBe(false);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("legitimate.com");
	});

	it("should convert domain to lowercase before checking", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const result = await checkSpamEmail(
			"user@UPPERCASE.COM",
			db,
			config,
			logger,
		);
		expect(result).toBe(false);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("uppercase.com");
	});

	it("should handle mixed case domains correctly", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
			domain: "mixedcase.com",
		});

		const result = await checkSpamEmail(
			"user@MixedCase.COM",
			db,
			config,
			logger,
		);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("mixedcase.com");
	});

	it("should return false when database check throws an error", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Database error"),
		);

		const result = await checkSpamEmail("user@example.com", db, config, logger);
		expect(result).toBe(false);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("example.com");
		expect(logger.warn).toHaveBeenCalled();
	});

	it("should log a warning when database check fails", async () => {
		const error = new Error("Connection timeout");
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockRejectedValue(
			error,
		);

		await checkSpamEmail("user@example.com", db, config, logger);
		expect(logger.warn).toHaveBeenCalled();
	});

	it("should handle email with multiple @ symbols by taking last part", async () => {
		// Emails cannot have more than one @ symbol per RFC 5321
		// The current implementation splits on @ and takes the last part
		// For "user@name@example.com", the last part is "example.com"
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const result = await checkSpamEmail(
			"user@name@example.com",
			db,
			config,
			logger,
		);
		expect(result).toBe(false);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("example.com");
	});

	it("should handle email with trailing @", async () => {
		const result = await checkSpamEmail("user@", db, config, logger);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).not.toHaveBeenCalled();
	});

	it("should handle empty string email", async () => {
		const result = await checkSpamEmail("", db, config, logger);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).not.toHaveBeenCalled();
	});

	it("should handle email with subdomain correctly", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const result = await checkSpamEmail(
			"user@mail.example.com",
			db,
			config,
			logger,
		);
		expect(result).toBe(false);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("mail.example.com");
	});

	it("should check exact domain match for spam list", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
			domain: "spam.com",
		});

		const result = await checkSpamEmail("user@spam.com", db, config, logger);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spam.com");
	});

	it("should handle common disposable email domains", async () => {
		const disposableDomains = [
			"tempmail.com",
			"10minutemail.com",
			"guerrillamail.com",
			"mailinator.com",
		];

		for (const domain of disposableDomains) {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
				domain,
			});
			const result = await checkSpamEmail(`user@${domain}`, db, config, logger);
			expect(result).toBe(true);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith(domain);
			vi.clearAllMocks();
		}
	});

	it("should handle whitespace in email addresses", async () => {
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const result = await checkSpamEmail(
			"  user@example.com  ",
			db,
			config,
			logger,
		);
		expect(result).toBe(false);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("example.com");
	});
});
