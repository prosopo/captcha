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
import { describe, expect, it } from "vitest";
import { INPUT_LIMITS } from "../api/inputLimits.js";
import { CaptchaTypes } from "./captcha.js";
import { DatasetWithIdsAndTreeSchema } from "./dataset.js";

const datasetWithTreeLevel = (
	leaves: number,
): {
	datasetId: string;
	captchas: [];
	format: CaptchaTypes;
	solutionTree: string[][];
	contentTree: string[][];
} => {
	const level: string[] = Array.from({ length: leaves }, () => "0x00");
	return {
		datasetId: "0x01",
		captchas: [],
		format: CaptchaTypes.SelectAll,
		solutionTree: [level],
		contentTree: [level],
	};
};

describe("DatasetWithIdsAndTreeSchema tree levels", () => {
	it("accepts the 20,000-leaf levels stored in production", () => {
		expect(
			DatasetWithIdsAndTreeSchema.safeParse(datasetWithTreeLevel(20_000))
				.success,
		).toBe(true);
	});

	it("rejects a level over DATASET_TREE_LEVEL", () => {
		expect(
			DatasetWithIdsAndTreeSchema.safeParse(
				datasetWithTreeLevel(INPUT_LIMITS.DATASET_TREE_LEVEL + 1),
			).success,
		).toBe(false);
	});
});
