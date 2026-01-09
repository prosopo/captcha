import { ProsopoEnvError } from "@prosopo/common";
import { describe, expect, test, vi } from "vitest";
import type { ArgumentsCamelCase } from "yargs";

// Mock encodeStringAddress to return the input address before importing validators
vi.mock("@prosopo/provider", () => ({
	encodeStringAddress: vi.fn((addr: string) => addr),
}));

import {
	validateAddress,
	validateScheduleExpression,
	validateSiteKey,
	validateValue,
} from "../commands/validators.js";

describe("validators", () => {
	describe("validateAddress", () => {
		test("should return encoded address for valid address", () => {
			const argv = {
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
			} as ArgumentsCamelCase;
			const result = validateAddress(argv);
			expect(result).toHaveProperty("address");
			expect(typeof result.address).toBe("string");
		});

		test("should handle different address formats", () => {
			const addresses = [
				"5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				"5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			];
			for (const addr of addresses) {
				const argv = { address: addr } as ArgumentsCamelCase;
				const result = validateAddress(argv);
				expect(result).toHaveProperty("address");
			}
		});
	});

	describe("validateSiteKey", () => {
		test("should return encoded sitekey for valid sitekey", () => {
			const argv = {
				sitekey: "5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
			} as ArgumentsCamelCase;
			const result = validateSiteKey(argv);
			expect(result).toHaveProperty("sitekey");
			expect(typeof result.sitekey).toBe("string");
		});

		test("should handle different sitekey formats", () => {
			const sitekeys = [
				"5GrwvaEF5zXb26Fz9rcQpDWS57CERrH4kYWwymqL8",
				"5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
			];
			for (const key of sitekeys) {
				const argv = { sitekey: key } as ArgumentsCamelCase;
				const result = validateSiteKey(argv);
				expect(result).toHaveProperty("sitekey");
			}
		});
	});

	describe("validateValue", () => {
		test("should return value for valid number", () => {
			const argv = { value: 100 } as ArgumentsCamelCase;
			const result = validateValue(argv);
			expect(result).toHaveProperty("value");
		});

		test("should return value for zero", () => {
			const argv = { value: 0 } as ArgumentsCamelCase;
			const result = validateValue(argv);
			expect(result).toHaveProperty("value");
		});

		test("should return value for negative number", () => {
			const argv = { value: -100 } as ArgumentsCamelCase;
			const result = validateValue(argv);
			expect(result).toHaveProperty("value");
		});

		test("should throw ProsopoEnvError for string value", () => {
			const argv = { value: "100" } as ArgumentsCamelCase;
			expect(() => validateValue(argv)).toThrow(ProsopoEnvError);
			expect(() => validateValue(argv)).toThrow("PARAMETER_ERROR");
		});

		test("should throw ProsopoEnvError for undefined value", () => {
			const argv = { value: undefined } as ArgumentsCamelCase;
			expect(() => validateValue(argv)).toThrow(ProsopoEnvError);
			expect(() => validateValue(argv)).toThrow("PARAMETER_ERROR");
		});

		test("should throw ProsopoEnvError for null value", () => {
			const argv = { value: null } as ArgumentsCamelCase;
			expect(() => validateValue(argv)).toThrow(ProsopoEnvError);
			expect(() => validateValue(argv)).toThrow("PARAMETER_ERROR");
		});

		test("should throw ProsopoEnvError for boolean value", () => {
			const argv = { value: true } as ArgumentsCamelCase;
			expect(() => validateValue(argv)).toThrow(ProsopoEnvError);
			expect(() => validateValue(argv)).toThrow("PARAMETER_ERROR");
		});
	});

	describe("validateScheduleExpression", () => {
		test("should return schedule for valid cron expression", () => {
			const argv = { schedule: "0 0 * * *" } as ArgumentsCamelCase;
			const result = validateScheduleExpression(argv);
			expect(result).toHaveProperty("schedule");
			expect(result.schedule).toBe("0 0 * * *");
		});

		test("should return schedule for valid complex cron expression", () => {
			const argv = { schedule: "0 */6 * * *" } as ArgumentsCamelCase;
			const result = validateScheduleExpression(argv);
			expect(result).toHaveProperty("schedule");
			expect(result.schedule).toBe("0 */6 * * *");
		});

		test("should return null when schedule is not a string", () => {
			const argv = { schedule: null } as ArgumentsCamelCase;
			const result = validateScheduleExpression(argv);
			expect(result).toHaveProperty("schedule");
			expect(result.schedule).toBeNull();
		});

		test("should return null when schedule is undefined", () => {
			const argv = { schedule: undefined } as ArgumentsCamelCase;
			const result = validateScheduleExpression(argv);
			expect(result).toHaveProperty("schedule");
			expect(result.schedule).toBeNull();
		});

		test("should throw ProsopoEnvError for invalid cron expression", () => {
			const argv = { schedule: "invalid cron" } as ArgumentsCamelCase;
			expect(() => validateScheduleExpression(argv)).toThrow(ProsopoEnvError);
			expect(() => validateScheduleExpression(argv)).toThrow("PARAMETER_ERROR");
		});

		test("should handle empty string - may or may not throw depending on cron-parser", () => {
			const argv = { schedule: "" } as ArgumentsCamelCase;
			// Empty string behavior depends on cron-parser - test that it doesn't crash
			expect(() => validateScheduleExpression(argv)).not.toThrow();
		});
	});
});
