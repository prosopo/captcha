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
import { afterEach, describe, expect, test, vi } from "vitest";
import {
	USAGE_BEACON_SAMPLE_RATE,
	USAGE_BEACON_URL,
	type UsageBeaconOptions,
	isUsageBeaconEnabled,
	sendUsageBeacon,
} from "../usageBeacon.js";

const VERSION = "__PROSOPO_BUNDLE_VERSION__";
const SITE_KEY = "5C7bfXYwachNuvmasEFtWi9BMS41uBvo6KpYHVSQmad4nWzw";

const selfHosted = (
	send: (url: string) => void,
	overrides: UsageBeaconOptions = {},
): UsageBeaconOptions => ({
	setting: undefined,
	providerList: "https://captcha.example.com",
	host: "shop.example.com",
	random: () => 0,
	send,
	...overrides,
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[VERSION];
});

describe("isUsageBeaconEnabled", () => {
	test("is on unless the bundle was built with PROSOPO_USAGE_BEACON=false", () => {
		expect(isUsageBeaconEnabled(undefined)).toBe(true);
		expect(isUsageBeaconEnabled("true")).toBe(true);
		expect(isUsageBeaconEnabled("false")).toBe(false);
		expect(isUsageBeaconEnabled(" FALSE ")).toBe(false);
	});
});

describe("sendUsageBeacon", () => {
	test("sends the host, site key, bundle version and sample rate", () => {
		(globalThis as Record<string, unknown>)[VERSION] = "4.5.22";
		const send = vi.fn<(url: string) => void>();

		sendUsageBeacon(SITE_KEY, selfHosted(send));

		expect(send).toHaveBeenCalledTimes(1);
		const url = new URL(send.mock.calls[0]?.[0] ?? "");
		expect(`${url.origin}${url.pathname}`).toBe(USAGE_BEACON_URL);
		expect(Object.fromEntries(url.searchParams)).toEqual({
			host: "shop.example.com",
			sitekey: SITE_KEY,
			v: "4.5.22",
			p: String(USAGE_BEACON_SAMPLE_RATE),
		});
	});

	test("reports an unknown version when the build did not define one", () => {
		const send = vi.fn<(url: string) => void>();

		sendUsageBeacon(SITE_KEY, selfHosted(send));

		expect(new URL(send.mock.calls[0]?.[0] ?? "").searchParams.get("v")).toBe(
			"unknown",
		);
	});

	test("does not send when turned off at bundle time", () => {
		const send = vi.fn<(url: string) => void>();

		sendUsageBeacon(SITE_KEY, selfHosted(send, { setting: "false" }));

		expect(send).not.toHaveBeenCalled();
	});

	test("does not send from a hosted widget", () => {
		const send = vi.fn<(url: string) => void>();

		sendUsageBeacon(SITE_KEY, selfHosted(send, { providerList: "" }));

		expect(send).not.toHaveBeenCalled();
	});

	test("does not send without a site key", () => {
		const send = vi.fn<(url: string) => void>();

		sendUsageBeacon(undefined, selfHosted(send));

		expect(send).not.toHaveBeenCalled();
	});

	test("sends on roughly one render in a thousand", () => {
		const send = vi.fn<(url: string) => void>();
		const renders = 100_000;
		let draw = 0;
		const random = (): number => (draw++ % renders) / renders;

		for (let i = 0; i < renders; i++) {
			sendUsageBeacon(SITE_KEY, selfHosted(send, { random }));
		}

		expect(send).toHaveBeenCalledTimes(renders * USAGE_BEACON_SAMPLE_RATE);
	});

	test("swallows a failing send so the widget keeps rendering", () => {
		const send = (): void => {
			throw new Error("blocked by CSP");
		};

		expect(() => sendUsageBeacon(SITE_KEY, selfHosted(send))).not.toThrow();
	});
});
