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
	CaptchaType,
	type ITrafficFilter,
	type RoutingMachinePlatform,
	TrafficFilterAction,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	type DeviceInputs,
	deriveDevice,
	deriveTrafficPolicies,
	solveDeviceSignals,
} from "../../../utils/devicePlatform.js";

const IPHONE_UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
	"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MAC_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const PIXEL_UA =
	"Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
const WINDOWS_CHROME_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

const ANDROID_DESKTOP_SITE_UA =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

const platformOf = (inputs: DeviceInputs): RoutingMachinePlatform =>
	deriveDevice(inputs).platform;

describe("deriveDevice", () => {
	describe("isApple", () => {
		it("matches iPhone UA", () => {
			expect(platformOf({ userAgent: IPHONE_UA }).isApple).toBe(true);
		});
		it("matches iPad UA", () => {
			expect(platformOf({ userAgent: IPAD_UA }).isApple).toBe(true);
		});
		it("matches Macintosh UA", () => {
			expect(platformOf({ userAgent: MAC_UA }).isApple).toBe(true);
		});
		it("does not match Android UA", () => {
			expect(platformOf({ userAgent: PIXEL_UA }).isApple).toBe(false);
		});
		it("does not match Windows UA", () => {
			expect(platformOf({ userAgent: WINDOWS_CHROME_UA }).isApple).toBe(false);
		});
		it("does not match empty UA", () => {
			expect(platformOf({ userAgent: "" }).isApple).toBe(false);
		});
	});

	describe("isWebView", () => {
		it("passes through caller-supplied true", () => {
			expect(
				platformOf({ userAgent: WINDOWS_CHROME_UA, webView: true }).isWebView,
			).toBe(true);
		});
		it("defaults to false", () => {
			expect(platformOf({ userAgent: IPHONE_UA }).isWebView).toBe(false);
		});
	});

	describe("isMobile", () => {
		it("reads a phone on a non-carrier network as mobile", () => {
			expect(
				platformOf({
					userAgent: IPHONE_UA,
					ipInfo: { isValid: true, isMobile: false },
				}).isMobile,
			).toBe(true);
		});
		it("does not read a tethered desktop as mobile", () => {
			expect(
				platformOf({
					userAgent: WINDOWS_CHROME_UA,
					ipInfo: { isValid: true, isMobile: true },
				}).isMobile,
			).toBe(false);
		});
		it("ignores the carrier flag of an invalid IP lookup", () => {
			expect(
				deriveDevice({
					userAgent: WINDOWS_CHROME_UA,
					ipInfo: { isValid: false, isMobile: true },
				}).mobile.evidence,
			).not.toContain("carrierNetwork");
		});
		it("reads an iPhone UA as mobile with no other signal", () => {
			expect(platformOf({ userAgent: IPHONE_UA }).isMobile).toBe(true);
		});
		it("reads a Pixel UA as mobile with no other signal", () => {
			expect(platformOf({ userAgent: PIXEL_UA }).isMobile).toBe(true);
		});
		it("does not read Windows Chrome as mobile", () => {
			expect(platformOf({ userAgent: WINDOWS_CHROME_UA }).isMobile).toBe(false);
		});
		it("does not read Mac Safari as mobile", () => {
			expect(platformOf({ userAgent: MAC_UA }).isMobile).toBe(false);
		});
		it("weighs the solve's touch readings", () => {
			expect(
				deriveDevice({
					userAgent: MAC_UA,
					solve: { deviceCapability: "mobile", touchEventCount: 2 },
				}).mobile.evidence,
			).toEqual(expect.arrayContaining(["touchCapability", "touchEvents"]));
		});
		it("reads an in-app iPad sending a Mac UA as mobile once its tap corroborates it", () => {
			const ipad: DeviceInputs = {
				userAgent: MAC_UA,
				tcpMss: 1380,
				webView: true,
			};
			expect(platformOf(ipad).isMobile).toBe(false);
			expect(
				platformOf({
					...ipad,
					solve: { deviceCapability: "mobile", touchEventCount: 2 },
				}).isMobile,
			).toBe(true);
		});
		it("keeps Android Chrome's Desktop site mode a desktop, as its headers all say", () => {
			expect(
				platformOf({
					userAgent: ANDROID_DESKTOP_SITE_UA,
					headers: {
						"sec-ch-ua-mobile": "?0",
						"sec-ch-ua-platform": '"Linux"',
					},
					solve: { deviceCapability: "mobile", touchEventCount: 2 },
				}).isMobile,
			).toBe(false);
		});
		it("does not read a touchscreen laptop used with a mouse as mobile", () => {
			expect(
				platformOf({
					userAgent: WINDOWS_CHROME_UA,
					solve: { deviceCapability: "mobile", touchEventCount: 0 },
				}).isMobile,
			).toBe(false);
		});
	});
});

describe("solveDeviceSignals", () => {
	it("reads the touch-support reading and counts the touch events", () => {
		expect(solveDeviceSignals({ d: "mobile", c2: [{}, {}] })).toEqual({
			deviceCapability: "mobile",
			touchEventCount: 2,
		});
	});
	it("is undefined when there was no solve", () => {
		expect(solveDeviceSignals(undefined)).toBeUndefined();
	});
});

describe("deriveTrafficPolicies", () => {
	const block = { action: TrafficFilterAction.Block } as const;
	const challenge = { action: TrafficFilterAction.Challenge } as const;

	it("returns undefined when there is no trafficFilter", () => {
		expect(deriveTrafficPolicies(undefined)).toBeUndefined();
	});

	it("returns undefined when no category is configured", () => {
		const tf: Partial<ITrafficFilter> = {
			abuserScoreThreshold: 0.9,
			skipExtrasOnValidDnsPath: true,
			datacenterNameAllowlist: ["Cloudflare"],
		};
		expect(deriveTrafficPolicies(tf)).toBeUndefined();
	});

	it("carries challenge policies through, not just blocks", () => {
		const tf: Partial<ITrafficFilter> = { vpn: challenge, datacenter: block };
		expect(deriveTrafficPolicies(tf)).toEqual({
			vpn: challenge,
			datacenter: block,
		});
	});

	it("preserves the challenge policy's captcha overrides", () => {
		const vpn = {
			action: TrafficFilterAction.Challenge,
			captchaType: CaptchaType.image,
			solvedImagesCount: 4,
		} as const;
		const tf: Partial<ITrafficFilter> = { vpn };
		expect(deriveTrafficPolicies(tf)?.vpn).toEqual(vpn);
	});

	it("omits a category that is absent from the filter", () => {
		const tf: Partial<ITrafficFilter> = { datacenter: block };
		const policies = deriveTrafficPolicies(tf);
		expect(policies).toEqual({ datacenter: block });
		expect(policies?.vpn).toBeUndefined();
	});

	it("covers every policy-carrying category", () => {
		const tf: Partial<ITrafficFilter> = {
			vpn: block,
			proxy: block,
			tor: block,
			datacenter: block,
			abuser: block,
			mobile: block,
			satellite: block,
			crawler: block,
		};
		expect(Object.keys(deriveTrafficPolicies(tf) ?? {}).sort()).toEqual([
			"abuser",
			"crawler",
			"datacenter",
			"mobile",
			"proxy",
			"satellite",
			"tor",
			"vpn",
		]);
	});
});
