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
		enabled: true,
		actions: {
			countryChangeAction: IPValidationAction.Flag,
			cityChangeAction: IPValidationAction.Allow,
			distanceExceedAction: IPValidationAction.Flag,
			ispChangeAction: IPValidationAction.Reject,
			abuseScoreExceedAction: IPValidationAction.Reject,
		},
		distanceThresholdKm: 1000,
		abuseScoreThreshold: 0.005,
		requireAllConditions: false,
		forceConsistentIp: false,
	};

	it("returns Allow when no conditions are met", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: true,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {} as unknown as IPComparison,
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
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
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
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "B",
					countryCode: "B",
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
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
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

	it("returns Allow if city change triggers Allow", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					city: "CityA",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					city: "CityB",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Allow);
	});

	it("returns Flag if city change triggers Flag", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					city: "CityA",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					city: "CityB",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rules = {
			...baseRules,
			actions: {
				...baseRules.actions,
				cityChangeAction: IPValidationAction.Flag,
			},
		};
		const result = evaluateIpValidationRules(comparison, rules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Flag);
		expect(result.errorMessage).toContain("City changed");
	});

	it("returns Reject if city change triggers Reject", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					city: "CityA",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					city: "CityB",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rules = {
			...baseRules,
			actions: {
				...baseRules.actions,
				cityChangeAction: IPValidationAction.Reject,
			},
		};
		const result = evaluateIpValidationRules(comparison, rules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Reject);
		expect(result.errorMessage).toContain("City changed from CityA to CityB");
	});

	it("returns no flag if one condition is true but requireAllConditions is true", () => {
		const requireAllRules: IIPValidationRules = {
			enabled: true,
			actions: {
				countryChangeAction: IPValidationAction.Reject,
				cityChangeAction: IPValidationAction.Allow,
				ispChangeAction: IPValidationAction.Reject,
				distanceExceedAction: IPValidationAction.Allow,
				abuseScoreExceedAction: IPValidationAction.Reject,
			},
			distanceThresholdKm: 1000,
			abuseScoreThreshold: 0.005,
			requireAllConditions: true,
			forceConsistentIp: false,
		};
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
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

	it("applies country-specific overrides correctly", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "B",
					countryCode: "B",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rulesWithOverrides = {
			...baseRules,
			countryOverrides: {
				B: {
					actions: {
						countryChangeAction: IPValidationAction.Reject,
					},
				},
			},
		};
		const result = evaluateIpValidationRules(
			comparison,
			rulesWithOverrides,
			mockLogger,
		);
		expect(result.action).toBe(IPValidationAction.Reject);
		expect(result.errorMessage).toContain("Country changed from A to B");
	});

	it("applies country override for distance threshold", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "B",
					countryCode: "B",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				distanceKm: 800,
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rulesWithOverrides = {
			...baseRules,
			countryOverrides: {
				B: {
					actions: {},
					distanceThresholdKm: 500,
					abuseScoreThreshold: 0.01,
				},
			},
		};
		const result = evaluateIpValidationRules(
			comparison,
			rulesWithOverrides,
			mockLogger,
		);
		expect(result.action).toBe(IPValidationAction.Flag);
		expect(result.errorMessage).toContain(
			"IP addresses are 800.00km apart (>500km limit)",
		);
	});

	it("returns Reject if abuse score exceeds threshold", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.001,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.01,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Reject);
		expect(result.errorMessage).toContain(
			"Abuse score 0.0100 exceeds threshold 0.005",
		);
	});

	it("returns Allow if abuse score does not exceed threshold", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.001,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.002,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Allow);
	});

	it("applies country override for abuse score threshold", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.001,
				},
				ip2Details: {
					country: "B",
					countryCode: "B",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.007,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rulesWithOverrides = {
			...baseRules,
			countryOverrides: {
				B: {
					actions: {
						abuseScoreExceedAction: IPValidationAction.Flag,
					},
					distanceThresholdKm: 500,
					abuseScoreThreshold: 0.0001,
				},
			},
		};
		const result = evaluateIpValidationRules(
			comparison,
			rulesWithOverrides,
			mockLogger,
		);
		expect(result.action).toBe(IPValidationAction.Flag);
	});

	it("returns Flag if abuse score triggers Flag action", () => {
		const comparison: IPComparisonResult = {
			ipsMatch: false,
			ip1: "ip1",
			ip2: "ip2",
			comparison: {
				ip1Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.001,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					abuserScore: 0.01,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rules = {
			...baseRules,
			actions: {
				...baseRules.actions,
				abuseScoreExceedAction: IPValidationAction.Flag,
			},
		};
		const result = evaluateIpValidationRules(comparison, rules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Flag);
		expect(result.errorMessage).toContain(
			"Abuse score 0.0100 exceeds threshold 0.005",
		);
	});
});
