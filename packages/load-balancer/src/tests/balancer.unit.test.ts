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
import { convertHostedProvider } from "../balancer.js";

const dualStackEntry = {
	address: "5DualStack",
	url: "https://pronode4.prosopo.io",
	datasetId: "0xdataset",
};

const ipv4Entry = {
	address: "5DualStack",
	url: "https://ipv4.pronode4.prosopo.io",
	datasetId: "0xdataset",
};

const ipv6Entry = {
	address: "5DualStack",
	url: "https://ipv6.pronode4.prosopo.io",
	datasetId: "0xdataset",
};

describe("convertHostedProvider", () => {
	it("returns dual-stack entries and skips ipv4/ipv6 sub-lists by default", () => {
		const result = convertHostedProvider({
			pronode4: dualStackEntry,
			ipv4: { pronode4: ipv4Entry },
			ipv6: { pronode4: ipv6Entry },
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.url).toBe("https://pronode4.prosopo.io");
	});

	it("returns the ipv4 sub-list when ipMode is ipv4", () => {
		const result = convertHostedProvider(
			{
				pronode4: dualStackEntry,
				ipv4: { pronode4: ipv4Entry },
				ipv6: { pronode4: ipv6Entry },
			},
			"ipv4",
		);

		expect(result).toHaveLength(1);
		expect(result[0]?.url).toBe("https://ipv4.pronode4.prosopo.io");
	});

	it("returns the ipv6 sub-list when ipMode is ipv6", () => {
		const result = convertHostedProvider(
			{
				pronode4: dualStackEntry,
				ipv4: { pronode4: ipv4Entry },
				ipv6: { pronode4: ipv6Entry },
			},
			"ipv6",
		);

		expect(result).toHaveLength(1);
		expect(result[0]?.url).toBe("https://ipv6.pronode4.prosopo.io");
	});

	it("falls back to dual-stack entries when the requested sub-list is missing", () => {
		const result = convertHostedProvider(
			{
				pronode4: dualStackEntry,
			},
			"ipv4",
		);

		expect(result).toHaveLength(1);
		expect(result[0]?.url).toBe("https://pronode4.prosopo.io");
	});

	it("tolerates a JSON that only contains the legacy dual-stack shape", () => {
		const result = convertHostedProvider({
			pronode4: dualStackEntry,
			pronode5: { ...dualStackEntry, url: "https://pronode5.prosopo.io" },
		});

		expect(result).toHaveLength(2);
		expect(result.map((r) => r.url)).toEqual([
			"https://pronode4.prosopo.io",
			"https://pronode5.prosopo.io",
		]);
	});
});
