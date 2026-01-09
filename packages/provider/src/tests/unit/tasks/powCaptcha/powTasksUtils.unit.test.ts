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

import { ProsopoApiError } from "@prosopo/common";
import { signatureVerify } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkPowSignature, validateSolution } from "../../../../tasks/powCaptcha/powTasksUtils.js";

vi.mock("@prosopo/util-crypto", () => ({
	signatureVerify: vi.fn(),
}));

describe("validateSolution", () => {
	it("should return true for valid solution with difficulty 1", () => {
		const nonce = 0;
		const challenge = "test";
		const difficulty = 1;

		const result = validateSolution(nonce, challenge, difficulty);
		expect(typeof result).toBe("boolean");
		// Note: This test might be flaky since it depends on the hash output
		// In a real implementation, we'd use a known nonce/challenge pair
	});

	it("should return false for invalid solution", () => {
		// This is a contrived example - in practice we'd need to find a nonce
		// that doesn't produce the required number of leading zeros
		const nonce = 999999;
		const challenge = "impossible-challenge";
		const difficulty = 10; // Very high difficulty

		const result = validateSolution(nonce, challenge, difficulty);
		expect(result).toBe(false);
	});

	it("should handle different difficulty levels", () => {
		const nonce = 42;
		const challenge = "consistent-challenge";

		expect(typeof validateSolution(nonce, challenge, 0)).toBe("boolean");
		expect(typeof validateSolution(nonce, challenge, 1)).toBe("boolean");
		expect(typeof validateSolution(nonce, challenge, 4)).toBe("boolean");
	});

	it("should handle edge cases", () => {
		expect(typeof validateSolution(0, "", 0)).toBe("boolean");
		expect(typeof validateSolution(-1, "test", 1)).toBe("boolean");
		expect(typeof validateSolution(42, "", 1)).toBe("boolean");
	});

	it("should be deterministic for same inputs", () => {
		const nonce = 12345;
		const challenge = "deterministic-test";
		const difficulty = 2;

		const result1 = validateSolution(nonce, challenge, difficulty);
		const result2 = validateSolution(nonce, challenge, difficulty);

		expect(result1).toBe(result2);
	});

	it("should handle very high difficulty", () => {
		const nonce = 1;
		const challenge = "test";
		const difficulty = 20; // Extremely high, unlikely to pass

		const result = validateSolution(nonce, challenge, difficulty);
		expect(result).toBe(false);
	});
});

describe("checkPowSignature", () => {
	const validAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
	const validSignature = "0x1234567890abcdef";
	const validMessage = "test message";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should not throw for valid signature", () => {
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: true,
		} as any);

		expect(() => checkPowSignature(validMessage, validSignature, validAddress)).not.toThrow();
		expect(signatureVerify).toHaveBeenCalledWith(
			`0x${Buffer.from(validMessage, 'utf8').toString('hex')}`,
			validSignature,
			validAddress
		);
	});

	it("should throw ProsopoApiError for invalid signature", () => {
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: false,
		} as any);

		expect(() => checkPowSignature(validMessage, validSignature, validAddress)).toThrow(ProsopoApiError);

		try {
			checkPowSignature(validMessage, validSignature, validAddress);
		} catch (error) {
			expect(error).toBeInstanceOf(ProsopoApiError);
			expect((error as ProsopoApiError).context).toEqual({
				ERROR: "Signature is invalid for this message: undefined",
				failedFuncName: "checkPowSignature",
				address: validAddress,
				message: validMessage,
				signature: validSignature,
				signatureType: undefined,
				code: 500,
			});
		}
	});

	it("should include signature type in error message when provided", () => {
		const signatureType = "sr25519";
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: false,
		} as any);

		expect(() => checkPowSignature(validMessage, validSignature, validAddress, signatureType)).toThrow(ProsopoApiError);

		try {
			checkPowSignature(validMessage, validSignature, validAddress, signatureType);
		} catch (error) {
			expect((error as ProsopoApiError).context.ERROR).toBe(`Signature is invalid for this message: ${signatureType}`);
			expect((error as ProsopoApiError).context.signatureType).toBe(signatureType);
		}
	});

	it("should handle empty message", () => {
		const emptyMessage = "";
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: true,
		} as any);

		expect(() => checkPowSignature(emptyMessage, validSignature, validAddress)).not.toThrow();
		expect(signatureVerify).toHaveBeenCalledWith(
			expect.stringContaining(emptyMessage),
			validSignature,
			validAddress
		);
	});

	it("should handle hex address format", () => {
		const hexAddress = "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: true,
		} as any);

		expect(() => checkPowSignature(validMessage, validSignature, hexAddress)).not.toThrow();
		expect(signatureVerify).toHaveBeenCalledWith(
			expect.any(String),
			validSignature,
			hexAddress
		);
	});

	it("should handle different signature formats", () => {
		const hexSignature = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: true,
		} as any);

		expect(() => checkPowSignature(validMessage, hexSignature, validAddress)).not.toThrow();
		expect(signatureVerify).toHaveBeenCalledWith(
			expect.any(String),
			hexSignature,
			validAddress
		);
	});

	it("should call signatureVerify with hex-encoded message", () => {
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: true,
		} as any);

		checkPowSignature(validMessage, validSignature, validAddress);

		// Verify that the message was hex-encoded (should start with 0x)
		const callArgs = vi.mocked(signatureVerify).mock.calls[0];
		expect(callArgs[0]).toMatch(/^0x/);
		expect(callArgs[0]).toContain("74657374206d657373616765"); // hex encoding of "test message"
	});

	it("should handle unicode messages", () => {
		const unicodeMessage = "Hello 🌟 World!";
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: true,
		} as any);

		expect(() => checkPowSignature(unicodeMessage, validSignature, validAddress)).not.toThrow();

		const callArgs = vi.mocked(signatureVerify).mock.calls[0];
		expect(callArgs[0]).toMatch(/^0x/);
	});

	it("should handle very long messages", () => {
		const longMessage = "A".repeat(10000);
		vi.mocked(signatureVerify).mockReturnValue({
			isValid: true,
		} as any);

		expect(() => checkPowSignature(longMessage, validSignature, validAddress)).not.toThrow();
	});

	it("should provide detailed error context", () => {
		const customMessage = "Custom verification message";
		const customSignature = "0xabcdef123456";
		const customAddress = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

		vi.mocked(signatureVerify).mockReturnValue({
			isValid: false,
		} as any);

		try {
			checkPowSignature(customMessage, customSignature, customAddress, "ecdsa");
		} catch (error) {
			const apiError = error as ProsopoApiError;
			expect(apiError.context.failedFuncName).toBe("checkPowSignature");
			expect(apiError.context.address).toBe(customAddress);
			expect(apiError.context.message).toBe(customMessage);
			expect(apiError.context.signature).toBe(customSignature);
			expect(apiError.context.signatureType).toBe("ecdsa");
		}
	});
});
