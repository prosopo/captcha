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

import { CaptchaType } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { DEV_PHRASE } from "../keyring/index.js";
import { getPair } from "./getPair.js";
import { getDefaultProviders, getDefaultSiteKeys } from "./testAccounts.js";

// Key derivation runs scrypt/pbkdf2 with production parameters and takes
// seconds per call, so these suites need more than the 10s default.
const SLOW = { timeout: 60000 };

describe("getDefaultSiteKeys", SLOW, () => {
	// The suffix each key is derived from, in seed order.
	const NAMES = [
		"image",
		"pow",
		"frictionless",
		"iconOrder",
		"audio",
		"puzzle",
	];

	it("provides one site per demo, in a stable order", () => {
		expect(
			getDefaultSiteKeys().map((site) => site.settings.captchaType),
		).toEqual([
			CaptchaType.image,
			CaptchaType.pow,
			CaptchaType.frictionless,
			// Before `puzzle` on purpose — see the note on the seed list: the
			// last-seeded type is the one `updateDemoHTMLFiles` leaves in the
			// webview demos.
			CaptchaType.iconOrder,
			// The audio demos' site: audio is only an accessibility alternative,
			// so it is an image site with that alternative on.
			CaptchaType.image,
			CaptchaType.puzzle,
		]);
	});

	it("never seeds a site with audio as its captcha type", () => {
		for (const site of getDefaultSiteKeys()) {
			expect(site.settings.captchaType).not.toBe(CaptchaType.audio);
		}
	});

	it("turns the audio alternative on for the audio demos' site only", () => {
		const enabled = getDefaultSiteKeys().map(
			(site) => site.settings.audioAccessibilityEnabled,
		);
		expect(enabled).toEqual(NAMES.map((name) => name === "audio"));
	});

	it("derives each site key from the dev phrase and its seed name", () => {
		// The seeded dev site keys are checked into fixtures and referenced by
		// the demos, so the derivation must not drift.
		const sites = getDefaultSiteKeys();
		expect(sites).toHaveLength(NAMES.length);
		for (const [index, site] of sites.entries()) {
			expect(site.secret).toBe(`${DEV_PHRASE}//${NAMES[index]}`);
			expect(site.address).toBe(getPair(site.secret).address);
			expect(site.pair?.address).toBe(site.address);
		}
	});

	it("gives every site a distinct address", () => {
		const addresses = getDefaultSiteKeys().map((site) => site.address);
		expect(new Set(addresses).size).toBe(addresses.length);
	});

	it("writes the settings explicitly rather than leaning on schema defaults", () => {
		for (const site of getDefaultSiteKeys()) {
			expect(site.settings.domains).toEqual(["localhost"]);
			expect(site.settings.imageMaxRounds).toBe(2);
			expect(
				site.settings.frictionlessThreshold.frictionlessPuzzleThreshold,
			).toBe(0.8);
		}
	});

	it("returns a fresh array each call, so callers cannot corrupt the seed", () => {
		const first = getDefaultSiteKeys();
		const second = getDefaultSiteKeys();
		expect(first).not.toBe(second);
		first.pop();
		expect(second).toHaveLength(NAMES.length);
	});
});

describe("getDefaultProviders", SLOW, () => {
	it("provides a single local provider with a matching pair and address", () => {
		const providers = getDefaultProviders();
		expect(providers).toHaveLength(1);
		const provider = providers[0];
		expect(provider).toBeDefined();
		if (!provider) return;
		expect(provider.url).toBe("https://localhost:9229");
		expect(provider.address).toBe(provider.pair?.address);
	});

	it("points at the checked-in dev dataset", () => {
		const provider = getDefaultProviders()[0];
		expect(provider?.datasetFile).toBe("./dev/data/captchas.json");
		expect(provider?.captchaDatasetId).toMatch(/^0x[0-9a-f]{64}$/);
	});

	it("is deterministic across calls", () => {
		expect(getDefaultProviders()[0]?.address).toBe(
			getDefaultProviders()[0]?.address,
		);
	});

	it("does not reuse a site key as the provider key", () => {
		const siteAddresses = new Set(
			getDefaultSiteKeys().map((site) => site.address),
		);
		expect(siteAddresses.has(getDefaultProviders()[0]?.address ?? "")).toBe(
			false,
		);
	});
});
