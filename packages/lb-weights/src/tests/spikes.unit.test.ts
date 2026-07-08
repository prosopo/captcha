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
import { detectWeightSpikes, meanStddev } from "../weights.js";

describe("meanStddev", () => {
	it("computes population mean and stddev", () => {
		const { mean, stddev } = meanStddev([2, 4, 4, 4, 5, 5, 7, 9]);
		expect(mean).toBe(5);
		expect(stddev).toBe(2);
	});

	it("returns zeros for empty input", () => {
		expect(meanStddev([])).toEqual({ mean: 0, stddev: 0 });
	});
});

describe("detectWeightSpikes", () => {
	it("flags a >1σ spike (below 2σ) at sigma 1", () => {
		// mean 10, stddev ~2.92; 15 is > 1σ (~12.92) but < 2σ (~15.83)
		const report = detectWeightSpikes([8, 9, 8, 15]);
		expect(report.spikes.length).toBe(1);
		expect(report.spikes[0]?.index).toBe(3);
		expect(report.spikes[0]?.sigma).toBe(1);
	});

	it("flags a >2σ spike at sigma 2", () => {
		// one large outlier sits well beyond 2σ
		const report = detectWeightSpikes([1, 1, 1, 1, 1, 1, 1, 1, 1, 100]);
		const spike = report.spikes.find((s) => s.weight === 100);
		expect(spike?.sigma).toBe(2);
	});

	it("only flags the max side, not low outliers", () => {
		const report = detectWeightSpikes([100, 100, 100, 100, 1]);
		// the low value (1) is below the mean and must not be flagged
		expect(report.spikes.every((s) => s.weight !== 1)).toBe(true);
	});

	it("produces no spikes when variance is zero", () => {
		expect(detectWeightSpikes([50, 50, 50]).spikes).toEqual([]);
	});

	it("produces no spikes for a single-member pool", () => {
		expect(detectWeightSpikes([100]).spikes).toEqual([]);
	});
});
