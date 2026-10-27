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
 * The proof of fingerprint used to go out only with a PoW solution, so a
 * session served a puzzle or an image never recorded its device bucket. It is
 * now sent with the frictionless request, best-effort: a proof that fails or
 * is slow is left off rather than holding the captcha up.
 */

import { widgetLanguageHeaders } from "@prosopo/locale";
import type { AssignDetectorBundleResponse } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getFrictionlessCaptcha: vi.fn(),
	getProcaptchaRandomActiveProvider: vi.fn(),
	assignDetectorBundle: vi.fn(),
	detectorLoaderFromScript: vi.fn(),
	detect: vi.fn(),
	getFingerprintProof: vi.fn(),
	encodeFingerprintProof: vi.fn(),
}));

vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn(function () {
		return {
			getFrictionlessCaptcha: mocks.getFrictionlessCaptcha,
			assignDetectorBundle: mocks.assignDetectorBundle,
		};
	}),
}));

vi.mock("@prosopo/procaptcha-common", () => ({
	widgetRequestHeaders: (
		siteLanguage: string | undefined,
	): Record<string, string> => widgetLanguageHeaders(siteLanguage),
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
	resolveClientSessionId: vi.fn(
		(clientSessionId?: string): string | undefined => clientSessionId,
	),
}));

vi.mock("@prosopo/fingerprint", () => ({
	FINGERPRINT_DISCLOSURE_KEYS: ["timezone", "deviceBucket"],
	getFingerprintProof: mocks.getFingerprintProof,
	encodeFingerprintProof: mocks.encodeFingerprintProof,
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

const ENCODED_PROOF = "ENCODED_PROOF";

/** The proof argument of the frictionless request. */
const postedProof = (): string | undefined =>
	mocks.getFrictionlessCaptcha.mock.calls[0]?.[12] as string | undefined;

const runDetection = async (): Promise<void> => {
	const pending = customDetectBot(baseConfig, undefined, () => undefined);
	await vi.advanceTimersByTimeAsync(5000);
	await pending;
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	mocks.getProcaptchaRandomActiveProvider.mockResolvedValue({
		providerAccount: "dns-routed",
		provider: { url: "https://staging-pronode3.prosopo.io" },
	});
	mocks.detect.mockResolvedValue({
		token: "ENCRYPTED_TOKEN",
		encryptHeadHash: "ENCRYPTED_HEAD_HASH",
		userAccount: { account: { address: "5FakeUserAccountAddress" } },
		shadowDomCleanup: () => undefined,
	});
	mocks.detectorLoaderFromScript.mockResolvedValue(mocks.detect);
	mocks.assignDetectorBundle.mockResolvedValue(assignResponse);
	mocks.getFrictionlessCaptcha.mockResolvedValue({
		captchaType: "puzzle",
		sessionId: "SID",
		status: "ok",
	});
	mocks.getFingerprintProof.mockResolvedValue({ root: "0xroot" });
	mocks.encodeFingerprintProof.mockReturnValue(ENCODED_PROOF);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("proof of fingerprint on the frictionless request", () => {
	it("is sent when the detector ran", async () => {
		await runDetection();

		expect(mocks.getFingerprintProof).toHaveBeenCalledWith([
			"timezone",
			"deviceBucket",
		]);
		expect(postedProof()).toBe(ENCODED_PROOF);
	});

	it("is sent when the provider had no detector to assign", async () => {
		mocks.assignDetectorBundle.mockResolvedValue({
			useProviderBundle: false,
			status: "ok",
		} satisfies AssignDetectorBundleResponse);

		await runDetection();

		expect(mocks.detectorLoaderFromScript).not.toHaveBeenCalled();
		expect(postedProof()).toBe(ENCODED_PROOF);
	});

	it("is left off, and the request still sent, when the proof fails", async () => {
		mocks.getFingerprintProof.mockRejectedValue(new Error("no components"));

		await runDetection();

		expect(mocks.getFrictionlessCaptcha).toHaveBeenCalledTimes(1);
		expect(postedProof()).toBeUndefined();
	});

	it("is left off when building it takes longer than a second", async () => {
		mocks.getFingerprintProof.mockReturnValue(new Promise(() => undefined));

		await runDetection();

		expect(mocks.getFrictionlessCaptcha).toHaveBeenCalledTimes(1);
		expect(postedProof()).toBeUndefined();
	});
});
