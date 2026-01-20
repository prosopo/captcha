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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getProcaptchaRandomActiveProvider,
	providerRetry,
} from "../providers.js";

// Mock the load-balancer module
vi.mock("@prosopo/load-balancer", () => ({
	getRandomActiveProvider: vi.fn(),
}));

describe("providers", () => {
	describe("getProcaptchaRandomActiveProvider", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Store original crypto function
		let originalGetRandomValues: any;

		beforeEach(() => {
			originalGetRandomValues = global.window.crypto.getRandomValues.bind(
				global.window.crypto,
			);
		});

		afterEach(() => {
			global.window.crypto.getRandomValues = originalGetRandomValues;
		});

		it("should generate random values and call getRandomActiveProvider", async () => {
			// Mock window.crypto.getRandomValues
			const mockRandomValues = new Uint8Array([
				10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
			]);
			const mockGetRandomValues = vi.fn(() => mockRandomValues);
			// biome-ignore lint/suspicious/noExplicitAny: Mock crypto API
			global.window.crypto.getRandomValues = mockGetRandomValues as any;

			// Mock the getRandomActiveProvider import
			const { getRandomActiveProvider } = await import(
				"@prosopo/load-balancer"
			);
			vi.mocked(getRandomActiveProvider).mockResolvedValue({
				providerUrl: "https://test-provider.com",
				// biome-ignore lint/suspicious/noExplicitAny: Mock return type
			} as any);

			const result = await getProcaptchaRandomActiveProvider("development");

			expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
			// Entropy is passed (550 = sum of mockRandomValues) but ignored by DNS-based load balancing
			expect(getRandomActiveProvider).toHaveBeenCalledWith("development", 550);
			expect(result).toEqual({ providerUrl: "https://test-provider.com" });
		});

		it("should use different random values on each call", async () => {
			let callCount = 0;
			const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
				callCount++;
				arr.fill(callCount);
				return arr;
			});
			// biome-ignore lint/suspicious/noExplicitAny: Mock crypto API
			global.window.crypto.getRandomValues = mockGetRandomValues as any;

			const { getRandomActiveProvider } = await import(
				"@prosopo/load-balancer"
			);
			// biome-ignore lint/suspicious/noExplicitAny: Mock return type
			vi.mocked(getRandomActiveProvider).mockResolvedValue({} as any);

			await getProcaptchaRandomActiveProvider("development");
			await getProcaptchaRandomActiveProvider("development");

			expect(mockGetRandomValues).toHaveBeenCalledTimes(2);
		});
	});

	describe("providerRetry", () => {
		it("should successfully execute currentFn without retrying", async () => {
			const currentFn = vi.fn().mockResolvedValue(undefined);
			const retryFn = vi.fn();
			const stateReset = vi.fn();

			await providerRetry(currentFn, retryFn, stateReset, 0, 3);

			expect(currentFn).toHaveBeenCalledTimes(1);
			expect(retryFn).not.toHaveBeenCalled();
			expect(stateReset).not.toHaveBeenCalled();
		});

		it("should call retryFn when currentFn fails and attempts are below max", async () => {
			const error = new Error("Provider failed");
			const currentFn = vi.fn().mockRejectedValue(error);
			const retryFn = vi.fn().mockResolvedValue(undefined);
			const stateReset = vi.fn();

			await providerRetry(currentFn, retryFn, stateReset, 1, 3);

			expect(currentFn).toHaveBeenCalledTimes(1);
			expect(stateReset).toHaveBeenCalledTimes(1);
			expect(retryFn).toHaveBeenCalledTimes(1);
		});

		it("should call stateReset and not retry when max retries reached", async () => {
			const error = new Error("Provider failed");
			const currentFn = vi.fn().mockRejectedValue(error);
			const retryFn = vi.fn();
			const stateReset = vi.fn();
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			await providerRetry(currentFn, retryFn, stateReset, 3, 3);

			expect(currentFn).toHaveBeenCalledTimes(1);
			expect(stateReset).toHaveBeenCalledTimes(1);
			expect(retryFn).not.toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledWith(error);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Max retries (3 of 3) reached, aborting",
			);

			consoleErrorSpy.mockRestore();
		});

		it("should call stateReset and not retry when attempts exceed max", async () => {
			const error = new Error("Provider failed");
			const currentFn = vi.fn().mockRejectedValue(error);
			const retryFn = vi.fn();
			const stateReset = vi.fn();
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			await providerRetry(currentFn, retryFn, stateReset, 5, 3);

			expect(currentFn).toHaveBeenCalledTimes(1);
			expect(stateReset).toHaveBeenCalledTimes(1);
			expect(retryFn).not.toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});

		it("should reset state even when retryFn fails", async () => {
			const error = new Error("Provider failed");
			const currentFn = vi.fn().mockRejectedValue(error);
			const retryFn = vi.fn().mockRejectedValue(new Error("Retry failed"));
			const stateReset = vi.fn();
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			await expect(
				providerRetry(currentFn, retryFn, stateReset, 1, 3),
			).rejects.toThrow("Retry failed");

			expect(currentFn).toHaveBeenCalledTimes(1);
			expect(stateReset).toHaveBeenCalledTimes(1);
			expect(retryFn).toHaveBeenCalledTimes(1);

			consoleErrorSpy.mockRestore();
		});
	});
});
