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

/**
 * A slow detector assignment must still be used. Under the old 2000 ms cap on
 * both the assign POST and the blob import, a cold-connection assign (measured
 * at 6.7s against staging: fresh DNS + TLS + CORS preflight before ~215 KB of
 * bundle) blew the deadline, the surrounding catch swallowed it, and the
 * frictionless POST went out with an empty token and no detectorSessionId.
 */

import type { AssignDetectorBundleResponse } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` is hoisted; share state via `vi.hoisted` so the factories can
// reference the same spies the tests assert against.
const mocks = vi.hoisted(() => ({
	getFrictionlessCaptcha: vi.fn(),
	getProcaptchaRandomActiveProvider: vi.fn(),
	assignDetectorBundle: vi.fn(),
	detectorLoaderFromScript: vi.fn(),
	detect: vi.fn(),
}));

vi.mock("@prosopo/api", () => ({
	// customDetectBot does `new ProviderApi(...)`, so the implementation has to
	// be constructible — an arrow function has no [[Construct]] slot.
	ProviderApi: vi.fn(function () {
		return {
			getFrictionlessCaptcha: mocks.getFrictionlessCaptcha,
			assignDetectorBundle: mocks.assignDetectorBundle,
		};
	}),
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	ExtensionLoader: vi.fn(async () => {
		return class FakeExtension {
			getAccount() {
				return Promise.resolve({
					account: { address: "5FakeUserAccountAddress" },
				});
			}
		};
	}),
	getProcaptchaRandomActiveProvider: mocks.getProcaptchaRandomActiveProvider,
	pickIpMode: vi.fn(() => undefined),
}));

vi.mock("../detectorLoader.js", () => ({
	DetectorLoaderFromScript: mocks.detectorLoaderFromScript,
}));

import customDetectBot from "../customDetectBot.js";

const baseConfig = {
	account: { address: "5CcNvLUdiXFpzKDMjThGLSK9rhWHA1H4EF3zrgkpkjAdqmuP" },
	defaultEnvironment: "staging" as const,
	web2: true,
	mode: "visible" as const,
} as unknown as Parameters<typeof customDetectBot>[0];

const assignResponse: AssignDetectorBundleResponse = {
	useProviderBundle: true,
	detectorSessionId: "det-5cad2419-43c0-41b7-a9b8-0117767624bc",
	detectorScript: "SELF_CONTAINED_ESM",
	status: "ok",
};

const detectionResult = {
	token: "ENCRYPTED_TOKEN",
	encryptHeadHash: "ENCRYPTED_HEAD_HASH",
	userAccount: { account: { address: "5FakeUserAccountAddress" } },
	shadowDomCleanup: () => undefined,
};

const captchaResponse = {
	captchaType: "pow",
	sessionId: "SID",
	status: "ok",
};

// The measured cold-connection assign against staging.
const SLOW_MS = 6700;

const resolveAfter = <T>(ms: number, value: T): Promise<T> =>
	new Promise<T>((resolve) => {
		setTimeout(() => resolve(value), ms);
	});

// The token the frictionless POST was actually called with (first positional
// arg of `getFrictionlessCaptcha`).
const postedToken = (): string | undefined => {
	const call = mocks.getFrictionlessCaptcha.mock.calls[0];
	return call?.[0] as string | undefined;
};

const postedDetectorSessionId = (): string | undefined => {
	const call = mocks.getFrictionlessCaptcha.mock.calls[0];
	return call?.[6] as string | undefined;
};

beforeEach(() => {
	vi.useFakeTimers();
	mocks.getFrictionlessCaptcha.mockReset();
	mocks.getProcaptchaRandomActiveProvider.mockReset();
	mocks.assignDetectorBundle.mockReset();
	mocks.detectorLoaderFromScript.mockReset();
	mocks.detect.mockReset();

	mocks.getProcaptchaRandomActiveProvider.mockResolvedValue({
		providerAccount: "dns-routed",
		provider: { url: "https://staging-pronode3.prosopo.io" },
	});
	mocks.detect.mockResolvedValue(detectionResult);
	mocks.detectorLoaderFromScript.mockResolvedValue(mocks.detect);
	mocks.assignDetectorBundle.mockResolvedValue(assignResponse);
	mocks.getFrictionlessCaptcha.mockResolvedValue(captchaResponse);
});

afterEach(() => {
	vi.useRealTimers();
});

const runDetection = async (): Promise<void> => {
	const pending = customDetectBot(baseConfig, undefined, () => undefined);
	await vi.advanceTimersByTimeAsync(SLOW_MS + 1000);
	await pending;
};

describe("customDetectBot detector-assignment deadline", () => {
	it("uses a bundle whose assign POST is slow", async () => {
		mocks.assignDetectorBundle.mockImplementation(() =>
			resolveAfter(SLOW_MS, assignResponse),
		);

		await runDetection();

		expect(mocks.detectorLoaderFromScript).toHaveBeenCalledWith(
			assignResponse.detectorScript,
		);
		expect(postedToken()).toBe("ENCRYPTED_TOKEN");
		expect(postedDetectorSessionId()).toBe(assignResponse.detectorSessionId);
	});

	it("uses a bundle whose blob import is slow", async () => {
		mocks.detectorLoaderFromScript.mockImplementation(() =>
			resolveAfter(SLOW_MS, mocks.detect),
		);

		await runDetection();

		expect(postedToken()).toBe("ENCRYPTED_TOKEN");
		expect(postedDetectorSessionId()).toBe(assignResponse.detectorSessionId);
	});

	it("still sends an empty token when the provider has no bundle to assign", async () => {
		mocks.assignDetectorBundle.mockResolvedValue({
			useProviderBundle: false,
			status: "ok",
		} satisfies AssignDetectorBundleResponse);

		await runDetection();

		expect(mocks.detectorLoaderFromScript).not.toHaveBeenCalled();
		expect(postedToken()).toBeUndefined();
		expect(postedDetectorSessionId()).toBeUndefined();
	});
});
