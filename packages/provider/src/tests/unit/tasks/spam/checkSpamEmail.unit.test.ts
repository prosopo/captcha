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

// Mock @prosopo/util module
vi.mock("@prosopo/util", () => ({
	runDnsChecks: vi.fn(),
	validateDomainForOutboundRequest: vi.fn(),
	extractDomainFromEmail: vi.fn(),
}));

// Import the mocked functions for use in tests
import {
	extractDomainFromEmail,
	runDnsChecks,
	validateDomainForOutboundRequest,
} from "@prosopo/util";

describe("checkSpamEmail", () => {
	let db: IProviderDatabase;
	let config: ProsopoConfigOutput;
	const logger = getLogger("info", "checkSpamEmail.unit.test");
	// Cast the mocked functions to access mock methods
	const mockRunDnsChecks = runDnsChecks as ReturnType<typeof vi.fn>;
	const mockValidateDomain = validateDomainForOutboundRequest as ReturnType<
		typeof vi.fn
	>;
	const mockExtractDomain = extractDomainFromEmail as ReturnType<typeof vi.fn>;

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

		// Default mock for extractDomainFromEmail - returns the domain part
		mockExtractDomain.mockImplementation((email: string) => {
			const trimmed = email.trim();
			if (!trimmed) return null;
			if (trimmed.includes("@")) {
				const parts = trimmed.split("@");
				const domain = parts[parts.length - 1] || "";
				return domain.toLowerCase().trim() || null;
			}
			return trimmed.toLowerCase().trim() || null;
		});

		// Default mock for validateDomainForOutboundRequest - allows all domains
		mockValidateDomain.mockReturnValue({ isValid: true });

		// Default mock for runDnsChecks - returns no DNS results
		mockRunDnsChecks.mockResolvedValue({
			cnameResult: null,
			mxRecordResult: null,
			redirectResult: {},
		});
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

	it("should detect spam when base domain matches (fakemail.* pattern)", async () => {
		// Simulate database finding "fakemail" base domain
		(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
			domain: "fakemail",
		});

		const result = await checkSpamEmail(
			"user@fakemail.app",
			db,
			config,
			logger,
		);
		expect(result).toBe(true);
		expect(db.getSpamEmailDomain).toHaveBeenCalledWith("fakemail.app");
	});

	it("should detect spam with different TLDs for same base domain", async () => {
		const testCases = [
			"fakemail.com",
			"fakemail.app",
			"fakemail.xyz",
			"fakemail.net",
		];

		for (const domain of testCases) {
			vi.clearAllMocks();
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
				domain: "fakemail",
			});

			const result = await checkSpamEmail(`user@${domain}`, db, config, logger);
			expect(result).toBe(true);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith(domain);
		}
	});

	describe("DNS checks", () => {
		it("should detect spam when domain has TLS error", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);
			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: null,
				redirectResult: { tlsError: true },
			});

			const result = await checkSpamEmail(
				"user@suspicious.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(true);
		});

		it("should check redirect domain when redirect is found", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null) // First call for original domain
				.mockResolvedValueOnce({ domain: "spam-redirect.com" }); // Second call for redirect

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: null,
				redirectResult: { redirectUrl: "https://spam-redirect.com/signup" },
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(true);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("example.com");
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spam-redirect.com");
		});

		it("should check CNAME domain when CNAME is found", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null) // First call for original domain
				.mockResolvedValueOnce({ domain: "spam.cname.com" }); // Second call for CNAME

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: ["spam.cname.com."],
				mxRecordResult: null,
				redirectResult: {},
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(true);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("example.com");
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spam.cname.com");
		});

		it("should check MX record domain when MX record is found", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null) // First call for original domain
				.mockResolvedValueOnce({ domain: "fakemail.app" }); // Second call for MX domain

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: [{ exchange: "mail.fakemail.app.", priority: 10 }],
				redirectResult: {},
			});

			const result = await checkSpamEmail("user@anowt.com", db, config, logger);
			expect(result).toBe(true);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("anowt.com");
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("mail.fakemail.app");
		});

		it("should handle MX record with trailing dot", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(null);

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: [{ exchange: "mail.legitimate.com.", priority: 10 }],
				redirectResult: {},
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(false);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("mail.legitimate.com");
		});

		it("should handle multiple MX records by checking the first one", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ domain: "spam-mx.com" });

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: [
					{ exchange: "spam-mx.com.", priority: 10 },
					{ exchange: "backup-mx.com.", priority: 20 },
				],
				redirectResult: {},
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(true);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spam-mx.com");
		});

		it("should handle DNS check failure gracefully", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);
			mockRunDnsChecks.mockRejectedValue(new Error("DNS lookup failed"));

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(false);
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should return false when MX record check fails", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null)
				.mockRejectedValueOnce(new Error("Database error"));

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: [{ exchange: "mail.example.com.", priority: 10 }],
				redirectResult: {},
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(false);
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should handle empty MX record exchange gracefully", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: [{ exchange: "", priority: 10 }],
				redirectResult: {},
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(false);
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should prioritize redirect check over CNAME and MX checks", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ domain: "spam-redirect.com" });

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: ["some.cname.com."],
				mxRecordResult: [{ exchange: "mail.example.com.", priority: 10 }],
				redirectResult: { redirectUrl: "https://spam-redirect.com" },
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(true);
			// Should only check original domain and redirect domain, not CNAME or MX
			expect(db.getSpamEmailDomain).toHaveBeenCalledTimes(2);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("example.com");
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spam-redirect.com");
		});

		it("should prioritize CNAME check over MX check", async () => {
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ domain: "spam.cname.com" });

			mockRunDnsChecks.mockResolvedValue({
				cnameResult: ["spam.cname.com."],
				mxRecordResult: [{ exchange: "mail.example.com.", priority: 10 }],
				redirectResult: {},
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);
			expect(result).toBe(true);
			// Should only check original domain and CNAME, not MX
			expect(db.getSpamEmailDomain).toHaveBeenCalledTimes(2);
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("example.com");
			expect(db.getSpamEmailDomain).toHaveBeenCalledWith("spam.cname.com");
		});
	});

	describe("SSRF protection", () => {
		it("should reject IP address literals", async () => {
			mockExtractDomain.mockReturnValue("192.168.1.1");
			mockValidateDomain.mockReturnValue({
				isValid: false,
				reason: "IP address literals are not allowed",
			});
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);

			const result = await checkSpamEmail(
				"user@192.168.1.1",
				db,
				config,
				logger,
			);

			expect(result).toBe(true); // Treated as spam
			expect(mockValidateDomain).toHaveBeenCalledWith("192.168.1.1");
			expect(mockRunDnsChecks).not.toHaveBeenCalled(); // DNS checks should not run
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should reject localhost domains", async () => {
			mockExtractDomain.mockReturnValue("localhost");
			mockValidateDomain.mockReturnValue({
				isValid: false,
				reason: "Reserved hostname",
			});
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);

			const result = await checkSpamEmail("user@localhost", db, config, logger);

			expect(result).toBe(true); // Treated as spam
			expect(mockValidateDomain).toHaveBeenCalledWith("localhost");
			expect(mockRunDnsChecks).not.toHaveBeenCalled();
		});

		it("should reject AWS metadata service domain", async () => {
			mockExtractDomain.mockReturnValue("169.254.169.254");
			mockValidateDomain.mockReturnValue({
				isValid: false,
				reason: "IPv4 address in reserved/private range",
			});
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);

			const result = await checkSpamEmail(
				"user@169.254.169.254",
				db,
				config,
				logger,
			);

			expect(result).toBe(true); // Treated as spam
			expect(mockRunDnsChecks).not.toHaveBeenCalled();
		});

		it("should reject internal TLD domains", async () => {
			mockExtractDomain.mockReturnValue("myserver.internal");
			mockValidateDomain.mockReturnValue({
				isValid: false,
				reason: "Internal/cloud metadata hostname",
			});
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);

			const result = await checkSpamEmail(
				"user@myserver.internal",
				db,
				config,
				logger,
			);

			expect(result).toBe(true); // Treated as spam
			expect(mockRunDnsChecks).not.toHaveBeenCalled();
		});

		it("should reject .local domains", async () => {
			mockExtractDomain.mockReturnValue("printer.local");
			mockValidateDomain.mockReturnValue({
				isValid: false,
				reason: "Reserved TLD: local",
			});
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);

			const result = await checkSpamEmail(
				"user@printer.local",
				db,
				config,
				logger,
			);

			expect(result).toBe(true); // Treated as spam
			expect(mockRunDnsChecks).not.toHaveBeenCalled();
		});

		it("should allow valid public domains and run DNS checks", async () => {
			mockExtractDomain.mockReturnValue("example.com");
			mockValidateDomain.mockReturnValue({ isValid: true });
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);
			mockRunDnsChecks.mockResolvedValue({
				cnameResult: null,
				mxRecordResult: null,
				redirectResult: {},
			});

			const result = await checkSpamEmail(
				"user@example.com",
				db,
				config,
				logger,
			);

			expect(result).toBe(false);
			expect(mockValidateDomain).toHaveBeenCalledWith("example.com");
			expect(mockRunDnsChecks).toHaveBeenCalled(); // DNS checks should run for valid domains
		});

		it("should check spam list before SSRF validation", async () => {
			mockExtractDomain.mockReturnValue("known-spam.com");
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
				domain: "known-spam.com",
			});

			const result = await checkSpamEmail(
				"user@known-spam.com",
				db,
				config,
				logger,
			);

			expect(result).toBe(true);
			// SSRF validation should not be called if already in spam list
			expect(mockValidateDomain).not.toHaveBeenCalled();
			expect(mockRunDnsChecks).not.toHaveBeenCalled();
		});

		it("should log warning with reason when SSRF validation fails", async () => {
			mockExtractDomain.mockReturnValue("10.0.0.1");
			mockValidateDomain.mockReturnValue({
				isValid: false,
				reason: "IPv4 address in reserved/private range",
			});
			(db.getSpamEmailDomain as ReturnType<typeof vi.fn>).mockResolvedValue(
				null,
			);

			await checkSpamEmail("user@10.0.0.1", db, config, logger);

			expect(logger.warn).toHaveBeenCalled();
		});
	});
});
