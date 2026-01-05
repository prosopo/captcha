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
import {
	FrictionlessPenalties,
	PENALTY_ACCESS_RULE_DEFAULT,
	PENALTY_OLD_TIMESTAMP_DEFAULT,
	PENALTY_UNVERIFIED_HOST_DEFAULT,
	PENALTY_WEBVIEW_DEFAULT,
} from "./frictionless.js";

describe("frictionless", () => {
	describe("default penalty values", () => {
		it("has correct penalty defaults", () => {
			expect(PENALTY_OLD_TIMESTAMP_DEFAULT).toBe(0.2);
			expect(PENALTY_ACCESS_RULE_DEFAULT).toBe(0.5);
			expect(PENALTY_UNVERIFIED_HOST_DEFAULT).toBe(0.2);
			expect(PENALTY_WEBVIEW_DEFAULT).toBe(0.1);
		});
	});

	describe("FrictionlessPenalties", () => {
		it("validates penalties with defaults", () => {
			const penalties = {};

			const result = FrictionlessPenalties.parse(penalties);
			expect(result.PENALTY_OLD_TIMESTAMP).toBe(PENALTY_OLD_TIMESTAMP_DEFAULT);
			expect(result.PENALTY_ACCESS_RULE).toBe(PENALTY_ACCESS_RULE_DEFAULT);
			expect(result.PENALTY_UNVERIFIED_HOST).toBe(
				PENALTY_UNVERIFIED_HOST_DEFAULT,
			);
			expect(result.PENALTY_WEBVIEW).toBe(PENALTY_WEBVIEW_DEFAULT);
		});

		it("validates penalties with custom values", () => {
			const penalties = {
				PENALTY_OLD_TIMESTAMP: 0.3,
				PENALTY_ACCESS_RULE: 0.6,
			};

			const result = FrictionlessPenalties.parse(penalties);
			expect(result.PENALTY_OLD_TIMESTAMP).toBe(0.3);
			expect(result.PENALTY_ACCESS_RULE).toBe(0.6);
			expect(result.PENALTY_UNVERIFIED_HOST).toBe(
				PENALTY_UNVERIFIED_HOST_DEFAULT,
			);
		});

		it("rejects negative penalty values", () => {
			const penalties = {
				PENALTY_OLD_TIMESTAMP: -0.1,
			};

			expect(() => FrictionlessPenalties.parse(penalties)).toThrow();
		});

		it("rejects zero penalty values", () => {
			const penalties = {
				PENALTY_OLD_TIMESTAMP: 0,
			};

			expect(() => FrictionlessPenalties.parse(penalties)).toThrow();
		});
	});
});
