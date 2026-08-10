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

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getProcaptchaRandomActiveProvider,
	getRetryDelayMs,
	pickIpMode,
	providerRetry,
} from "../providers.js";

vi.mock("@prosopo/load-balancer", () => ({
	getRandomActiveProvider: vi.fn(async (env: string) => ({
		providerAccount: "dns-routed",
		provider: {
			url:
				env === "production"
					? "https://pronode.prosopo.io"
					: "http://localhost:9229",
		},
	})),
	getRandomProviderFromList: vi.fn(
		async (_env: string, _ipMode?: string, excludeUrl?: string) => ({
			providerAccount: "5FromList",
			provider: {
				url: excludeUrl
					? "https://provider-from-list-b.io"
					: "https://provider-from-list-a.io",
			},
		}),
	),
}));

describe("providers", () => {
	// The load-balancer mock functions are module-level, so their call history
	// accumulates across tests — clear it between cases to keep call-count
	// assertions independent.
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getProcaptchaRandomActiveProvider", () => {
		it("delegates to the load-balancer static-DNS resolver", async () => {
			const { getRandomActiveProvider } = await import(
				"@prosopo/load-balancer"
			);

			const result = await getProcaptchaRandomActiveProvider("production");

			expect(getRandomActiveProvider).toHaveBeenCalledWith(
				"production",
				undefined,
			);
			expect(result.provider.url).toBe("https://pronode.prosopo.io");
		});

		it("forwards the ipMode parameter to the load-balancer resolver", async () => {
			const { getRandomActiveProvider } = await import(
				"@prosopo/load-balancer"
			);

			await getProcaptchaRandomActiveProvider("production", "ipv4");

			expect(getRandomActiveProvider).toHaveBeenCalledWith(
				"production",
				"ipv4",
			);
		});

		it("uses the DNS-routed resolver on the first attempt", async () => {
			const { getRandomActiveProvider, getRandomProviderFromList } =
				await import("@prosopo/load-balancer");

			const result = await getProcaptchaRandomActiveProvider(
				"production",
				undefined,
				{ attempt: 1 },
			);

			expect(getRandomActiveProvider).toHaveBeenCalled();
			expect(getRandomProviderFromList).not.toHaveBeenCalled();
			expect(result.provider.url).toBe("https://pronode.prosopo.io");
		});

		it("picks a random provider from the list on a retry", async () => {
			const { getRandomProviderFromList } = await import(
				"@prosopo/load-balancer"
			);

			const result = await getProcaptchaRandomActiveProvider(
				"production",
				"ipv4",
				{ attempt: 2, excludeUrl: "https://pronode.prosopo.io" },
			);

			expect(getRandomProviderFromList).toHaveBeenCalledWith(
				"production",
				"ipv4",
				"https://pronode.prosopo.io",
			);
			// The mock returns a different url when an excludeUrl is supplied.
			expect(result.provider.url).toBe("https://provider-from-list-b.io");
		});
	});

	describe("getRetryDelayMs", () => {
		it("grows exponentially from the base delay, capped at the max", () => {
			// random=1 → full jittered value == the (capped) exponential ceiling.
			expect(getRetryDelayMs(0, () => 1)).toBe(500);
			expect(getRetryDelayMs(1, () => 1)).toBe(1000);
			expect(getRetryDelayMs(2, () => 1)).toBe(2000);
			expect(getRetryDelayMs(3, () => 1)).toBe(4000);
			// 500 * 2^6 = 32000 → capped at 10000.
			expect(getRetryDelayMs(6, () => 1)).toBe(10000);
			expect(getRetryDelayMs(20, () => 1)).toBe(10000);
		});

		it("applies full jitter — a fraction of the ceiling", () => {
			// random=0 → no delay; random=0.5 → half the ceiling.
			expect(getRetryDelayMs(2, () => 0)).toBe(0);
			expect(getRetryDelayMs(2, () => 0.5)).toBe(1000);
		});

		it("clamps negative or fractional attempt counts", () => {
			expect(getRetryDelayMs(-5, () => 1)).toBe(500);
			expect(getRetryDelayMs(1.9, () => 1)).toBe(1000);
		});
	});

	describe("pickIpMode", () => {
		it("picks ipv4 when both flags are set", () => {
			expect(pickIpMode({ ipv4: true, ipv6: true })).toBe("ipv4");
		});

		it("returns undefined when neither flag is set", () => {
			expect(pickIpMode({})).toBeUndefined();
			expect(pickIpMode(undefined)).toBeUndefined();
		});

		it("returns ipv6 when only ipv6 is set", () => {
			expect(pickIpMode({ ipv6: true })).toBe("ipv6");
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

			// backoffMs=0 keeps the test fast; timing is covered by getRetryDelayMs.
			await providerRetry(currentFn, retryFn, stateReset, 1, 3, 0);

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
				providerRetry(currentFn, retryFn, stateReset, 1, 3, 0),
			).rejects.toThrow("Retry failed");

			expect(currentFn).toHaveBeenCalledTimes(1);
			expect(stateReset).toHaveBeenCalledTimes(1);
			expect(retryFn).toHaveBeenCalledTimes(1);

			consoleErrorSpy.mockRestore();
		});

		it("waits for the backoff delay before retrying", async () => {
			const error = new Error("Provider failed");
			const currentFn = vi.fn().mockRejectedValue(error);
			const order: string[] = [];
			const retryFn = vi.fn(async () => {
				order.push("retry");
			});
			const stateReset = vi.fn(() => {
				order.push("reset");
			});
			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const start = Date.now();
			await providerRetry(currentFn, retryFn, stateReset, 1, 3, 40);
			const elapsed = Date.now() - start;

			// State is reset before the wait, then the retry fires after the delay.
			expect(order).toEqual(["reset", "retry"]);
			expect(elapsed).toBeGreaterThanOrEqual(30);
			expect(retryFn).toHaveBeenCalledTimes(1);

			consoleErrorSpy.mockRestore();
		});
	});
});
