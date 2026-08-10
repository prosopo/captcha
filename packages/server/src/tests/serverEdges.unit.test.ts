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

// Covers the failure and staleness paths of ProsopoServer that the dispatch
// suite does not reach: an unsignable timestamp, and the two legacy-token
// recency checks (the heuristic branch taken when a token carries no
// captchaType field).

import { ProviderApi } from "@prosopo/api";
import * as loadBalancerModule from "@prosopo/load-balancer";
import type { HardcodedProvider } from "@prosopo/load-balancer";
import {
	ApiParams,
	type KeyringPair,
	type ProcaptchaOutput,
	type ProsopoServerConfigOutput,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import {
	type MockInstance,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { PublicProsopoServer } from "../index.js";
import { ProsopoServer } from "../server.js";

const PROVIDER_URL = "https://pronode1.example";
const DAPP = "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m";
const USER = "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G";

const buildConfig = (cachedMs: number): ProsopoServerConfigOutput =>
	({
		userAccountAddress: undefined,
		web2: true,
		solutionThreshold: 80,
		dappName: "test",
		serverUrl: undefined,
		logLevel: "info",
		defaultEnvironment: "development",
		networks: {
			development: {
				endpoint: "wss://ignored",
				dappContract: { address: DAPP },
				procaptchaContract: { address: DAPP },
				proxyContract: { address: DAPP },
			},
		},
		account: { address: DAPP },
		timeouts: {
			image: {
				challengeTimeout: 10_000,
				solutionTimeout: 10_000,
				verifiedTimeout: 10_000,
				cachedTimeout: cachedMs,
			},
			pow: {
				verifiedTimeout: 10_000,
				solutionTimeout: 10_000,
				cachedTimeout: cachedMs,
			},
			puzzle: {
				verifiedTimeout: 10_000,
				solutionTimeout: 10_000,
				cachedTimeout: cachedMs,
			},
			contract: { maxVerifiedTime: 10_000 },
		},
	}) as unknown as ProsopoServerConfigOutput;

// a legacy token: no captchaType field, so verifyProvider falls back to the
// "challenge present ⇒ PoW, otherwise image" heuristic
const buildLegacyToken = (
	timestamp: number,
	withChallenge: boolean,
): string => {
	const base: ProcaptchaOutput = {
		[ApiParams.providerUrl]: PROVIDER_URL,
		[ApiParams.dapp]: DAPP,
		[ApiParams.user]: USER,
		[ApiParams.timestamp]: String(timestamp),
		[ApiParams.signature]: {
			[ApiParams.provider]: { [ApiParams.challenge]: "psig" },
			[ApiParams.user]: { [ApiParams.timestamp]: "usig" },
		},
	};
	if (withChallenge) {
		base[ApiParams.challenge] = "challenge-string";
	}
	return encodeProcaptchaOutput(base);
};

const stubProviderList = (): HardcodedProvider[] => [
	{ address: DAPP, url: PROVIDER_URL, datasetId: "0xdatasetId", weight: 1 },
];

const stubPair = (
	sign: (payload: string) => Uint8Array | undefined = (): Uint8Array =>
		new Uint8Array([1, 2, 3, 4]),
): KeyringPair => ({ address: DAPP, sign }) as unknown as KeyringPair;

interface ProviderApiSpies {
	puzzle: MockInstance;
	pow: MockInstance;
	image: MockInstance;
}

let spies: ProviderApiSpies;

beforeEach(() => {
	spies = {
		puzzle: vi
			.spyOn(ProviderApi.prototype, "submitPuzzleCaptchaVerify")
			.mockResolvedValue({ status: "ok", verified: true }),
		pow: vi
			.spyOn(ProviderApi.prototype, "submitPowCaptchaVerify")
			.mockResolvedValue({ status: "ok", verified: true }),
		image: vi
			.spyOn(ProviderApi.prototype, "verifyDappUser")
			.mockResolvedValue({ status: "ok", verified: true }),
	};
	vi.spyOn(loadBalancerModule, "loadBalancer").mockResolvedValue(
		stubProviderList(),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ProsopoServer.verifyProvider — signer failures", () => {
	it("throws when the signer cannot produce a signature", async () => {
		const server = new ProsopoServer(
			buildConfig(60_000),
			stubPair(() => undefined),
		);

		await expect(
			server.isVerified(buildLegacyToken(Date.now(), true)),
		).rejects.toThrow();
		expect(spies.pow).not.toHaveBeenCalled();
	});
});

describe("ProsopoServer.verifyProvider — legacy token recency", () => {
	it("rejects a stale legacy PoW token without calling the provider", async () => {
		const server = new ProsopoServer(buildConfig(1), stubPair());

		const result = await server.isVerified(
			buildLegacyToken(Date.now() - 60_000, true),
		);

		expect(result.verified).toBe(false);
		expect(spies.pow).not.toHaveBeenCalled();
	});

	it("verifies a fresh legacy PoW token via the pow endpoint", async () => {
		const server = new ProsopoServer(buildConfig(60_000), stubPair());

		const result = await server.isVerified(buildLegacyToken(Date.now(), true));

		expect(result.verified).toBe(true);
		expect(spies.pow).toHaveBeenCalledTimes(1);
	});

	it("rejects a stale legacy image token without calling the provider", async () => {
		const server = new ProsopoServer(buildConfig(1), stubPair());

		const result = await server.isVerified(
			buildLegacyToken(Date.now() - 60_000, false),
		);

		expect(result.verified).toBe(false);
		expect(spies.image).not.toHaveBeenCalled();
	});

	it("verifies a fresh legacy image token via verifyDappUser", async () => {
		const server = new ProsopoServer(buildConfig(60_000), stubPair());

		const result = await server.isVerified(buildLegacyToken(Date.now(), false));

		expect(result.verified).toBe(true);
		expect(spies.image).toHaveBeenCalledTimes(1);
	});
});

describe("PublicProsopoServer", () => {
	// well-known Alice address; getPair decodes it, so it must be a valid ss58
	const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

	it("builds a server from a config alone, deriving the pair from the site key", async () => {
		const config = buildConfig(60_000);
		config.account.address = ALICE;

		const server = await PublicProsopoServer(config);

		expect(server).toBeInstanceOf(ProsopoServer);
	});

	it("rejects a site key that is not a valid address", async () => {
		await expect(PublicProsopoServer(buildConfig(60_000))).rejects.toThrow();
	});
});
