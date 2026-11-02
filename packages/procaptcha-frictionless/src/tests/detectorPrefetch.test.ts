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

import type { ProviderApi } from "@prosopo/api";
import { LANGUAGE_HEADER, widgetLanguageHeaders } from "@prosopo/locale";
import type { EnvironmentTypes } from "@prosopo/types";
import { afterEach, describe, expect, it, vi } from "vitest";

const assignDetectorBundle = vi.fn();
const getProcaptchaRandomActiveProvider = vi.fn();
const providerApiArgs = vi.fn();

vi.mock("@prosopo/api", () => ({
	ProviderApi: class {
		assignDetectorBundle = assignDetectorBundle;
		constructor(...args: ConstructorParameters<typeof ProviderApi>) {
			providerApiArgs(...args);
		}
	},
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	widgetRequestHeaders: (
		siteLanguage: string | undefined,
	): Record<string, string> => widgetLanguageHeaders(siteLanguage),
	getProcaptchaRandomActiveProvider: (
		...args: [EnvironmentTypes, string | undefined]
	) => getProcaptchaRandomActiveProvider(...args),
}));

const { prefetchDetector, takePrefetchedDetector, clearPrefetchedDetectors } =
	await import("../detectorPrefetch.js");

const ENV = "staging" as EnvironmentTypes;
const SITE_KEY = "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP";

const provider = { provider: { url: "https://pronode.example" } };

afterEach(() => {
	clearPrefetchedDetectors();
	vi.clearAllMocks();
	vi.useRealTimers();
});

describe("detectorPrefetch", () => {
	it("returns undefined when nothing was prefetched", () => {
		expect(takePrefetchedDetector(ENV, undefined, SITE_KEY)).toBeUndefined();
	});

	it("resolves the provider and assigns a bundle", async () => {
		getProcaptchaRandomActiveProvider.mockResolvedValue(provider);
		assignDetectorBundle.mockResolvedValue({ useProviderBundle: true });

		prefetchDetector(ENV, undefined, SITE_KEY);
		const claimed = takePrefetchedDetector(ENV, undefined, SITE_KEY);
		expect(claimed).toBeDefined();

		const result = await (claimed as Promise<unknown>);
		expect(result).toStrictEqual({
			provider,
			assigned: { useProviderBundle: true },
		});
		expect(assignDetectorBundle).toHaveBeenCalledWith(SITE_KEY);
	});

	it("sends the site's language with the assignment request", async () => {
		getProcaptchaRandomActiveProvider.mockResolvedValue(provider);
		assignDetectorBundle.mockResolvedValue({ useProviderBundle: true });

		prefetchDetector(ENV, undefined, SITE_KEY, "tr");
		await takePrefetchedDetector(ENV, undefined, SITE_KEY);

		expect(providerApiArgs).toHaveBeenCalledWith(
			provider.provider.url,
			SITE_KEY,
			undefined,
			{ [LANGUAGE_HEADER]: "tr" },
		);
	});

	it("hands every widget on the page the same assignment", async () => {
		getProcaptchaRandomActiveProvider.mockResolvedValue(provider);
		assignDetectorBundle.mockResolvedValue({ useProviderBundle: true });

		prefetchDetector(ENV, undefined, SITE_KEY);
		const first = takePrefetchedDetector(ENV, undefined, SITE_KEY);
		await (first as Promise<unknown>);

		expect(takePrefetchedDetector(ENV, undefined, SITE_KEY)).toBe(first);
		expect(getProcaptchaRandomActiveProvider).toHaveBeenCalledTimes(1);
		expect(assignDetectorBundle).toHaveBeenCalledTimes(1);
	});

	it("does not hand a failed pin to a later widget", async () => {
		getProcaptchaRandomActiveProvider.mockRejectedValue(
			new Error("no provider"),
		);

		prefetchDetector(ENV, undefined, SITE_KEY);
		const first = takePrefetchedDetector(ENV, undefined, SITE_KEY);
		await (first as Promise<unknown>).catch(() => undefined);

		expect(takePrefetchedDetector(ENV, undefined, SITE_KEY)).toBeUndefined();
	});

	it("does not hand out a pin older than a minute", () => {
		vi.useFakeTimers();
		getProcaptchaRandomActiveProvider.mockResolvedValue(provider);
		assignDetectorBundle.mockResolvedValue({ useProviderBundle: true });

		prefetchDetector(ENV, undefined, SITE_KEY);
		expect(takePrefetchedDetector(ENV, undefined, SITE_KEY)).toBeDefined();

		vi.advanceTimersByTime(61_000);
		expect(takePrefetchedDetector(ENV, undefined, SITE_KEY)).toBeUndefined();
	});

	it("starts a fresh request when the existing one is older than a minute", () => {
		vi.useFakeTimers();
		getProcaptchaRandomActiveProvider.mockResolvedValue(provider);
		assignDetectorBundle.mockResolvedValue({ useProviderBundle: true });

		prefetchDetector(ENV, undefined, SITE_KEY);
		const first = takePrefetchedDetector(ENV, undefined, SITE_KEY);

		vi.advanceTimersByTime(61_000);
		prefetchDetector(ENV, undefined, SITE_KEY);

		expect(getProcaptchaRandomActiveProvider).toHaveBeenCalledTimes(2);
		const second = takePrefetchedDetector(ENV, undefined, SITE_KEY);
		expect(second).toBeDefined();
		expect(second).not.toBe(first);
	});

	it("does not start a second request for the same key", () => {
		getProcaptchaRandomActiveProvider.mockResolvedValue(provider);
		assignDetectorBundle.mockResolvedValue({ useProviderBundle: true });

		prefetchDetector(ENV, undefined, SITE_KEY);
		prefetchDetector(ENV, undefined, SITE_KEY);

		expect(getProcaptchaRandomActiveProvider).toHaveBeenCalledTimes(1);
	});

	it("keys on site key and ip mode, so a different widget does not claim it", () => {
		getProcaptchaRandomActiveProvider.mockResolvedValue(provider);
		assignDetectorBundle.mockResolvedValue({ useProviderBundle: true });

		prefetchDetector(ENV, "ipv4", SITE_KEY);

		expect(takePrefetchedDetector(ENV, "ipv6", SITE_KEY)).toBeUndefined();
		expect(takePrefetchedDetector(ENV, undefined, SITE_KEY)).toBeUndefined();
		expect(takePrefetchedDetector(ENV, "ipv4", "other-key")).toBeUndefined();
		expect(takePrefetchedDetector(ENV, "ipv4", SITE_KEY)).toBeDefined();
	});

	it("surfaces failure to the claimant without an unhandled rejection", async () => {
		getProcaptchaRandomActiveProvider.mockRejectedValue(
			new Error("no providers"),
		);

		prefetchDetector(ENV, undefined, SITE_KEY);
		const claimed = takePrefetchedDetector(ENV, undefined, SITE_KEY);
		expect(claimed).toBeDefined();

		// customDetectBot awaits this inside a try/catch and falls back; the point
		// here is that it rejects rather than hanging, and that the no-op catch
		// attached at prefetch time did not swallow it for the real consumer.
		await expect(claimed as Promise<unknown>).rejects.toThrow("no providers");
	});
});
