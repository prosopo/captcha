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

import type { Logger } from "@prosopo/common";
import { type IPComparison, IPValidationAction } from "@prosopo/types";
import type { IIPValidationRules, IPComparisonResult } from "@prosopo/types";
import { describe, expect, it } from "vitest";
import { evaluateIpValidationRules } from "../../util.js";

const mockLogger = {
	info: () => {},
	error: () => {},
	warn: () => {},
	debug: () => {},
	setLogLevel: () => {},
	getLogLevel: () => "info",
	getScope: () => "test",
	trace: () => {},
} as unknown as Logger;

describe("evaluateIpValidationRules", () => {
	const baseRules: IIPValidationRules = {
		actions: {
			countryChangeAction: IPValidationAction.Flag,
			distanceExceedAction: IPValidationAction.Flag,
			ispChangeAction: IPValidationAction.Reject,
		},
		distanceThresholdKm: 1000,
		requireAllConditions: false,
	};

	it("returns Allow when no conditions are met", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: true,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			} as IPComparison,
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Allow);
		expect(result.errorMessage).toBeUndefined();
	});

	it("returns Reject if ISP change triggers Reject", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					provider: "Y",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				differentProviders: true,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Reject);
		expect(result.errorMessage).toContain("ISP changed");
	});

	it("returns Flag if country change triggers Flag", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "B",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				distanceKm: 2000,
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rules = {
			...baseRules,
			actions: {
				...baseRules.actions,
				countryChangeAction: IPValidationAction.Flag,
			},
		};
		const result = evaluateIpValidationRules(comparison, rules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Flag);
		expect(result.errorMessage).toContain("Country changed");
	});

	it("returns Flag if distance exceeds threshold", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				distanceKm: 2000,
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Flag);
		expect(result.errorMessage).toBeDefined();
		expect(result.errorMessage).toMatch(/IP addresses are 2000\.00km apart/);
	});

	it("returns no flag if one condition is true but requireAllConditions is true", () => {
		const requireAllRules: IIPValidationRules = {
			actions: {
				countryChangeAction: IPValidationAction.Reject,
				ispChangeAction: IPValidationAction.Reject,
				distanceExceedAction: IPValidationAction.Allow,
			},
			distanceThresholdKm: 1000,
			requireAllConditions: true,
		};
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					provider: "Y",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				distanceKm: 500,
				differentProviders: true,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(
			comparison,
			requireAllRules,
			mockLogger,
		);
		expect(result.action).toBe(IPValidationAction.Allow);
	});
});
