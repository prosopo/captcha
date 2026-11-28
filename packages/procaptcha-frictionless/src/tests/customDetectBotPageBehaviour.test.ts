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

import {
	startPageBehaviourCapture,
	stopPageBehaviourCapture,
} from "@prosopo/procaptcha-common";
import type { ClickEventPoint, MouseMovementPoint } from "@prosopo/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

// The page-behaviour functions stay real: merging them in is what's tested.
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

const tracker = <T>(points: T[]) => ({
	start: vi.fn(),
	stop: vi.fn(),
	getData: (): T[] => [...points],
	clear: vi.fn(),
});

const resetCapture = (): void => {
	stopPageBehaviourCapture();
	delete (globalThis as unknown as Record<symbol, unknown>)[
		Symbol.for("prosopo.pageBehaviour")
	];
};

beforeEach(() => {
	resetCapture();
	vi.useFakeTimers({ toFake: ["Date"] });
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
		captchaType: "pow",
		sessionId: "SID",
		status: "ok",
	});
});

afterEach(() => {
	resetCapture();
	vi.useRealTimers();
});

describe("customDetectBot page behaviour", () => {
	it("puts what the visitor did before detection in front of the detector's data", async () => {
		startPageBehaviourCapture();
		vi.setSystemTime(100);
		window.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 1, clientY: 1 }),
		);
		vi.setSystemTime(200);
		window.dispatchEvent(new MouseEvent("click", { clientX: 5, clientY: 5 }));

		const trackedMove: MouseMovementPoint = { x: 9, y: 9, timestamp: 300 };
		const trackedClick: ClickEventPoint = {
			x: 5,
			y: 5,
			timestamp: 200,
			eventType: "click",
			button: 0,
			targetElement: "DIV",
		};
		mocks.detect.mockResolvedValue({
			token: "TOKEN",
			encryptHeadHash: "HASH",
			userAccount: { account: { address: "5FakeUserAccountAddress" } },
			mouseTracker: tracker([trackedMove]),
			touchTracker: tracker([]),
			clickTracker: tracker([trackedClick]),
			scrollTracker: tracker([]),
		});

		const result = await customDetectBot(
			baseConfig,
			undefined,
			() => undefined,
		);

		expect(result.behaviorCollector1?.getData()).toEqual([
			{ x: 1, y: 1, timestamp: 100 },
			trackedMove,
		]);
		expect(result.behaviorCollector3?.getData()).toEqual([trackedClick]);
	});

	it("leaves out page events recorded after the detector took over", async () => {
		startPageBehaviourCapture();
		vi.setSystemTime(100);
		mocks.detect.mockResolvedValue({
			token: "TOKEN",
			encryptHeadHash: "HASH",
			userAccount: { account: { address: "5FakeUserAccountAddress" } },
			mouseTracker: tracker<MouseMovementPoint>([]),
		});

		const result = await customDetectBot(
			baseConfig,
			undefined,
			() => undefined,
		);
		vi.setSystemTime(200);
		window.dispatchEvent(new MouseEvent("mousemove"));

		expect(result.behaviorCollector1?.getData()).toEqual([]);
	});

	it("keeps taps made between a reset's two detector starts in the next solve", async () => {
		startPageBehaviourCapture();
		vi.setSystemTime(100);
		window.dispatchEvent(new MouseEvent("click", { clientX: 1, clientY: 1 }));

		const firstDetectorClick: ClickEventPoint = {
			x: 2,
			y: 2,
			timestamp: 300,
			eventType: "click",
			button: 0,
			targetElement: "DIV",
		};
		vi.setSystemTime(200);
		mocks.detect.mockResolvedValueOnce({
			token: "TOKEN",
			encryptHeadHash: "HASH",
			userAccount: { account: { address: "5FakeUserAccountAddress" } },
			clickTracker: tracker([firstDetectorClick]),
		});
		await customDetectBot(baseConfig, undefined, () => undefined);

		vi.setSystemTime(300);
		window.dispatchEvent(new MouseEvent("click", { clientX: 2, clientY: 2 }));
		vi.setSystemTime(400);
		window.dispatchEvent(new MouseEvent("click", { clientX: 3, clientY: 3 }));

		const secondDetectorClick: ClickEventPoint = {
			x: 4,
			y: 4,
			timestamp: 600,
			eventType: "click",
			button: 0,
			targetElement: "DIV",
		};
		vi.setSystemTime(500);
		mocks.detect.mockResolvedValueOnce({
			token: "TOKEN",
			encryptHeadHash: "HASH",
			userAccount: { account: { address: "5FakeUserAccountAddress" } },
			clickTracker: tracker([secondDetectorClick]),
		});
		const afterReset = await customDetectBot(
			baseConfig,
			undefined,
			() => undefined,
		);
		vi.setSystemTime(600);
		window.dispatchEvent(new MouseEvent("click", { clientX: 4, clientY: 4 }));

		expect(
			afterReset.behaviorCollector3
				?.getData()
				.map((point: ClickEventPoint) => point.timestamp),
		).toEqual([100, 300, 400, 600]);
	});
});
