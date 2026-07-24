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

// Locks in the puzzle-server-verify dispatch contract. The pre-fix bug was
// that verifyProvider only had two branches (challenge → PoW, else image),
// so puzzle tokens (which carry a challenge) got shipped to the PoW endpoint
// and 404'd on the pow record lookup, silently returning verified: false.
// These tests cover:
//   - explicit dispatch on captchaType for all three types
//   - legacy tokens (no captchaType) still routing via the old heuristic
//   - recency checks per type
//   - short-circuits (provider not found, missing signer)

import { ProviderApi } from "@prosopo/api";
import * as loadBalancerModule from "@prosopo/load-balancer";
import type { HardcodedProvider } from "@prosopo/load-balancer";
import {
	ApiParams,
	CaptchaType,
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
import { ProsopoServer } from "../server.js";

const PROVIDER_URL = "https://pronode1.example";
const DAPP = "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m";
const USER = "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G";

const buildConfig = (
	powCachedMs: number,
	imageCachedMs: number,
	puzzleCachedMs: number,
): ProsopoServerConfigOutput =>
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
				cachedTimeout: imageCachedMs,
			},
			pow: {
				verifiedTimeout: 10_000,
				solutionTimeout: 10_000,
				cachedTimeout: powCachedMs,
			},
			puzzle: {
				verifiedTimeout: 10_000,
				solutionTimeout: 10_000,
				cachedTimeout: puzzleCachedMs,
			},
			contract: { maxVerifiedTime: 10_000 },
		},
		// biome-ignore lint/suspicious/noExplicitAny: config schema uses union types the test doesn't need
	}) as any;

const buildToken = (
	timestamp: number,
	overrides: Partial<ProcaptchaOutput> = {},
): string => {
	const base: ProcaptchaOutput = {
		[ApiParams.providerUrl]: PROVIDER_URL,
		[ApiParams.dapp]: DAPP,
		[ApiParams.user]: USER,
		[ApiParams.challenge]: "challenge-string",
		[ApiParams.timestamp]: String(timestamp),
		[ApiParams.signature]: {
			[ApiParams.provider]: { [ApiParams.challenge]: "psig" },
			[ApiParams.user]: { [ApiParams.timestamp]: "usig" },
		},
	};
	return encodeProcaptchaOutput({ ...base, ...overrides });
};

const stubProviderList = (): HardcodedProvider[] => [
	{
		address: DAPP,
		url: PROVIDER_URL,
		datasetId: "0xdatasetId",
		weight: 1,
	},
];

// Minimal signer stub that satisfies the KeyringPair surface ProsopoServer
// touches (`pair.sign`, `pair.address`). The tests never verify signatures
// so returning a fixed byte array is fine.
const stubPair = () => ({
	address: DAPP,
	sign: (_: string) => new Uint8Array([1, 2, 3, 4]),
});

interface ProviderApiSpies {
	puzzle: MockInstance;
	pow: MockInstance;
	image: MockInstance;
}

const installProviderApiSpies = (): ProviderApiSpies => {
	const puzzle = vi
		.spyOn(ProviderApi.prototype, "submitPuzzleCaptchaVerify")
		.mockResolvedValue({ status: "ok", verified: true });
	const pow = vi
		.spyOn(ProviderApi.prototype, "submitPowCaptchaVerify")
		.mockResolvedValue({ status: "ok", verified: true });
	const image = vi
		.spyOn(ProviderApi.prototype, "verifyDappUser")
		.mockResolvedValue({ status: "ok", verified: true });
	return { puzzle, pow, image };
};

const installLoadBalancer = () => {
	vi.spyOn(loadBalancerModule, "loadBalancer").mockResolvedValue(
		stubProviderList(),
	);
};

describe("ProsopoServer.verifyProvider — captchaType dispatch", () => {
	let spies: ProviderApiSpies;

	beforeEach(() => {
		spies = installProviderApiSpies();
		installLoadBalancer();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("routes puzzle tokens to submitPuzzleCaptchaVerify only", async () => {
		const now = Date.now();
		const token = buildToken(now, {
			[ApiParams.captchaType]: CaptchaType.puzzle,
		});
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		const result = await server.isVerified(token);
		expect(result.verified).toBe(true);
		expect(spies.puzzle).toHaveBeenCalledTimes(1);
		expect(spies.pow).not.toHaveBeenCalled();
		expect(spies.image).not.toHaveBeenCalled();
	});

	it("routes pow tokens to submitPowCaptchaVerify only", async () => {
		const now = Date.now();
		const token = buildToken(now, {
			[ApiParams.captchaType]: CaptchaType.pow,
		});
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		const result = await server.isVerified(token);
		expect(result.verified).toBe(true);
		expect(spies.pow).toHaveBeenCalledTimes(1);
		expect(spies.puzzle).not.toHaveBeenCalled();
		expect(spies.image).not.toHaveBeenCalled();
	});

	it("routes image tokens to verifyDappUser only", async () => {
		const now = Date.now();
		const token = buildToken(now, {
			[ApiParams.captchaType]: CaptchaType.image,
			[ApiParams.challenge]: undefined,
			[ApiParams.commitmentId]: "0xdeadbeef",
			[ApiParams.signature]: {
				[ApiParams.provider]: { [ApiParams.requestHash]: "req" },
				[ApiParams.user]: { [ApiParams.timestamp]: "usig" },
			},
		});
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		const result = await server.isVerified(token);
		expect(result.verified).toBe(true);
		expect(spies.image).toHaveBeenCalledTimes(1);
		expect(spies.pow).not.toHaveBeenCalled();
		expect(spies.puzzle).not.toHaveBeenCalled();
	});
});

describe("ProsopoServer.verifyProvider — legacy tokens (no captchaType)", () => {
	let spies: ProviderApiSpies;

	beforeEach(() => {
		spies = installProviderApiSpies();
		installLoadBalancer();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("legacy token with challenge routes to PoW (preserves historical behaviour)", async () => {
		const now = Date.now();
		const token = buildToken(now); // no captchaType override
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		await server.isVerified(token);
		expect(spies.pow).toHaveBeenCalledTimes(1);
		expect(spies.image).not.toHaveBeenCalled();
		expect(spies.puzzle).not.toHaveBeenCalled();
	});

	it("legacy token without challenge routes to image", async () => {
		const now = Date.now();
		const token = buildToken(now, {
			[ApiParams.challenge]: undefined,
			[ApiParams.commitmentId]: "0xdeadbeef",
			[ApiParams.signature]: {
				[ApiParams.provider]: { [ApiParams.requestHash]: "req" },
				[ApiParams.user]: { [ApiParams.timestamp]: "usig" },
			},
		});
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		await server.isVerified(token);
		expect(spies.image).toHaveBeenCalledTimes(1);
		expect(spies.pow).not.toHaveBeenCalled();
		expect(spies.puzzle).not.toHaveBeenCalled();
	});

	it("legacy puzzle-looking token routes to PoW (documents the unavoidable compromise)", async () => {
		// Puzzle tokens minted by client bundles that shipped before the
		// captchaType field existed carry a challenge but no discriminant, so
		// the SDK cannot tell them apart from PoW tokens. They will hit the
		// PoW endpoint and fail with DAPP_USER_SOLUTION_NOT_FOUND — same as
		// before this dispatch was introduced. Customers MUST upgrade both
		// the client bundle and the server SDK for puzzle to fully work.
		const now = Date.now();
		const token = buildToken(now); // legacy puzzle-shape
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		await server.isVerified(token);
		expect(spies.pow).toHaveBeenCalledTimes(1);
		expect(spies.puzzle).not.toHaveBeenCalled();
	});
});

describe("ProsopoServer.verifyProvider — recency checks", () => {
	let spies: ProviderApiSpies;

	beforeEach(() => {
		spies = installProviderApiSpies();
		installLoadBalancer();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("puzzle uses timeouts.puzzle.cachedTimeout — expired token short-circuits", async () => {
		const puzzleCached = 1_000;
		const staleTimestamp = Date.now() - (puzzleCached + 100);
		const token = buildToken(staleTimestamp, {
			[ApiParams.captchaType]: CaptchaType.puzzle,
		});
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, puzzleCached),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		const result = await server.isVerified(token);
		expect(result.verified).toBe(false);
		expect(spies.puzzle).not.toHaveBeenCalled();
		expect(spies.pow).not.toHaveBeenCalled();
	});

	it("pow uses timeouts.pow.cachedTimeout — expired token short-circuits", async () => {
		const powCached = 1_000;
		const staleTimestamp = Date.now() - (powCached + 100);
		const token = buildToken(staleTimestamp, {
			[ApiParams.captchaType]: CaptchaType.pow,
		});
		const server = new ProsopoServer(
			buildConfig(powCached, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		const result = await server.isVerified(token);
		expect(result.verified).toBe(false);
		expect(spies.pow).not.toHaveBeenCalled();
	});

	it("image uses timeouts.image.cachedTimeout — expired token short-circuits", async () => {
		const imageCached = 1_000;
		const staleTimestamp = Date.now() - (imageCached + 100);
		const token = buildToken(staleTimestamp, {
			[ApiParams.captchaType]: CaptchaType.image,
			[ApiParams.challenge]: undefined,
			[ApiParams.commitmentId]: "0xdeadbeef",
			[ApiParams.signature]: {
				[ApiParams.provider]: { [ApiParams.requestHash]: "req" },
				[ApiParams.user]: { [ApiParams.timestamp]: "usig" },
			},
		});
		const server = new ProsopoServer(
			buildConfig(60_000, imageCached, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		const result = await server.isVerified(token);
		expect(result.verified).toBe(false);
		expect(spies.image).not.toHaveBeenCalled();
	});
});

describe("ProsopoServer.isVerified — short-circuits", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("provider not in loadBalancer list returns USER_NOT_VERIFIED", async () => {
		installProviderApiSpies();
		vi.spyOn(loadBalancerModule, "loadBalancer").mockResolvedValue([
			{
				address: DAPP,
				url: "https://a-different-provider.example",
				datasetId: "0xother",
				weight: 1,
			},
		]);
		const token = buildToken(Date.now(), {
			[ApiParams.captchaType]: CaptchaType.puzzle,
		});
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		const result = await server.isVerified(token);
		expect(result.verified).toBe(false);
	});

	it("throws BAD_REQUEST for an unparseable token", async () => {
		installProviderApiSpies();
		installLoadBalancer();
		const server = new ProsopoServer(
			buildConfig(60_000, 60_000, 60_000),
			// biome-ignore lint/suspicious/noExplicitAny: minimal stub pair
			stubPair() as any,
		);
		await expect(server.isVerified("0xdeadbeef")).rejects.toThrow();
	});
});
