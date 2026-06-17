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

// `vi.mock` is hoisted; share state via `vi.hoisted` so the factories can
// reference the same spies the tests assert against.
const mocks = vi.hoisted(() => ({
	getFrictionlessCaptcha: vi.fn(),
	getRandomActiveProvider: vi.fn(),
	prefetchProviders: vi.fn(async () => undefined),
	detect: vi.fn(),
}));

vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn(() => ({
		getFrictionlessCaptcha: mocks.getFrictionlessCaptcha,
	})),
}));

vi.mock("@prosopo/load-balancer", () => ({
	getRandomActiveProvider: mocks.getRandomActiveProvider,
	prefetchProviders: mocks.prefetchProviders,
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
	pickIpMode: (flags: { ipv4?: boolean; ipv6?: boolean } | undefined) => {
		if (flags?.ipv4) return "ipv4";
		if (flags?.ipv6) return "ipv6";
		return undefined;
	},
}));

vi.mock("../detectorLoader.js", () => ({
	DetectorLoader: vi.fn(async () => mocks.detect),
}));

import customDetectBot from "../customDetectBot.js";

const baseConfig = {
	account: { address: "5FakeSiteKey" },
	defaultEnvironment: "production" as const,
	web2: true,
	mode: "frictionless" as const,
} as unknown as Parameters<typeof customDetectBot>[0];

const makeDetectionResult = (
	getSimdReadings?: (timeoutMs: number) => Promise<string | undefined>,
) => ({
	token: "TOKEN",
	encryptHeadHash: "HASH",
	userAccount: { account: { address: "5FakeUserAccountAddress" } },
	provider: {
		provider: { url: "https://provider.test" },
		providerAccount: "5Provider",
	},
	getSimdReadings,
	mouseTracker: undefined,
	touchTracker: undefined,
	clickTracker: undefined,
});

const captchaResponse = {
	captchaType: "pow",
	sessionId: "SID",
	status: "ok",
};

beforeEach(() => {
	mocks.getFrictionlessCaptcha.mockReset();
	mocks.getRandomActiveProvider.mockReset();
	mocks.prefetchProviders.mockReset();
	mocks.detect.mockReset();
	mocks.prefetchProviders.mockResolvedValue(undefined);
	mocks.getFrictionlessCaptcha.mockResolvedValue(captchaResponse);
});

describe("customDetectBot SIMD deferral", () => {
	it("passes simdReadings as undefined to the frictionless POST even when getSimdReadings would return a value", async () => {
		const getSimdReadings = vi.fn().mockResolvedValue("ENCODED_SIMD");
		mocks.detect.mockResolvedValue(makeDetectionResult(getSimdReadings));

		await customDetectBot(baseConfig, undefined, () => undefined);

		expect(mocks.getFrictionlessCaptcha).toHaveBeenCalledTimes(1);
		const args = mocks.getFrictionlessCaptcha.mock.calls[0];
		// args: token, headHash, dappAccount, userAccount, mode, simdReadings
		expect(args?.[5]).toBeUndefined();
	});

	it("fires getSimdReadings after the frictionless POST is initiated (fire-and-forget)", async () => {
		const callOrder: string[] = [];
		mocks.getFrictionlessCaptcha.mockImplementation(() => {
			callOrder.push("captcha-call");
			return Promise.resolve(captchaResponse);
		});
		const getSimdReadings = vi.fn().mockImplementation(() => {
			callOrder.push("simd-call");
			return Promise.resolve("ENCODED_SIMD");
		});
		mocks.detect.mockResolvedValue(makeDetectionResult(getSimdReadings));

		await customDetectBot(baseConfig, undefined, () => undefined);

		expect(getSimdReadings).toHaveBeenCalledTimes(1);
		// SIMD trigger must come AFTER the frictionless POST is initiated.
		expect(callOrder.indexOf("captcha-call")).toBeLessThan(
			callOrder.indexOf("simd-call"),
		);
	});

	it("does not block the frictionless POST on a slow getSimdReadings", async () => {
		let simdResolve!: (v: string) => void;
		const simdPromise = new Promise<string>((resolve) => {
			simdResolve = resolve;
		});
		const getSimdReadings = vi.fn().mockReturnValue(simdPromise);
		mocks.detect.mockResolvedValue(makeDetectionResult(getSimdReadings));

		// If the POST awaited getSimdReadings, this would hang forever.
		const result = await customDetectBot(
			baseConfig,
			undefined,
			() => undefined,
		);

		expect(result.sessionId).toBe("SID");
		// Resolve afterwards so the unhandled promise doesn't leak.
		simdResolve("ENCODED_SIMD");
	});

	it("skips the SIMD trigger when the detector doesn't expose getSimdReadings", async () => {
		mocks.detect.mockResolvedValue(makeDetectionResult(undefined));

		const result = await customDetectBot(
			baseConfig,
			undefined,
			() => undefined,
		);

		expect(result.sessionId).toBe("SID");
		expect(mocks.getFrictionlessCaptcha).toHaveBeenCalledTimes(1);
	});
});
