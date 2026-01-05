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
import { FilterScopeMatch } from "#policy/rulesStorage.js";

describe("FilterScopeMatch enum", () => {
	it("should have Exact value equal to 'exact'", () => {
		expect(FilterScopeMatch.Exact).toBe("exact");
	});

	it("should have Greedy value equal to 'greedy'", () => {
		expect(FilterScopeMatch.Greedy).toBe("greedy");
	});

	it("should have all expected enum values", () => {
		const values = Object.values(FilterScopeMatch);
		expect(values).toContain("exact");
		expect(values).toContain("greedy");
		expect(values.length).toBe(2);
	});

	it("should allow assignment to string variables", () => {
		const exact: string = FilterScopeMatch.Exact;
		const greedy: string = FilterScopeMatch.Greedy;
		expect(exact).toBe("exact");
		expect(greedy).toBe("greedy");
	});

	it("should be usable in object properties", () => {
		const filter = {
			policyScopeMatch: FilterScopeMatch.Exact,
			userScopeMatch: FilterScopeMatch.Greedy,
		};
		expect(filter.policyScopeMatch).toBe("exact");
		expect(filter.userScopeMatch).toBe("greedy");
	});
});

