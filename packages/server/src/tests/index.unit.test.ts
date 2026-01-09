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

import { getPair } from "@prosopo/keyring";
import type { KeyringPair, ProsopoServerConfigOutput } from "@prosopo/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicProsopoServer } from "../index.js";
import { ProsopoServer } from "../server.js";

vi.mock("@prosopo/keyring");

describe("PublicProsopoServer", () => {
	let mockConfig: ProsopoServerConfigOutput;
	let mockPair: KeyringPair;

	beforeEach(() => {
		vi.clearAllMocks();

		mockConfig = {
			defaultEnvironment: "development",
			serverUrl: "http://localhost:9228",
			dappName: "test-app",
			account: {
				password: "",
				address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
				secret: "0x1234567890abcdef",
			},
			logLevel: "info",
			timeouts: {
				image: {
					cachedTimeout: 300000,
				},
				pow: {
					cachedTimeout: 600000,
				},
			},
		} as ProsopoServerConfigOutput;

		mockPair = {
			address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
		} as KeyringPair;

		vi.mocked(getPair).mockReturnValue(mockPair);
	});

	it("creates ProsopoServer with config and pair from getPair", async () => {
		const server = await PublicProsopoServer(mockConfig);

		expect(getPair).toHaveBeenCalledWith(undefined, mockConfig.account.address);
		expect(server).toBeInstanceOf(ProsopoServer);
		expect(server.config).toBe(mockConfig);
		expect(server.pair).toBe(mockPair);
	});

	it("handles empty address by calling getPair with empty string", async () => {
		const configWithEmptyAddress = {
			...mockConfig,
			account: {
				...mockConfig.account,
				address: "",
			},
		};

		await PublicProsopoServer(configWithEmptyAddress);

		expect(getPair).toHaveBeenCalledWith(undefined, "");
	});

	it("creates server with different address values", async () => {
		const differentAddress = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";
		const configWithDifferentAddress = {
			...mockConfig,
			account: {
				...mockConfig.account,
				address: differentAddress,
			},
		};

		await PublicProsopoServer(configWithDifferentAddress);

		expect(getPair).toHaveBeenCalledWith(undefined, differentAddress);
	});
});
