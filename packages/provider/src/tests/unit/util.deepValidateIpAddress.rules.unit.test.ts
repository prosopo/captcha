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
import type { IIPValidationRules, IPInfoResult } from "@prosopo/types";
import { IPValidationAction } from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { Address4, Address6 } from "ip-address";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deepValidateIpAddress } from "../../util.js";

// The sibling suite (util.ipDistance) spies compareIPs out and feeds
// evaluateIpValidationRules a hand-built comparison object. That seam is
// precisely where `abuserScore` went missing: the producer never set the field,
// the consumer read it, and both halves passed their own tests for months while
// abuseScoreExceedAction did nothing on every site that configured it. These
// tests deliberately run the REAL compareIPs so the join is covered.

const mockIpInfo = (overrides: Partial<IPInfoResult>): IPInfoResult => ({
	ip: "8.8.8.8",
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	isCrawler: false,
	providerName: "Example ISP",
	providerType: "isp",
	asnNumber: 1234,
	asnOrganization: "Example ISP",
	country: "United Kingdom",
	countryCode: "GB",
	city: "London",
	latitude: 51.5072,
	longitude: -0.1276,
	timezone: "Europe/London",
	...overrides,
});

// Everything except the abuse rule set to Allow, so a rejection can only have
// come from the abuse-score branch.
const abuseOnlyRules = (threshold: number): IIPValidationRules => ({
	enabled: true,
	actions: {
		countryChangeAction: IPValidationAction.Allow,
		cityChangeAction: IPValidationAction.Allow,
		ispChangeAction: IPValidationAction.Allow,
		distanceExceedAction: IPValidationAction.Allow,
		abuseScoreExceedAction: IPValidationAction.Reject,
	},
	distanceThresholdKm: 1000,
	abuseScoreThreshold: 0.005,
	reputationScoreThreshold: threshold,
	requireAllConditions: false,
	forceConsistentIp: false,
});

describe("deepValidateIpAddress with ipValidationRules", () => {
	let mockLogger: Logger;
	let lookup: ReturnType<typeof vi.fn>;
	let ipInfoService: IIpInfoService;

	beforeEach(() => {
		const withMock: Logger["with"] = vi.fn(() => mockLogger);
		mockLogger = {
			info: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
			log: vi.fn(),
			warn: vi.fn(),
			with: withMock,
		} as unknown as Logger;
		lookup = vi.fn();
		ipInfoService = {
			initialize: vi.fn(),
			accountSighting: vi
				.fn<IIpInfoService["accountSighting"]>()
				.mockResolvedValue(undefined),
			lookup: lookup as unknown as IIpInfoService["lookup"],
			country: vi.fn().mockReturnValue(undefined),
			isAvailable: vi.fn().mockReturnValue(true),
		};
	});

	it("rejects when the verify IP's reputation score meets the threshold", async () => {
		lookup
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "1.1.1.1", reputationScore: 0.001 }),
			)
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "8.8.8.8", reputationScore: 0.42 }),
			);

		const result = await deepValidateIpAddress({
			ip: "8.8.8.8",
			challengeIpAddress: new Address4("1.1.1.1"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("Reputation score 0.4200");
	});

	it("rejects on the challenge IP's reputation score too, not just the verify IP", async () => {
		lookup
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "1.1.1.1", reputationScore: 0.42 }),
			)
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "8.8.8.8", reputationScore: 0.001 }),
			);

		const result = await deepValidateIpAddress({
			ip: "8.8.8.8",
			challengeIpAddress: new Address4("1.1.1.1"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("Reputation score 0.4200");
	});

	it("allows when both reputation scores sit under the threshold", async () => {
		lookup
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "1.1.1.1", reputationScore: 0.01 }),
			)
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "8.8.8.8", reputationScore: 0.19 }),
			);

		const result = await deepValidateIpAddress({
			ip: "8.8.8.8",
			challengeIpAddress: new Address4("1.1.1.1"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(true);
	});

	// Many addresses have no reputation score. `?? 0` would have made a
	// missing score indistinguishable from a low one; it must simply not fire.
	it("allows when neither address has a reputation score", async () => {
		lookup
			.mockResolvedValueOnce(mockIpInfo({ ip: "1.1.1.1" }))
			.mockResolvedValueOnce(mockIpInfo({ ip: "8.8.8.8" }));

		const result = await deepValidateIpAddress({
			ip: "8.8.8.8",
			challengeIpAddress: new Address4("1.1.1.1"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(true);
	});

	it("ignores the abuser scores", async () => {
		lookup
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "1.1.1.1", isAbuser: true, abuserScore: 0.9 }),
			)
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "8.8.8.8", isAbuser: true, companyAbuserScore: 0.9 }),
			);

		const result = await deepValidateIpAddress({
			ip: "8.8.8.8",
			challengeIpAddress: new Address4("1.1.1.1"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(true);
	});

	it("short-circuits to valid on an exact IP match without consulting ipinfo", async () => {
		const result = await deepValidateIpAddress({
			ip: "1.1.1.1",
			challengeIpAddress: new Address4("1.1.1.1"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(true);
		expect(lookup).not.toHaveBeenCalled();
	});

	it("rejects on forceConsistentIp when the DNS peer IP differs from the client IP", async () => {
		const result = await deepValidateIpAddress({
			ip: "8.8.8.8",
			challengeIpAddress: new Address4("8.8.8.8"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: { ...abuseOnlyRules(0.2), forceConsistentIp: true },
			dnsPeerIp: "9.9.9.9",
		});

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("does not match dnsEvent.peerIp");
		expect(lookup).not.toHaveBeenCalled();
	});

	it("allows a rotated IPv6 address inside the same /64 without consulting ipinfo", async () => {
		const result = await deepValidateIpAddress({
			ip: "2001:db8:aa:bb::6",
			challengeIpAddress: new Address6("2001:db8:aa:bb::5"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(true);
		expect(lookup).not.toHaveBeenCalled();
	});

	it("allows a neighbouring IPv4 address inside the same /24 without consulting ipinfo", async () => {
		const result = await deepValidateIpAddress({
			ip: "203.0.113.23",
			challengeIpAddress: new Address4("203.0.113.22"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(true);
		expect(lookup).not.toHaveBeenCalled();
	});

	it("still checks an IPv6 address outside the challenge /64", async () => {
		lookup
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "2001:db8:aa:bb::5", reputationScore: 0.42 }),
			)
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "2001:db8:aa:cc::5", reputationScore: 0.42 }),
			);

		const result = await deepValidateIpAddress({
			ip: "2001:db8:aa:cc::5",
			challengeIpAddress: new Address6("2001:db8:aa:bb::5"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain("Reputation score 0.4200");
	});

	it("still checks an IPv4 address outside the challenge /24", async () => {
		lookup
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "203.0.113.22", reputationScore: 0.42 }),
			)
			.mockResolvedValueOnce(
				mockIpInfo({ ip: "203.0.114.22", reputationScore: 0.42 }),
			);

		const result = await deepValidateIpAddress({
			ip: "203.0.114.22",
			challengeIpAddress: new Address4("203.0.113.22"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(false);
	});

	// Fail-open is deliberate: an ipinfo outage must not reject real users.
	it("allows when the ipinfo lookup fails", async () => {
		lookup.mockResolvedValue({
			isValid: false,
			error: "lookup failed",
			ip: "8.8.8.8",
		});

		const result = await deepValidateIpAddress({
			ip: "8.8.8.8",
			challengeIpAddress: new Address4("1.1.1.1"),
			logger: mockLogger,
			ipInfoService,
			ipValidationRules: abuseOnlyRules(0.2),
		});

		expect(result.isValid).toBe(true);
	});
});
