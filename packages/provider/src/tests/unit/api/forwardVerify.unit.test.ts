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
import { ClientApiPaths } from "@prosopo/types";
import type { ProviderEnvironment } from "@prosopo/types-env";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forwardVerifyIfNotIssuer } from "../../../api/forwardVerify.js";

const SELF_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const SELF_URL = "https://self.provider";
const OTHER_ADDRESS = "5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV";
const OTHER_URL = "https://other.provider";

const PROVIDERS = [
	{ address: SELF_ADDRESS, url: SELF_URL, datasetId: "0x01", weight: 1 },
	{ address: OTHER_ADDRESS, url: OTHER_URL, datasetId: "0x02", weight: 1 },
];

// Mock the provider list lookup.
const getProviders = vi.fn();
vi.mock("@prosopo/load-balancer", () => ({
	getProviders: (...args: unknown[]) => getProviders(...args),
}));

// Mock the forwarding HTTP client.
const forwardVerify = vi.fn();
vi.mock("@prosopo/api", () => ({
	ProviderApi: vi.fn().mockImplementation(() => ({ forwardVerify })),
}));

const mockEnv = (): ProviderEnvironment =>
	({
		defaultEnvironment: "development",
		pair: { address: SELF_ADDRESS },
	}) as unknown as ProviderEnvironment;

describe("forwardVerifyIfNotIssuer", () => {
	let logger: Logger;

	beforeEach(() => {
		vi.clearAllMocks();
		getProviders.mockResolvedValue(PROVIDERS);
		logger = {
			error: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
			warn: vi.fn(),
		} as unknown as Logger;
	});

	it("returns null (verify locally) when the token has no providerUrl", async () => {
		const result = await forwardVerifyIfNotIssuer({
			env: mockEnv(),
			logger,
			path: ClientApiPaths.VerifyPowCaptchaSolution,
			providerUrl: undefined,
			dapp: "dapp",
			user: "user",
			body: {},
		});
		expect(result).toBeNull();
		expect(forwardVerify).not.toHaveBeenCalled();
	});

	it("returns null when this node is the issuing provider", async () => {
		const result = await forwardVerifyIfNotIssuer({
			env: mockEnv(),
			logger,
			path: ClientApiPaths.VerifyPowCaptchaSolution,
			providerUrl: SELF_URL,
			dapp: "dapp",
			user: "user",
			body: {},
		});
		expect(result).toBeNull();
		expect(forwardVerify).not.toHaveBeenCalled();
	});

	it("returns null when the providerUrl is not a known provider (SSRF guard)", async () => {
		const result = await forwardVerifyIfNotIssuer({
			env: mockEnv(),
			logger,
			path: ClientApiPaths.VerifyPowCaptchaSolution,
			providerUrl: "https://evil.example",
			dapp: "dapp",
			user: "user",
			body: {},
		});
		expect(result).toBeNull();
		expect(forwardVerify).not.toHaveBeenCalled();
	});

	it("returns null (verify locally) when the provider list fails to load", async () => {
		getProviders.mockRejectedValue(new Error("network error"));

		const result = await forwardVerifyIfNotIssuer({
			env: mockEnv(),
			logger,
			path: ClientApiPaths.VerifyPowCaptchaSolution,
			providerUrl: OTHER_URL,
			dapp: "dapp",
			user: "user",
			body: {},
		});

		expect(result).toBeNull();
		expect(forwardVerify).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalled();
	});

	it("forwards to the issuing provider and returns its response", async () => {
		const response = { status: "ok", verified: true };
		forwardVerify.mockResolvedValue(response);
		const body = { token: "0xabc", dappSignature: "0xsig" };

		const result = await forwardVerifyIfNotIssuer({
			env: mockEnv(),
			logger,
			path: ClientApiPaths.VerifyPowCaptchaSolution,
			providerUrl: OTHER_URL,
			dapp: "dapp",
			user: "user",
			body,
		});

		expect(result).toBe(response);
		expect(forwardVerify).toHaveBeenCalledWith(
			ClientApiPaths.VerifyPowCaptchaSolution,
			body,
			"user",
		);
	});
});
