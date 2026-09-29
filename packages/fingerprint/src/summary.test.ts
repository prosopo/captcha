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

import type { UnknownComponents } from "@prosopo/fingerprintjs";
import { describe, expect, it } from "vitest";
import {
	FINGERPRINT_DISCLOSURE_KEYS,
	buildFingerprintProofFromComponents,
	encodeFingerprintProof,
} from "./proof.js";
import { summariseFingerprintProof } from "./summary.js";

const HEX_HASH = /^0x[0-9a-f]{64}$/;

/** A component set shaped like a real one, with every disclosed key present. */
const components = (
	overrides: Record<string, unknown> = {},
): UnknownComponents => {
	const base: Record<string, unknown> = {
		colorDepth: 24,
		cookiesEnabled: true,
		sessionStorage: true,
		localStorage: true,
		timezone: "Europe/London",
		hardwareConcurrency: 8,
		languages: [["en-GB"], ["en"]],
		architecture: 255,
		// Undisclosed, but committed to — so it moves the root and nothing else.
		audio: 124.04347527516074,
		...overrides,
	};
	return Object.fromEntries(
		Object.entries(base).map(([k, v]) => [k, { value: v, duration: 1 }]),
	) as UnknownComponents;
};

const summarise = (overrides: Record<string, unknown> = {}) =>
	summariseFingerprintProof(
		encodeFingerprintProof(
			buildFingerprintProofFromComponents(
				components(overrides),
				FINGERPRINT_DISCLOSURE_KEYS,
			),
		),
	);

describe("summariseFingerprintProof", () => {
	it("keeps the root, the group hash and the two moving values", () => {
		const summary = summarise();

		expect(summary?.root).toMatch(HEX_HASH);
		expect(summary?.groupHash).toMatch(HEX_HASH);
		expect(summary?.colorDepth).toBe(24);
		expect(summary?.hardwareConcurrency).toBe(8);
	});

	it("holds the group hash steady while the redrawn pair moves", () => {
		// This is the whole point: an anti-detect build redraws colorDepth and
		// hardwareConcurrency per launch but cannot move the install-stable six,
		// so one group has to carry several pairs.
		const a = summarise({ colorDepth: 24, hardwareConcurrency: 8 });
		const b = summarise({ colorDepth: 30, hardwareConcurrency: 10 });

		expect(a?.groupHash).toBe(b?.groupHash);
		expect(a?.colorDepth).not.toBe(b?.colorDepth);
		expect(a?.hardwareConcurrency).not.toBe(b?.hardwareConcurrency);
	});

	it("keeps the install-stable values beside their hash", () => {
		// The hash is one-way, so a cohort could otherwise be counted but never
		// described. `languages` is a nested array and is stored as canonical JSON.
		const summary = summarise();

		expect(summary?.disclosed).toStrictEqual({
			timezone: "Europe/London",
			languages: '[["en-GB"],["en"]]',
			architecture: 255,
			cookiesEnabled: true,
			sessionStorage: true,
			localStorage: true,
		});
	});

	it("omits a disclosed value of the wrong type rather than coercing it", () => {
		const summary = summarise({ architecture: "sixty-four", timezone: 42 });

		expect(summary?.disclosed?.architecture).toBeUndefined();
		expect(summary?.disclosed?.timezone).toBeUndefined();
		// The rest still survive.
		expect(summary?.disclosed?.cookiesEnabled).toBe(true);
	});

	it("moves the group hash when an install-stable value differs", () => {
		const a = summarise({ timezone: "Europe/London" });
		const b = summarise({ timezone: "America/New_York" });

		expect(a?.groupHash).not.toBe(b?.groupHash);
	});

	it("gives a fresh root when only an undisclosed component changed", () => {
		// `audio` is committed to but never disclosed. A root that moves while
		// every disclosed value holds is what a per-launch reseed looks like.
		const a = summarise({ audio: 1 });
		const b = summarise({ audio: 2 });

		expect(a?.root).not.toBe(b?.root);
		expect(a?.groupHash).toBe(b?.groupHash);
		expect(a?.colorDepth).toBe(b?.colorDepth);
	});

	it("returns undefined for an absent proof", () => {
		expect(summariseFingerprintProof(undefined)).toBeUndefined();
		expect(summariseFingerprintProof("")).toBeUndefined();
	});

	it("returns undefined for a proof that is not JSON", () => {
		expect(
			summariseFingerprintProof("invalid-fingerprint-proof"),
		).toBeUndefined();
	});

	it("refuses a proof whose disclosure does not hash to the root", () => {
		const proof = buildFingerprintProofFromComponents(
			components(),
			FINGERPRINT_DISCLOSURE_KEYS,
		);
		const tampered = JSON.parse(JSON.stringify(proof));
		// Claim more cores than the committed leaf proves.
		const target = tampered.disclosures.find(
			(d: { key: string }) => d.key === "hardwareConcurrency",
		);
		target.value = 64;

		expect(summariseFingerprintProof(JSON.stringify(tampered))).toBeUndefined();
	});

	it("refuses a proof whose root has been swapped", () => {
		const proof = buildFingerprintProofFromComponents(
			components(),
			FINGERPRINT_DISCLOSURE_KEYS,
		);
		const tampered = JSON.parse(JSON.stringify(proof));
		tampered.root = `0x${"0".repeat(64)}`;

		expect(summariseFingerprintProof(JSON.stringify(tampered))).toBeUndefined();
	});

	it("omits a moving value that is not a finite number", () => {
		const summary = summarise({ hardwareConcurrency: "eight" });

		expect(summary).toBeDefined();
		expect(summary?.hardwareConcurrency).toBeUndefined();
		expect(summary?.colorDepth).toBe(24);
	});
});
