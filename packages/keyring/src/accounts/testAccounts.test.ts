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
	it("provides one site per captcha type, in a stable order", () => {
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
			CaptchaType.puzzle,
		]);
	});

	it("derives each site key from the dev phrase and its captcha type", () => {
		// The seeded dev site keys are checked into fixtures and referenced by
		// the demos, so the derivation must not drift.
		for (const site of getDefaultSiteKeys()) {
			expect(site.secret).toBe(`${DEV_PHRASE}//${site.settings.captchaType}`);
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
		expect(second).toHaveLength(5);
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
