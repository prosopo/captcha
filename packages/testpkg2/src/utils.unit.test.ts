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

import { describe, expect, test, vi } from "vitest";
import {
	validateEmail,
	validateUser,
	sanitizeString,
	generateId,
	calculateAge,
	delay,
	EMAIL_REGEX,
	DEFAULT_USER_AGE,
	MAX_USERS,
} from "./index.js";

describe("Email Validation", () => {
	test("validates correct email addresses", () => {
		// Test that valid email addresses pass validation
		const validEmails = [
			"test@example.com",
			"user.name@domain.co.uk",
			"test123@test-domain.org",
		];

		for (const email of validEmails) {
			const result = validateEmail(email);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		}
	});

	test("rejects invalid email addresses", () => {
		// Test that invalid email addresses fail validation
		const testCases = [
			{ email: "", expectedError: "Email is required" },
			{ email: "invalid", expectedError: "Invalid email format" },
			{ email: "@example.com", expectedError: "Invalid email format" },
			{ email: "test@", expectedError: "Invalid email format" },
			{ email: "test.example.com", expectedError: "Invalid email format" },
			{ email: "test@.com", expectedError: "Invalid email format" },
		];

		for (const { email, expectedError } of testCases) {
			const result = validateEmail(email);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(expectedError);
		}
	});

	test("rejects empty email", () => {
		// Test that empty email is rejected with specific error
		const result = validateEmail("");
		expect(result.isValid).toBe(false);
		expect(result.errors).toContain("Email is required");
	});
});

describe("User Validation", () => {
	test("validates complete valid user", () => {
		// Test validation of a complete, valid user object
		const validUser = {
			name: "John Doe",
			email: "john@example.com",
			age: 30,
		};

		const result = validateUser(validUser);
		expect(result.isValid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test("validates user with missing optional fields", () => {
		// Test validation passes when optional fields are missing
		const userWithoutAge = {
			name: "Jane Doe",
			email: "jane@example.com",
		};

		const result = validateUser(userWithoutAge);
		expect(result.isValid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test("rejects user with missing required fields", () => {
		// Test validation fails when required fields are missing
		const userWithoutName = {
			email: "test@example.com",
		};

		const userWithoutEmail = {
			name: "Test User",
		};

		const userEmpty = {};

		expect(validateUser(userWithoutName).isValid).toBe(false);
		expect(validateUser(userWithoutEmail).isValid).toBe(false);
		expect(validateUser(userEmpty).isValid).toBe(false);
	});

	test("rejects user with invalid email", () => {
		// Test validation fails when email is invalid
		const userWithInvalidEmail = {
			name: "Test User",
			email: "invalid-email",
		};

		const result = validateUser(userWithInvalidEmail);
		expect(result.isValid).toBe(false);
		expect(result.errors).toContain("Invalid email format");
	});

	test("rejects user with invalid age", () => {
		// Test validation fails when age is out of valid range
		const userWithNegativeAge = {
			name: "Test User",
			email: "test@example.com",
			age: -1,
		};

		const userWithTooOldAge = {
			name: "Test User",
			email: "test@example.com",
			age: 200,
		};

		expect(validateUser(userWithNegativeAge).isValid).toBe(false);
		expect(validateUser(userWithTooOldAge).isValid).toBe(false);
	});

	test("rejects user with empty name", () => {
		// Test validation fails when name is empty or whitespace
		const userWithEmptyName = {
			name: "",
			email: "test@example.com",
		};

		const userWithWhitespaceName = {
			name: "   ",
			email: "test@example.com",
		};

		expect(validateUser(userWithEmptyName).isValid).toBe(false);
		expect(validateUser(userWithWhitespaceName).isValid).toBe(false);
	});
});

describe("String Sanitization", () => {
	test("removes HTML tags from input", () => {
		// Test that HTML tags are removed from input strings
		expect(sanitizeString("<script>alert('xss')</script>")).toBe("alert('xss')");
		expect(sanitizeString("Hello <b>world</b>")).toBe("Hello world");
		expect(sanitizeString("<>test<>")).toBe("test");
	});

	test("trims whitespace", () => {
		// Test that leading and trailing whitespace is removed
		expect(sanitizeString("  hello world  ")).toBe("hello world");
		expect(sanitizeString("\t\ntest\n\t")).toBe("test");
	});

	test("handles empty strings", () => {
		// Test sanitization of empty and whitespace-only strings
		expect(sanitizeString("")).toBe("");
		expect(sanitizeString("   ")).toBe("");
	});

	test("preserves valid characters", () => {
		// Test that valid characters are preserved
		const input = "Hello, world! 123 @#$%^&*()";
		expect(sanitizeString(input)).toBe(input.trim());
	});
});

describe("ID Generation", () => {
	test("generates unique IDs", () => {
		// Test that generated IDs are unique
		const ids = new Set<string>();
		for (let i = 0; i < 1000; i++) {
			ids.add(generateId());
		}
		expect(ids.size).toBe(1000);
	});

	test("generates string IDs", () => {
		// Test that generated IDs are strings
		const id = generateId();
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
	});

	test("generates IDs with expected format", () => {
		// Test that IDs contain alphanumeric characters
		const id = generateId();
		expect(/^[a-zA-Z0-9]+$/.test(id)).toBe(true);
	});
});

describe("Age Calculation", () => {
	test("calculates age correctly", () => {
		// Test age calculation for various birth dates
		const now = new Date();

		// Same day this year
		const birthDate1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		expect(calculateAge(birthDate1)).toBe(0);

		// One year ago
		const birthDate2 = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
		expect(calculateAge(birthDate2)).toBe(1);

		// 25 years ago
		const birthDate3 = new Date(now.getFullYear() - 25, now.getMonth(), now.getDate());
		expect(calculateAge(birthDate3)).toBe(25);
	});

	test("handles leap years correctly", () => {
		// Test age calculation around Feb 29 in leap years
		const leapYearBirth = new Date(2000, 1, 29); // Feb 29, 2000

		// Age should be calculated correctly even with leap day
		// Since today is January 9, 2026, and birthday is Feb 29, 2000, age should be 25
		const age = calculateAge(leapYearBirth);
		expect(age).toBe(25); // 2026 - 2000 - 1 (birthday not yet occurred)
	});

	test("handles edge cases", () => {
		// Test edge cases like future dates and very old dates
		const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
		expect(calculateAge(futureDate)).toBe(-1);

		const veryOldDate = new Date(1900, 0, 1);
		expect(calculateAge(veryOldDate)).toBeGreaterThan(100);
	});
});

describe("Delay Function", () => {
	test("delays execution for specified time", async () => {
		// Test that delay function waits for the specified duration
		const startTime = Date.now();
		await delay(100);
		const endTime = Date.now();

		expect(endTime - startTime).toBeGreaterThanOrEqual(95); // Allow some tolerance
		expect(endTime - startTime).toBeLessThan(200); // Shouldn't be too much longer
	});

	test("handles zero delay", async () => {
		// Test that zero delay doesn't hang
		const startTime = Date.now();
		await delay(0);
		const endTime = Date.now();

		expect(endTime - startTime).toBeLessThan(10); // Should complete quickly
	});
});

describe("Constants", () => {
	test("exports correct constant values", () => {
		// Test that constants have expected values
		expect(MAX_USERS).toBe(1000);
		expect(DEFAULT_USER_AGE).toBe(18);
		expect(EMAIL_REGEX).toEqual(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
	});

	test("email regex matches expected patterns", () => {
		// Test that the email regex works as expected
		expect(EMAIL_REGEX.test("test@example.com")).toBe(true);
		expect(EMAIL_REGEX.test("invalid")).toBe(false);
		expect(EMAIL_REGEX.test("test@")).toBe(false);
	});
});