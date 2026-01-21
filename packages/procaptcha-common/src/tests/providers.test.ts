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

import { describe, expect, it, vi } from "vitest";
import {
	getProcaptchaRandomActiveProvider,
	providerRetry,
} from "../providers.js";

describe("providers", () => {
	describe("getProcaptchaRandomActiveProvider", () => {
		it("should return localhost for development environment", async () => {
			const result = await getProcaptchaRandomActiveProvider("development");

			expect(result.providerAccount).toBe("provider-dns-endpoint");
			expect(result.provider.url).toBe("http://localhost:9229");
		});

		it("should return staging DNS URL for staging environment", async () => {
			const result = await getProcaptchaRandomActiveProvider("staging");

			expect(result.providerAccount).toBe("provider-dns-endpoint");
			expect(result.provider.url).toBe("https://staging.pronode.prosopo.io");
		});

		it("should return production DNS URL for production environment", async () => {
			const result = await getProcaptchaRandomActiveProvider("production");

			expect(result.providerAccount).toBe("provider-dns-endpoint");
			expect(result.provider.url).toBe("https://pronode.prosopo.io");
		});

		it("should return consistent results when called multiple times", async () => {
			const result1 = await getProcaptchaRandomActiveProvider("staging");
			const result2 = await getProcaptchaRandomActiveProvider("staging");

			expect(result1).toEqual(result2);
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
