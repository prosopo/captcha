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

import type { RequestHeaders } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import {
	type MobileSignals,
	deriveMobileVerdict,
} from "../../../utils/mobileSignals.js";

const IPHONE_UA =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const PIXEL_UA =
	"Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
const WINDOWS_CHROME_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";
const MAC_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const LINUX_FIREFOX_UA =
	"Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0";

const androidChromeHints: RequestHeaders = {
	"sec-ch-ua-mobile": "?1",
	"sec-ch-ua-platform": '"Android"',
};
const windowsChromeHints: RequestHeaders = {
	"sec-ch-ua-mobile": "?0",
	"sec-ch-ua-platform": '"Windows"',
};

describe("deriveMobileVerdict", () => {
	describe("device, not network", () => {
		it("reads a phone on home Wi-Fi as mobile", () => {
			expect(
				deriveMobileVerdict({
					userAgent: IPHONE_UA,
					carrierNetwork: false,
					tcpMss: 1460,
				}).isMobile,
			).toBe(true);
		});

		it("does not read a tethered laptop as mobile", () => {
			expect(
				deriveMobileVerdict({
					userAgent: WINDOWS_CHROME_UA,
					headers: windowsChromeHints,
					carrierNetwork: true,
					tcpMss: 1400,
				}).isMobile,
			).toBe(false);
		});

		it("does not read a touchscreen laptop as mobile", () => {
			expect(
				deriveMobileVerdict({
					userAgent: WINDOWS_CHROME_UA,
					headers: windowsChromeHints,
					deviceCapability: "mobile",
					touchEventCount: 40,
				}).isMobile,
			).toBe(false);
		});
	});

	describe("platform declarations", () => {
		it("accepts a mobile UA alone, since WebKit sends no client hints", () => {
			expect(deriveMobileVerdict({ userAgent: IPHONE_UA }).isMobile).toBe(true);
		});

		it("accepts the client hints alone, with no UA at all", () => {
			expect(
				deriveMobileVerdict({ headers: androidChromeHints }).isMobile,
			).toBe(true);
		});

		it("reads the platform hint case- and quote-insensitively", () => {
			expect(
				deriveMobileVerdict({
					headers: { "sec-ch-ua-platform": "iOS" },
				}).evidence,
			).toContain("clientHintPlatformMobile");
		});

		it("rejects a mobile UA the client hints contradict", () => {
			expect(
				deriveMobileVerdict({
					userAgent: PIXEL_UA,
					headers: windowsChromeHints,
				}).isMobile,
			).toBe(false);
		});

		it("accepts a desktop UA the client hints contradict", () => {
			expect(
				deriveMobileVerdict({
					userAgent: WINDOWS_CHROME_UA,
					headers: androidChromeHints,
				}).isMobile,
			).toBe(true);
		});

		it.each([
			["Windows Chrome", WINDOWS_CHROME_UA],
			["Mac Safari", MAC_UA],
			["Linux Firefox", LINUX_FIREFOX_UA],
		])("does not read %s as mobile", (_name: string, userAgent: string) => {
			expect(deriveMobileVerdict({ userAgent }).isMobile).toBe(false);
		});
	});

	describe("corroborating signals", () => {
		it("does not let the carrier bit alone decide", () => {
			expect(deriveMobileVerdict({ carrierNetwork: true }).isMobile).toBe(
				false,
			);
		});

		it("does not let a tunnelled MSS alone decide", () => {
			expect(deriveMobileVerdict({ tcpMss: 1348 }).isMobile).toBe(false);
		});

		it.each([1300, 1348, 1400, 1430])(
			"counts MSS %i as tunnelled",
			(tcpMss: number) => {
				expect(deriveMobileVerdict({ tcpMss }).evidence).toContain(
					"tunnelledMss",
				);
			},
		);

		it("scores the carrier bit and a tunnelled MSS once between them", () => {
			const both = deriveMobileVerdict({ carrierNetwork: true, tcpMss: 1400 });
			const one = deriveMobileVerdict({ carrierNetwork: true });
			expect(both.score).toBe(one.score);
			// Both are still reported, so the pair can be told from either alone.
			expect(both.evidence).toEqual(["carrierNetwork+tunnelledMss"]);
		});

		it("does not let the two network signals plus a webView decide", () => {
			expect(
				deriveMobileVerdict({
					carrierNetwork: true,
					tcpMss: 1400,
					webView: true,
				}).isMobile,
			).toBe(false);
		});

		it.each([1452, 1460, 0])(
			"does not count MSS %i as tunnelled",
			(tcpMss: number) => {
				expect(deriveMobileVerdict({ tcpMss }).evidence).not.toContain(
					"tunnelledMss",
				);
			},
		);

		it("lets touch evidence carry a UA-less client", () => {
			expect(
				deriveMobileVerdict({
					deviceCapability: "mobile",
					touchEventCount: 12,
				}).isMobile,
			).toBe(true);
		});

		it("rejects a mobile UA that reports no touch support", () => {
			expect(
				deriveMobileVerdict({
					userAgent: PIXEL_UA,
					deviceCapability: "desktop",
				}).isMobile,
			).toBe(false);
		});

		it("ignores a zero touch-event count", () => {
			expect(
				deriveMobileVerdict({ touchEventCount: 0 }).evidence,
			).not.toContain("touchEvents");
		});
	});

	it("reads nothing as not mobile", () => {
		const verdict = deriveMobileVerdict({});
		expect(verdict.isMobile).toBe(false);
		expect(verdict.score).toBe(0);
		expect(verdict.evidence).toEqual([]);
	});

	describe("corroboration", () => {
		it("is not corroborated by a User-Agent alone", () => {
			const verdict = deriveMobileVerdict({ userAgent: IPHONE_UA });
			expect(verdict.isMobile).toBe(true);
			expect(verdict.corroborated).toBe(false);
		});

		it("is not corroborated by the client hints alone", () => {
			const verdict = deriveMobileVerdict({ headers: androidChromeHints });
			expect(verdict.isMobile).toBe(true);
			expect(verdict.corroborated).toBe(false);
		});

		it.each([
			["a carrier network", { carrierNetwork: true }],
			["a tunnelled MSS", { tcpMss: 1400 }],
			["an in-app browser", { webView: true }],
			["touch support", { deviceCapability: "mobile" }],
			["touch events", { touchEventCount: 9 }],
		])(
			"is corroborated by %s",
			(_name: string, extra: Partial<MobileSignals>) => {
				const verdict = deriveMobileVerdict({
					userAgent: IPHONE_UA,
					...extra,
				});
				expect(verdict.isMobile).toBe(true);
				expect(verdict.corroborated).toBe(true);
			},
		);

		it("is not corroborated by a signal that says desktop", () => {
			expect(
				deriveMobileVerdict({
					userAgent: IPHONE_UA,
					deviceCapability: "desktop",
				}).corroborated,
			).toBe(false);
		});
	});

	it("ignores empty header values", () => {
		expect(
			deriveMobileVerdict({
				userAgent: IPHONE_UA,
				headers: { "sec-ch-ua-mobile": "", "sec-ch-ua-platform": "" },
			}).evidence,
		).toEqual(["userAgentMobile"]);
	});
});
