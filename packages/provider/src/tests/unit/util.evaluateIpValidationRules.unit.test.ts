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

import type { Logger } from "@prosopo/logger";
import {
	type IPComparison,
	type IPConnectionType,
	IPValidationAction,
} from "@prosopo/types";
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
		reputationScoreThreshold: 0.15,
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
					connectionType: "datacenter",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "datacenter",
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
					connectionType: "datacenter",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					city: "CityB",
					provider: "X",
					connectionType: "datacenter",
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
					connectionType: "datacenter",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					city: "CityB",
					provider: "X",
					connectionType: "datacenter",
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
			reputationScoreThreshold: 0.15,
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
					reputationScoreThreshold: 0.3,
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

	it("returns Reject if the reputation score meets the threshold", () => {
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
					reputationScore: 0.03,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					reputationScore: 0.3,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Reject);
		expect(result.errorMessage).toContain(
			"Reputation score 0.3000 is at or above threshold 0.15",
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
					reputationScore: 0.03,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					reputationScore: 0.06,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Allow);
	});

	it("reports the higher of the two abuse scores", () => {
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
					reputationScore: 0.9,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					reputationScore: 0.3,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const result = evaluateIpValidationRules(comparison, baseRules, mockLogger);
		expect(result.action).toBe(IPValidationAction.Reject);
		expect(result.errorMessage).toContain(
			"Reputation score 0.9000 is at or above threshold 0.15",
		);
	});

	// Two Reject actions are configured, so one rule being met must not fill the quota.
	it("counts a both-IPs-exceed abuse score as a single condition under requireAllConditions", () => {
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
					reputationScore: 0.6,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					reputationScore: 0.9,
				},
				differentProviders: false,
				differentConnectionTypes: false,
				anyVpnOrProxy: false,
			},
		};
		const rules: IIPValidationRules = {
			...baseRules,
			actions: {
				...baseRules.actions,
				ispChangeAction: IPValidationAction.Reject,
				abuseScoreExceedAction: IPValidationAction.Reject,
			},
			requireAllConditions: true,
		};
		const result = evaluateIpValidationRules(comparison, rules, mockLogger);
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
					reputationScore: 0.03,
				},
				ip2Details: {
					country: "B",
					countryCode: "B",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					reputationScore: 0.21,
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
					reputationScoreThreshold: 0.003,
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

	describe("dual-stack address pair skip", () => {
		const dualStackRules: IIPValidationRules = {
			...baseRules,
			actions: {
				...baseRules.actions,
				cityChangeAction: IPValidationAction.Reject,
				distanceExceedAction: IPValidationAction.Reject,
				ispChangeAction: IPValidationAction.Reject,
			},
			distanceThresholdKm: 300,
		};

		// IPv4 leg on the access carrier, IPv6 leg on a wholesaler with its own
		// ASN and POP: different provider, city and a long distance apart.
		const dualStackComparison = (
			overrides: {
				ip1?: string;
				ip2?: string;
				ip2CountryCode?: string;
				ip2ConnectionType?: IPConnectionType;
				anyVpnOrProxy?: boolean;
				ip2ReputationScore?: number;
			} = {},
		): IPComparisonResult => ({
			ipsMatch: false,
			ip1: overrides.ip1 ?? "203.0.113.10",
			ip2: overrides.ip2 ?? "2001:db8:1234:5678::1",
			comparison: {
				ip1Details: {
					country: "Country A",
					countryCode: "AA",
					city: "City One",
					provider: "Access Carrier",
					connectionType: "residential",
					isVpnOrProxy: false,
				},
				ip2Details: {
					country:
						overrides.ip2CountryCode === undefined ? "Country A" : "Country B",
					countryCode: overrides.ip2CountryCode ?? "AA",
					city: "City Two",
					provider: "IPv6 Wholesaler",
					connectionType: overrides.ip2ConnectionType ?? "residential",
					isVpnOrProxy: overrides.anyVpnOrProxy ?? false,
					reputationScore: overrides.ip2ReputationScore,
				},
				distanceKm: 400,
				differentProviders: true,
				differentConnectionTypes: false,
				anyVpnOrProxy: overrides.anyVpnOrProxy ?? false,
			},
		});

		it("skips ISP, city and distance rules for an IPv4/IPv6 pair in one country", () => {
			const result = evaluateIpValidationRules(
				dualStackComparison(),
				dualStackRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Allow);
			expect(result.errorMessage).toBeUndefined();
		});

		it("treats an IPv4-mapped IPv6 address as IPv4", () => {
			const result = evaluateIpValidationRules(
				dualStackComparison({ ip1: "::ffff:203.0.113.10" }),
				dualStackRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Allow);
		});

		it("does not skip when both addresses are in the same family", () => {
			const result = evaluateIpValidationRules(
				dualStackComparison({ ip2: "198.51.100.20" }),
				dualStackRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
		});

		it("does not skip when the countries differ", () => {
			const result = evaluateIpValidationRules(
				dualStackComparison({ ip2CountryCode: "BB" }),
				dualStackRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
		});

		it("does not skip when either side is a datacenter", () => {
			const result = evaluateIpValidationRules(
				dualStackComparison({ ip2ConnectionType: "datacenter" }),
				dualStackRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
		});

		it("does not skip when either side is a VPN or proxy", () => {
			const result = evaluateIpValidationRules(
				dualStackComparison({ anyVpnOrProxy: true }),
				dualStackRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
		});

		it("still applies the reputation rule", () => {
			const result = evaluateIpValidationRules(
				dualStackComparison({ ip2ReputationScore: 0.5 }),
				dualStackRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
			expect(result.errorMessage).toContain("Reputation score");
		});
	});

	describe("same trusted provider skip", () => {
		const sameProviderRules: IIPValidationRules = {
			...baseRules,
			actions: {
				...baseRules.actions,
				cityChangeAction: IPValidationAction.Reject,
				distanceExceedAction: IPValidationAction.Reject,
			},
			distanceThresholdKm: 500,
		};

		it("skips city and distance rules when both IPs share the same non-datacenter provider in the same country (eyematch shape)", () => {
			const comparison: IPComparisonResult = {
				ipsMatch: false,
				ip1: "68.153.66.63",
				ip2: "2600:387:15:6437::7",
				comparison: {
					ip1Details: {
						country: "United States",
						countryCode: "US",
						city: "Laredo",
						provider: "AT&T Enterprises, LLC",
						connectionType: "residential",
						isVpnOrProxy: false,
					},
					ip2Details: {
						country: "United States",
						countryCode: "US",
						city: "San Antonio",
						provider: "AT&T Enterprises, LLC",
						connectionType: "residential",
						isVpnOrProxy: false,
					},
					distanceKm: 1930,
					differentProviders: false,
					differentConnectionTypes: false,
					anyVpnOrProxy: false,
				},
			};
			const result = evaluateIpValidationRules(
				comparison,
				sameProviderRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Allow);
			expect(result.errorMessage).toBeUndefined();
		});

		it("does not skip when either endpoint is a datacenter (guards AWS/Cloudflare same-company case)", () => {
			const comparison: IPComparisonResult = {
				ipsMatch: false,
				ip1: "ip1",
				ip2: "ip2",
				comparison: {
					ip1Details: {
						country: "United States",
						countryCode: "US",
						city: "Ashburn",
						provider: "Amazon.com, Inc.",
						connectionType: "datacenter",
						isVpnOrProxy: false,
					},
					ip2Details: {
						country: "United States",
						countryCode: "US",
						city: "Ashburn",
						provider: "Amazon.com, Inc.",
						connectionType: "datacenter",
						isVpnOrProxy: false,
					},
					distanceKm: 3800,
					differentProviders: false,
					differentConnectionTypes: false,
					anyVpnOrProxy: false,
				},
			};
			const result = evaluateIpValidationRules(
				comparison,
				sameProviderRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
			expect(result.errorMessage).toMatch(/IP addresses are 3800\.00km apart/);
		});

		it("does not skip when provider is Unknown on both sides", () => {
			const comparison: IPComparisonResult = {
				ipsMatch: false,
				ip1: "ip1",
				ip2: "ip2",
				comparison: {
					ip1Details: {
						country: "United States",
						countryCode: "US",
						city: "A",
						provider: "Unknown",
						connectionType: "residential",
						isVpnOrProxy: false,
					},
					ip2Details: {
						country: "United States",
						countryCode: "US",
						city: "B",
						provider: "Unknown",
						connectionType: "residential",
						isVpnOrProxy: false,
					},
					distanceKm: 2000,
					differentProviders: false,
					differentConnectionTypes: false,
					anyVpnOrProxy: false,
				},
			};
			const result = evaluateIpValidationRules(
				comparison,
				sameProviderRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
		});

		it("does not skip when country codes differ", () => {
			const comparison: IPComparisonResult = {
				ipsMatch: false,
				ip1: "ip1",
				ip2: "ip2",
				comparison: {
					ip1Details: {
						country: "United States",
						countryCode: "US",
						city: "New York",
						provider: "Vodafone Group",
						connectionType: "residential",
						isVpnOrProxy: false,
					},
					ip2Details: {
						country: "United Kingdom",
						countryCode: "GB",
						city: "London",
						provider: "Vodafone Group",
						connectionType: "residential",
						isVpnOrProxy: false,
					},
					distanceKm: 5500,
					differentProviders: false,
					differentConnectionTypes: false,
					anyVpnOrProxy: false,
				},
			};
			const result = evaluateIpValidationRules(
				comparison,
				sameProviderRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
		});

		it("still applies abuse-score rule even when same-provider skip fires", () => {
			const comparison: IPComparisonResult = {
				ipsMatch: false,
				ip1: "ip1",
				ip2: "ip2",
				comparison: {
					ip1Details: {
						country: "United States",
						countryCode: "US",
						city: "Laredo",
						provider: "AT&T Enterprises, LLC",
						connectionType: "residential",
						isVpnOrProxy: false,
						reputationScore: 0.03,
					},
					ip2Details: {
						country: "United States",
						countryCode: "US",
						city: "San Antonio",
						provider: "AT&T Enterprises, LLC",
						connectionType: "residential",
						isVpnOrProxy: false,
						reputationScore: 0.6,
					},
					distanceKm: 1930,
					differentProviders: false,
					differentConnectionTypes: false,
					anyVpnOrProxy: false,
				},
			};
			const result = evaluateIpValidationRules(
				comparison,
				sameProviderRules,
				mockLogger,
			);
			expect(result.action).toBe(IPValidationAction.Reject);
			expect(result.errorMessage).toContain("Reputation score");
		});
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
					reputationScore: 0.03,
				},
				ip2Details: {
					country: "A",
					countryCode: "A",
					provider: "X",
					connectionType: "residential",
					isVpnOrProxy: false,
					reputationScore: 0.3,
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
			"Reputation score 0.3000 is at or above threshold 0.15",
		);
	});
});
