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

// A provider that accepts the verify request and never answers must not hold
// the site owner's request open: isVerified has to fail closed, promptly.

import {
	type IncomingMessage,
	type Server,
	type ServerResponse,
	createServer,
} from "node:http";
import type { AddressInfo } from "node:net";
import { ProsopoApiError } from "@prosopo/common";
import { Keyring } from "@prosopo/keyring";
import * as loadBalancerModule from "@prosopo/load-balancer";
import {
	ApiParams,
	CaptchaType,
	DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS,
	type ProcaptchaOutput,
	type ProsopoServerConfigOutput,
	ProsopoServerConfigSchema,
	encodeProcaptchaOutput,
} from "@prosopo/types";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { ProsopoServer } from "../server.js";

const DAPP = "5C1cs9CfxYQfNi3ARtprMDzR7BFRWFVSoDaLb1JytkiXwq5m";
const USER = "5CFHA8d3S1XXkZuBwGqiuA6SECTzfoucq397YL34FuPAH89G";
const TIMEOUT_MS = 250;

let server: Server;
let providerUrl: string;
const stalled: ServerResponse[] = [];

beforeAll(async () => {
	server = createServer((req: IncomingMessage, res: ServerResponse) => {
		req.resume();
		stalled.push(res);
	});
	await new Promise<void>((resolve) =>
		server.listen(0, "127.0.0.1", () => resolve()),
	);
	const { port } = server.address() as AddressInfo;
	providerUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
	for (const res of stalled) {
		res.destroy();
	}
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
	vi.restoreAllMocks();
});

const buildConfig = (timeoutMs?: number): ProsopoServerConfigOutput =>
	ProsopoServerConfigSchema.parse({
		defaultEnvironment: "development",
		account: { address: DAPP },
		...(timeoutMs === undefined ? {} : { providerRequestTimeoutMs: timeoutMs }),
	});

const buildToken = (captchaType: CaptchaType): string => {
	const output: ProcaptchaOutput = {
		[ApiParams.providerUrl]: providerUrl,
		[ApiParams.dapp]: DAPP,
		[ApiParams.user]: USER,
		[ApiParams.challenge]: "challenge-string",
		[ApiParams.timestamp]: String(Date.now()),
		[ApiParams.captchaType]: captchaType,
		[ApiParams.signature]: {
			[ApiParams.provider]: { [ApiParams.challenge]: "psig" },
			[ApiParams.user]: { [ApiParams.timestamp]: "usig" },
		},
	};
	return encodeProcaptchaOutput(output);
};

const newServer = (timeoutMs?: number): ProsopoServer => {
	vi.spyOn(loadBalancerModule, "loadBalancer").mockResolvedValue([
		{ address: DAPP, url: providerUrl, datasetId: "0xdataset", weight: 1 },
	]);
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	const pair = new Keyring({ type: "sr25519" }).addFromUri("//Alice");
	return new ProsopoServer(buildConfig(timeoutMs), pair);
};

describe("ProsopoServer against a stalled provider", () => {
	it("defaults the provider timeout to 10s", () => {
		expect(buildConfig().providerRequestTimeoutMs).toBe(
			DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS,
		);
		expect(DEFAULT_PROVIDER_REQUEST_TIMEOUT_MS).toBe(10_000);
	});

	it("rejects a non-positive timeout", () => {
		expect(() => buildConfig(0)).toThrow();
	});

	for (const captchaType of [
		CaptchaType.pow,
		CaptchaType.puzzle,
		CaptchaType.image,
		CaptchaType.authenticated,
	]) {
		it(`fails closed with a 504 at the timeout (${captchaType})`, async () => {
			const prosopoServer = newServer(TIMEOUT_MS);
			const started = Date.now();
			const outcome = await prosopoServer
				.isVerified(buildToken(captchaType))
				.then(
					(response) => ({ response, error: undefined }),
					(error: unknown) => ({ response: undefined, error }),
				);
			const elapsed = Date.now() - started;

			expect(outcome.response).toBeUndefined();
			expect(outcome.error).toBeInstanceOf(ProsopoApiError);
			if (outcome.error instanceof ProsopoApiError) {
				expect(outcome.error.context?.code).toBe(504);
			}
			expect(elapsed).toBeGreaterThanOrEqual(TIMEOUT_MS / 2);
			expect(elapsed).toBeLessThan(5_000);
		}, 15_000);
	}
});
