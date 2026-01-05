// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import { describe, expect, it } from "vitest";
import { Tier, TierMonthlyLimits, TierSchema } from "./user.js";

describe("user", () => {
	describe("Tier enum", () => {
		it("has correct enum values", () => {
			expect(Tier.Free).toBe("free");
			expect(Tier.Professional).toBe("professional");
			expect(Tier.Enterprise).toBe("enterprise");
		});
	});

	describe("TierSchema", () => {
		it("validates Free tier", () => {
			expect(() => TierSchema.parse(Tier.Free)).not.toThrow();
		});

		it("validates Professional tier", () => {
			expect(() => TierSchema.parse(Tier.Professional)).not.toThrow();
		});

		it("validates Enterprise tier", () => {
			expect(() => TierSchema.parse(Tier.Enterprise)).not.toThrow();
		});

		it("rejects invalid tier", () => {
			expect(() => TierSchema.parse("invalid")).toThrow();
		});

		it("rejects null", () => {
			expect(() => TierSchema.parse(null)).toThrow();
		});
	});

	describe("TierMonthlyLimits", () => {
		it("has correct limits for Free tier", () => {
			expect(TierMonthlyLimits[Tier.Free].verificationRequests).toBe(100000);
		});

		it("has correct limits for Professional tier", () => {
			expect(TierMonthlyLimits[Tier.Professional].verificationRequests).toBe(
				1000000,
			);
		});

		it("has correct limits for Enterprise tier", () => {
			expect(TierMonthlyLimits[Tier.Enterprise].verificationRequests).toBe(
				"Unlimited",
			);
		});
	});
});
