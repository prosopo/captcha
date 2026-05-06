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
import type { Logger } from "@prosopo/common";
import { validateAddress } from "@prosopo/util-crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateAddr, validateSiteKey } from "../../../api/validateAddress.js";

vi.mock("@prosopo/util-crypto", () => ({
	validateAddress: vi.fn(),
}));

describe("validateSiteKey", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = {
			error: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as Logger;
	});

	it("should validate site key using validateAddr", () => {
		const siteKey = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() => validateSiteKey(siteKey, mockLogger)).not.toThrow();
		expect(validateAddress).toHaveBeenCalledWith(siteKey, false, 42);
	});

	it("should throw error for invalid site key", () => {
		const invalidSiteKey = "invalid-site-key";

		vi.mocked(validateAddress).mockReturnValue(false);

		expect(() => validateSiteKey(invalidSiteKey, mockLogger)).toThrow(
			ProsopoApiError,
		);
		expect(validateAddress).toHaveBeenCalledWith(invalidSiteKey, false, 42);
	});

	it("should work without logger", () => {
		const siteKey = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() => validateSiteKey(siteKey)).not.toThrow();
		expect(validateAddress).toHaveBeenCalledWith(siteKey, false, 42);
	});
});

describe("validateAddr", () => {
	let mockLogger: Logger;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLogger = {
			error: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as Logger;
	});

	it("should validate successfully for valid address", () => {
		const validAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() =>
			validateAddr(validAddress, "CONTRACT.INVALID_ADDRESS", mockLogger),
		).not.toThrow();
		expect(validateAddress).toHaveBeenCalledWith(validAddress, false, 42);
	});

	it("should throw ProsopoApiError for invalid address", () => {
		const invalidAddress = "invalid-address";

		vi.mocked(validateAddress).mockReturnValue(false);

		expect(() =>
			validateAddr(invalidAddress, "CONTRACT.INVALID_ADDRESS", mockLogger),
		).toThrow(ProsopoApiError);

		try {
			validateAddr(invalidAddress, "CONTRACT.INVALID_ADDRESS", mockLogger);
		} catch (error) {
			expect(error).toBeInstanceOf(ProsopoApiError);
			expect((error as ProsopoApiError).context).toEqual({
				code: 400,
				siteKey: invalidAddress,
			});
		}
	});

	it("should use default translation key when not provided", () => {
		const invalidAddress = "invalid-address";

		vi.mocked(validateAddress).mockReturnValue(false);

		expect(() => validateAddr(invalidAddress)).toThrow(ProsopoApiError);

		try {
			validateAddr(invalidAddress);
		} catch (error) {
			expect(error).toBeInstanceOf(ProsopoApiError);
			expect((error as ProsopoApiError).context).toEqual({
				code: 400,
				siteKey: invalidAddress,
			});
		}
	});

	it("should handle crypto validation throwing an error", () => {
		const address = "some-address";
		const cryptoError = new Error("Crypto validation failed");

		vi.mocked(validateAddress).mockImplementation(() => {
			throw cryptoError;
		});

		expect(() =>
			validateAddr(address, "CONTRACT.INVALID_ADDRESS", mockLogger),
		).toThrow(ProsopoApiError);

		try {
			validateAddr(address, "CONTRACT.INVALID_ADDRESS", mockLogger);
		} catch (error) {
			expect(error).toBeInstanceOf(ProsopoApiError);
			expect((error as ProsopoApiError).context).toEqual({
				code: 400,
				siteKey: address,
			});
		}
	});

	it("should work without logger parameter", () => {
		const validAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() => validateAddr(validAddress)).not.toThrow();
		expect(validateAddress).toHaveBeenCalledWith(validAddress, false, 42);
	});

	it("should validate with different translation keys", () => {
		const invalidAddress = "invalid-address";
		const customTranslationKey = "API.INVALID_USER";

		vi.mocked(validateAddress).mockReturnValue(false);

		expect(() =>
			validateAddr(invalidAddress, customTranslationKey, mockLogger),
		).toThrow(ProsopoApiError);
		expect(validateAddress).toHaveBeenCalledWith(invalidAddress, false, 42);
	});

	it("should handle empty address string", () => {
		const emptyAddress = "";

		vi.mocked(validateAddress).mockReturnValue(false);

		expect(() =>
			validateAddr(emptyAddress, "CONTRACT.INVALID_ADDRESS", mockLogger),
		).toThrow(ProsopoApiError);
		expect(validateAddress).toHaveBeenCalledWith(emptyAddress, false, 42);
	});

	it("should handle null address", () => {
		// biome-ignore lint/suspicious/noExplicitAny: tests
		const nullAddress = null as any;

		vi.mocked(validateAddress).mockReturnValue(false);

		expect(() =>
			validateAddr(nullAddress, "CONTRACT.INVALID_ADDRESS", mockLogger),
		).toThrow(ProsopoApiError);
		expect(validateAddress).toHaveBeenCalledWith(nullAddress, false, 42);
	});

	it("should validate hex addresses", () => {
		const hexAddress =
			"0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d";

		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() =>
			validateAddr(hexAddress, "CONTRACT.INVALID_ADDRESS", mockLogger),
		).not.toThrow();
		expect(validateAddress).toHaveBeenCalledWith(hexAddress, false, 42);
	});

	it("should validate base58 addresses", () => {
		const base58Address = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

		vi.mocked(validateAddress).mockReturnValue(true);

		expect(() =>
			validateAddr(base58Address, "CONTRACT.INVALID_ADDRESS", mockLogger),
		).not.toThrow();
		expect(validateAddress).toHaveBeenCalledWith(base58Address, false, 42);
	});
});
