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
import type { IPInfoResult } from "@prosopo/types";
import type { IIpInfoService } from "@prosopo/types-env";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkIpForVpn, ipInfoIsVpn } from "../../../../tasks/spam/checkVpn.js";

const mockLogger = {
	info: () => {},
	error: () => {},
	warn: () => {},
	debug: () => {},
	trace: () => {},
	setLogLevel: () => {},
	getLogLevel: () => "info",
	getScope: () => "test",
} as unknown as Logger;

const baseInfo = (overrides: Partial<IPInfoResult> = {}): IPInfoResult => ({
	ip: "1.2.3.4",
	isValid: true,
	isVPN: false,
	isTor: false,
	isProxy: false,
	isDatacenter: false,
	isAbuser: false,
	isMobile: false,
	isSatellite: false,
	...overrides,
});

const createMockIpInfoService = (
	lookupFn: IIpInfoService["lookup"],
): IIpInfoService => ({
	initialize: vi.fn(),
	lookup: vi.fn().mockImplementation(lookupFn),
	isAvailable: vi.fn().mockReturnValue(true),
});

describe("ipInfoIsVpn", () => {
	it("returns false for invalid info", () => {
		expect(ipInfoIsVpn({ isValid: false, error: "boom", ip: "1.2.3.4" })).toBe(
			false,
		);
	});

	it("returns false for plain residential IPs", () => {
		expect(ipInfoIsVpn(baseInfo())).toBe(false);
	});

	it("flags VPN, proxy and Tor IPs", () => {
		expect(ipInfoIsVpn(baseInfo({ isVPN: true }))).toBe(true);
		expect(ipInfoIsVpn(baseInfo({ isProxy: true }))).toBe(true);
		expect(ipInfoIsVpn(baseInfo({ isTor: true }))).toBe(true);
	});
});

describe("checkIpForVpn", () => {
	let mockService: IIpInfoService;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("blocks VPN-classified IPs and surfaces the service name", async () => {
		mockService = createMockIpInfoService(async () =>
			baseInfo({ isVPN: true, vpnService: "ExampleVPN" }),
		);

		const result = await checkIpForVpn("1.2.3.4", mockService, mockLogger);

		expect(result).toEqual({
			isBlocked: true,
			reason: "VPN_BLOCKED",
			ipService: "ExampleVPN",
		});
	});

	it("allows residential IPs through", async () => {
		mockService = createMockIpInfoService(async () => baseInfo());

		const result = await checkIpForVpn("1.2.3.4", mockService, mockLogger);

		expect(result).toEqual({ isBlocked: false });
	});

	it("fails open if the lookup throws", async () => {
		mockService = createMockIpInfoService(async () => {
			throw new Error("network down");
		});

		const result = await checkIpForVpn("1.2.3.4", mockService, mockLogger);

		expect(result).toEqual({ isBlocked: false });
	});
});
