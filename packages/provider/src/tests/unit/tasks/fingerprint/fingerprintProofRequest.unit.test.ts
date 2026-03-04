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

import { FINGERPRINT_SOURCE_COUNT } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { generateFingerprintProofRequest } from "../../../../tasks/fingerprint/fingerprintProofRequest.js";

describe("generateFingerprintProofRequest", () => {
	it("returns the default number of leaves (3)", () => {
		const result = generateFingerprintProofRequest();
		expect(result.requestedLeaves).to.have.lengthOf(3);
	});

	it("returns the requested number of leaves", () => {
		const result = generateFingerprintProofRequest(5);
		expect(result.requestedLeaves).to.have.lengthOf(5);
	});

	it("returns unique leaf indices", () => {
		const result = generateFingerprintProofRequest(10);
		const unique = new Set(result.requestedLeaves);
		expect(unique.size).to.equal(result.requestedLeaves.length);
	});

	it("returns leaf indices sorted in ascending order", () => {
		const result = generateFingerprintProofRequest(10);
		for (let i = 1; i < result.requestedLeaves.length; i++) {
			const prev = result.requestedLeaves[i - 1];
			const curr = result.requestedLeaves[i];
			expect(prev).to.not.be.undefined;
			expect(curr).to.not.be.undefined;
			// biome-ignore lint/style/noNonNullAssertion: test assertion after undefined check
			expect(prev!).to.be.lessThan(curr!);
		}
	});

	it("returns indices within valid range [0, FINGERPRINT_SOURCE_COUNT)", () => {
		const result = generateFingerprintProofRequest(10);
		for (const idx of result.requestedLeaves) {
			expect(idx).to.be.greaterThanOrEqual(0);
			expect(idx).to.be.lessThan(FINGERPRINT_SOURCE_COUNT);
		}
	});

	it("clamps to FINGERPRINT_SOURCE_COUNT when requesting more leaves than available", () => {
		const result = generateFingerprintProofRequest(1000);
		expect(result.requestedLeaves).to.have.lengthOf(FINGERPRINT_SOURCE_COUNT);
	});

	it("handles requesting 1 leaf", () => {
		const result = generateFingerprintProofRequest(1);
		expect(result.requestedLeaves).to.have.lengthOf(1);
		expect(result.requestedLeaves[0]).to.be.greaterThanOrEqual(0);
		expect(result.requestedLeaves[0]).to.be.lessThan(FINGERPRINT_SOURCE_COUNT);
	});

	it("returns an object matching FingerprintProofRequest shape", () => {
		const result = generateFingerprintProofRequest();
		expect(result).to.have.property("requestedLeaves");
		expect(Array.isArray(result.requestedLeaves)).to.be.true;
	});
});
