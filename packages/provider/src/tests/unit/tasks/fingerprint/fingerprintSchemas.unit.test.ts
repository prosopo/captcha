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
	FINGERPRINT_SOURCE_COUNT,
	FINGERPRINT_SOURCE_NAMES,
	FingerprintLeafProofSchema,
	FingerprintProofRequestSchema,
	FingerprintProofsSchema,
} from "@prosopo/types";
import { describe, expect, it } from "vitest";

describe("Fingerprint Zod Schemas", () => {
	describe("FingerprintProofRequestSchema", () => {
		it("parses a valid proof request", () => {
			const input = { requestedLeaves: [0, 5, 10] };
			const result = FingerprintProofRequestSchema.parse(input);
			expect(result.requestedLeaves).to.deep.equal([0, 5, 10]);
		});

		it("rejects missing requestedLeaves", () => {
			expect(() => FingerprintProofRequestSchema.parse({})).to.throw();
		});

		it("rejects non-number values in requestedLeaves", () => {
			expect(() =>
				FingerprintProofRequestSchema.parse({ requestedLeaves: ["a", "b"] }),
			).to.throw();
		});

		it("accepts an empty requestedLeaves array", () => {
			const result = FingerprintProofRequestSchema.parse({
				requestedLeaves: [],
			});
			expect(result.requestedLeaves).to.deep.equal([]);
		});
	});

	describe("FingerprintLeafProofSchema", () => {
		it("parses a valid leaf proof", () => {
			const input = {
				leafIndex: 3,
				value: JSON.stringify("test-value"),
				proof: [
					["0xabc", "0xdef"],
					["0x123", "0x456"],
					["0xroot"],
				],
			};
			const result = FingerprintLeafProofSchema.parse(input);
			expect(result.leafIndex).to.equal(3);
			expect(result.value).to.equal(JSON.stringify("test-value"));
			expect(result.proof).to.have.lengthOf(3);
		});

		it("rejects missing leafIndex", () => {
			expect(() =>
				FingerprintLeafProofSchema.parse({
					value: "test",
					proof: [["a"]],
				}),
			).to.throw();
		});

		it("rejects missing value", () => {
			expect(() =>
				FingerprintLeafProofSchema.parse({
					leafIndex: 0,
					proof: [["a"]],
				}),
			).to.throw();
		});

		it("rejects missing proof", () => {
			expect(() =>
				FingerprintLeafProofSchema.parse({
					leafIndex: 0,
					value: "test",
				}),
			).to.throw();
		});

		it("rejects non-string values in proof arrays", () => {
			expect(() =>
				FingerprintLeafProofSchema.parse({
					leafIndex: 0,
					value: "test",
					proof: [[1, 2]],
				}),
			).to.throw();
		});
	});

	describe("FingerprintProofsSchema", () => {
		it("parses an array of valid leaf proofs", () => {
			const input = [
				{
					leafIndex: 0,
					value: '"fonts-data"',
					proof: [["0xa", "0xb"], ["0xroot"]],
				},
				{
					leafIndex: 5,
					value: '"canvas-data"',
					proof: [["0xc", "0xd"], ["0xroot"]],
				},
			];
			const result = FingerprintProofsSchema.parse(input);
			expect(result).to.have.lengthOf(2);
		});

		it("parses an empty array", () => {
			const result = FingerprintProofsSchema.parse([]);
			expect(result).to.deep.equal([]);
		});

		it("rejects non-array input", () => {
			expect(() => FingerprintProofsSchema.parse("not-an-array")).to.throw();
		});
	});

	describe("FINGERPRINT_SOURCE_NAMES", () => {
		it("has the expected number of sources", () => {
			expect(FINGERPRINT_SOURCE_NAMES).to.have.lengthOf(
				FINGERPRINT_SOURCE_COUNT,
			);
		});

		it("contains known fingerprint sources", () => {
			expect(FINGERPRINT_SOURCE_NAMES).to.include("fonts");
			expect(FINGERPRINT_SOURCE_NAMES).to.include("canvas");
			expect(FINGERPRINT_SOURCE_NAMES).to.include("audio");
			expect(FINGERPRINT_SOURCE_NAMES).to.include("webGlBasics");
		});

		it("starts with 'fonts' and ends with 'webGlExtensions'", () => {
			expect(FINGERPRINT_SOURCE_NAMES[0]).to.equal("fonts");
			expect(
				FINGERPRINT_SOURCE_NAMES[FINGERPRINT_SOURCE_NAMES.length - 1],
			).to.equal("webGlExtensions");
		});

		it("has no duplicate entries", () => {
			const unique = new Set(FINGERPRINT_SOURCE_NAMES);
			expect(unique.size).to.equal(FINGERPRINT_SOURCE_NAMES.length);
		});
	});
});
