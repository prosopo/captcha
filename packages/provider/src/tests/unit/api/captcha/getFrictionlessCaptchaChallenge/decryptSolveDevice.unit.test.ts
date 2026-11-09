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
import { decryptIncomingSolveDevice } from "../../../../../api/captcha/getFrictionlessCaptchaChallenge/decryptSolveDevice.js";
import type { PoolBundleDecrypt } from "../../../../../tasks/captchaManager.js";
import type { BehavioralDataResult } from "../../../../../tasks/detection/decodeBehavior.js";
import { deriveDevice } from "../../../../../utils/devicePlatform.js";

const IPHONE_SAFARI_UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const bundle: PoolBundleDecrypt & { bundleId: string } = {
	bundleId: "bundle-1",
	key: "pk",
	innerConfig: "c",
};

const tap = {
	x: 1,
	y: 2,
	timestamp: 3,
	eventType: "touchstart" as const,
	touchCount: 1,
};

const reading = (
	deviceCapability: string,
	collector2: BehavioralDataResult["collector2"],
): BehavioralDataResult => ({
	collector1: [],
	collector2,
	collector3: [],
	collector4: [],
	deviceCapability,
	timestamp: 0,
});

const buildManager = () => ({
	resolveBundleByDetectorSession: vi.fn(
		async (
			_detectorSessionId?: string,
		): Promise<(PoolBundleDecrypt & { bundleId: string }) | undefined> =>
			bundle,
	),
	decryptBehavioralData: vi.fn(
		async (
			_encryptedData: string,
			_bundle: PoolBundleDecrypt | undefined,
		): Promise<BehavioralDataResult | null> => null,
	),
});

describe("decryptIncomingSolveDevice", () => {
	let manager: ReturnType<typeof buildManager>;

	beforeEach(() => {
		manager = buildManager();
	});

	it("does nothing when the widget sent no behavioural data", async () => {
		expect(
			await decryptIncomingSolveDevice(manager, undefined, "det-1"),
		).toBeUndefined();
		expect(manager.decryptBehavioralData).not.toHaveBeenCalled();
	});

	it("decrypts with the bundle bound to the detector session", async () => {
		manager.decryptBehavioralData.mockResolvedValueOnce(
			reading("mobile", [tap]),
		);
		const solveDevice = await decryptIncomingSolveDevice(
			manager,
			"blob",
			"det-1",
		);
		expect(manager.resolveBundleByDetectorSession).toHaveBeenCalledWith(
			"det-1",
		);
		expect(manager.decryptBehavioralData).toHaveBeenCalledWith("blob", bundle);
		expect(solveDevice).toEqual({
			deviceCapability: "mobile",
			touchEventCount: 1,
		});
	});

	it("ignores a payload that does not decrypt", async () => {
		expect(
			await decryptIncomingSolveDevice(manager, "garbage", "det-1"),
		).toBeUndefined();
	});

	it("corroborates an iPhone on home broadband that reported touch", async () => {
		manager.decryptBehavioralData.mockResolvedValueOnce(
			reading("mobile", [tap]),
		);
		const solve = await decryptIncomingSolveDevice(manager, "blob", "det-1");
		const uncorroborated = deriveDevice({ userAgent: IPHONE_SAFARI_UA }).mobile;
		const { mobile } = deriveDevice({ userAgent: IPHONE_SAFARI_UA, solve });
		expect(uncorroborated.corroborated).toBe(false);
		expect(mobile.isMobile && mobile.corroborated).toBe(true);
	});

	it("does not corroborate a desktop reading", async () => {
		manager.decryptBehavioralData.mockResolvedValueOnce(reading("desktop", []));
		const solve = await decryptIncomingSolveDevice(manager, "blob", "det-1");
		const { mobile } = deriveDevice({ userAgent: IPHONE_SAFARI_UA, solve });
		expect(mobile.corroborated).toBe(false);
	});
});
