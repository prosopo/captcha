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

import type { BehavioralData, TouchEventPoint } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getFrictionlessCaptcha: vi.fn(),
	getProcaptchaRandomActiveProvider: vi.fn(),
	assignDetectorBundle: vi.fn(),
	detect: vi.fn(),
}));

vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn(function () {
		return {
			getFrictionlessCaptcha: mocks.getFrictionlessCaptcha,
			assignDetectorBundle: mocks.assignDetectorBundle,
		};
	}),
}));

vi.mock("@prosopo/procaptcha-common", async (importOriginal) => ({
	...(await importOriginal<typeof import("@prosopo/procaptcha-common")>()),
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

vi.mock("../detectorLoader.js", () => ({
	DetectorLoaderFromScript: vi.fn(async () => mocks.detect),
}));

import customDetectBot from "../customDetectBot.js";

const baseConfig = {
	account: { address: "5FakeSiteKey" },
	defaultEnvironment: "production" as const,
	web2: true,
	mode: "frictionless" as const,
} as unknown as Parameters<typeof customDetectBot>[0];

const BEHAVIOURAL_DATA_ARG = 16;

const tracker = <T>(points: T[]) => ({
	start: vi.fn(),
	stop: vi.fn(),
	getData: (): T[] => [...points],
	clear: vi.fn(),
});

const tap: TouchEventPoint = {
	x: 10,
	y: 20,
	timestamp: 100,
	eventType: "touchstart",
	touchCount: 1,
};

const detectionResult = (
	encryptBehavioralData?: (data: string) => Promise<string>,
) => ({
	token: "TOKEN",
	encryptHeadHash: "HASH",
	userAccount: { account: { address: "5FakeUserAccountAddress" } },
	mouseTracker: tracker([]),
	touchTracker: tracker([tap]),
	clickTracker: tracker([]),
	scrollTracker: tracker([]),
	hasTouchSupport: "mobile",
	encryptBehavioralData,
});

const sentBehaviouralData = (): unknown =>
	mocks.getFrictionlessCaptcha.mock.calls[0]?.[BEHAVIOURAL_DATA_ARG];

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getProcaptchaRandomActiveProvider.mockResolvedValue({
		providerAccount: "dns-routed",
		provider: { url: "https://provider.test" },
	});
	mocks.assignDetectorBundle.mockResolvedValue({
		useProviderBundle: true,
		detectorSessionId: "det-1",
		detectorScript: "SELF_CONTAINED_ESM",
		status: "ok",
	});
	mocks.getFrictionlessCaptcha.mockResolvedValue({
		captchaType: "puzzle",
		sessionId: "SID",
		status: "ok",
	});
});

describe("customDetectBot behavioural data on /frictionless", () => {
	it("sends the encrypted readings gathered during detection", async () => {
		const encrypt = vi.fn(
			async (data: string): Promise<string> => `enc(${data})`,
		);
		mocks.detect.mockResolvedValue(detectionResult(encrypt));

		await customDetectBot(baseConfig, undefined, () => undefined);

		const sent: BehavioralData = JSON.parse(String(encrypt.mock.calls[0]?.[0]));
		expect(sent.collector2).toEqual([tap]);
		expect(sent.deviceCapability).toBe("mobile");
		expect(sentBehaviouralData()).toBe(`enc(${JSON.stringify(sent)})`);
	});

	it("still asks for a challenge when the readings cannot be encrypted", async () => {
		mocks.detect.mockResolvedValue(
			detectionResult(async (): Promise<string> => {
				throw new Error("encrypt failed");
			}),
		);

		const result = await customDetectBot(
			baseConfig,
			undefined,
			() => undefined,
		);

		expect(sentBehaviouralData()).toBeUndefined();
		expect(result.sessionId).toBe("SID");
	});

	it("keeps the collectors on the result for the solve", async () => {
		mocks.detect.mockResolvedValue(
			detectionResult(async (data: string): Promise<string> => data),
		);

		const result = await customDetectBot(
			baseConfig,
			undefined,
			() => undefined,
		);

		expect(result.behaviorCollector2?.getData()).toEqual([tap]);
		expect(result.deviceCapability).toBe("mobile");
	});
});
