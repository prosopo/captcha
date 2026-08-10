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
	type FingerprintProof,
	buildFingerprintProofFromComponents,
	verifyFingerprintProofStructure,
} from "./proof.js";

const sampleComponents = (): UnknownComponents => ({
	colorDepth: { value: 24, duration: 1 },
	cookiesEnabled: { value: true, duration: 1 },
	hardwareConcurrency: { value: 8, duration: 1 },
	timezone: { value: "UTC+1", duration: 2 },
	canvas: {
		value: { winding: true, geometry: "abc", text: "def" },
		duration: 3,
	},
	languages: { value: [["en-GB"], ["en"]], duration: 1 },
	broken: { error: new Error("source failed"), duration: 0 },
});

const HEX_HASH = /^0x[0-9a-f]{64}$/;

const clone = (proof: FingerprintProof): FingerprintProof =>
	JSON.parse(JSON.stringify(proof)) as FingerprintProof;

describe("fingerprint proof", () => {
	it("commits to all components and discloses all by default", () => {
		const proof = buildFingerprintProofFromComponents(sampleComponents());
		expect(proof.root).toMatch(HEX_HASH);
		expect(proof.disclosures).toHaveLength(7);
		const keys = proof.disclosures.map((d) => d.key);
		// disclosures follow the sorted commitment order
		expect(keys).toStrictEqual([...keys].sort());
	});

	it("represents an errored source as an error leaf with no value", () => {
		const proof = buildFingerprintProofFromComponents(sampleComponents());
		const broken = proof.disclosures.find((d) => d.key === "broken");
		expect(broken?.error).toBe(true);
		expect(broken && "value" in broken).toBe(false);
	});

	it("verifies a freshly built proof", () => {
		const proof = buildFingerprintProofFromComponents(sampleComponents());
		expect(verifyFingerprintProofStructure(proof)).toBe(true);
	});

	it("verifies a selective disclosure of a subset of components", () => {
		const proof = buildFingerprintProofFromComponents(sampleComponents(), [
			"colorDepth",
			"timezone",
		]);
		expect(proof.disclosures).toHaveLength(2);
		expect(verifyFingerprintProofStructure(proof)).toBe(true);
		// the root still commits to every component, not just the disclosed ones
		const full = buildFingerprintProofFromComponents(sampleComponents());
		expect(proof.root).toBe(full.root);
	});

	it("skips requested keys that the fingerprint does not contain", () => {
		const proof = buildFingerprintProofFromComponents(sampleComponents(), [
			"colorDepth",
			"doesNotExist",
		]);
		expect(proof.disclosures.map((d) => d.key)).toStrictEqual(["colorDepth"]);
		expect(verifyFingerprintProofStructure(proof)).toBe(true);
	});

	it("rejects a proof whose disclosed value was tampered with", () => {
		const proof = clone(
			buildFingerprintProofFromComponents(sampleComponents()),
		);
		const target = proof.disclosures.find((d) => d.key === "colorDepth");
		if (target === undefined) {
			throw new Error("expected colorDepth disclosure");
		}
		target.value = 32;
		expect(verifyFingerprintProofStructure(proof)).toBe(false);
	});

	it("rejects a proof whose root was tampered with", () => {
		const proof = clone(
			buildFingerprintProofFromComponents(sampleComponents()),
		);
		proof.root = `0x${"0".repeat(64)}`;
		expect(verifyFingerprintProofStructure(proof)).toBe(false);
	});

	it("rejects a disclosure carrying a non-sibling leaf's proof", () => {
		const proof = clone(
			buildFingerprintProofFromComponents(sampleComponents()),
		);
		// `broken` and `timezone` are the first and last leaves in sorted order, so
		// they are not Merkle siblings — `broken`'s leaf does not appear anywhere in
		// `timezone`'s proof, so lending it that proof must fail verification.
		const broken = proof.disclosures.find((d) => d.key === "broken");
		const timezone = proof.disclosures.find((d) => d.key === "timezone");
		if (broken === undefined || timezone === undefined) {
			throw new Error("expected broken and timezone disclosures");
		}
		broken.proof = timezone.proof;
		expect(verifyFingerprintProofStructure(proof)).toBe(false);
	});
});
