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

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initDetectorBundlePool } from "../../../tasks/detection/bundlePool.js";
import { runEmptyDetectorPoolPowFallback } from "./shortCircuit.js";
import type { ShortCircuitInput } from "./shortCircuit.js";

vi.mock("./honeypotResponse.js", () => ({ attachHoneypot: vi.fn() }));

const makeInput = (
	sendPowCaptcha: (params: unknown) => Promise<unknown>,
	token = "0xtoken",
): ShortCircuitInput => {
	const input = {
		tasks: { frictionlessManager: { sendPowCaptcha } },
		env: { config: {} },
		clientRecord: { settings: {} },
		token,
		dapp: "site-key",
		ipAddress: { ip: "1.2.3.4" },
		ipInfo: undefined,
		flatHeaders: {},
		sessionMode: undefined,
		userSitekeyIpHash: "hash",
		requestId: "req-1",
		logger: { warn: vi.fn(), info: vi.fn() },
	};
	return input as unknown as ShortCircuitInput;
};

const makeRes = (): { res: Response; json: ReturnType<typeof vi.fn> } => {
	const json = vi.fn((body: unknown) => body);
	const res = { json } as unknown as Response;
	return { res, json };
};

describe("runEmptyDetectorPoolPowFallback", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "pool-fallback-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
		vi.clearAllMocks();
	});

	const addBundle = (d: string): void => {
		writeFileSync(join(d, "bundle-0.js"), "JS");
		writeFileSync(
			join(d, "bundle-0.json"),
			JSON.stringify({ privateKey: "PK", innerConfig: "C" }),
		);
	};

	it("serves a PoW captcha when the pool is empty", async () => {
		initDetectorBundlePool(dir); // empty dir ⇒ size 0
		const sendPowCaptcha = vi.fn(async () => ({ captchaType: "pow" }));
		const { res, json } = makeRes();

		const result = await runEmptyDetectorPoolPowFallback(
			makeInput(sendPowCaptcha),
			res,
		);

		expect(sendPowCaptcha).toHaveBeenCalledTimes(1);
		expect(json).toHaveBeenCalledWith({ captchaType: "pow" });
		expect(result).not.toBeNull();
	});

	it("synthesises a non-empty session token when the client sent an empty token", async () => {
		initDetectorBundlePool(dir); // empty ⇒ pow fallback
		let captured: { token?: string } | undefined;
		const sendPowCaptcha = vi.fn(async (params: unknown) => {
			captured = params as { token?: string };
			return { captchaType: "pow" };
		});
		const { res } = makeRes();

		// An empty token must not reach sendPowCaptcha as a falsy value — its
		// session-param validation rejects it, which 400s the flow.
		await runEmptyDetectorPoolPowFallback(makeInput(sendPowCaptcha, ""), res);

		expect(sendPowCaptcha).toHaveBeenCalledTimes(1);
		expect(captured?.token).toBeTruthy();
		expect(captured?.token).toMatch(/^nodetector-/);
	});

	it("returns null when the pool has bundles, whatever the client sent", async () => {
		addBundle(dir);
		initDetectorBundlePool(dir); // size 1
		const sendPowCaptcha = vi.fn(async () => ({ captchaType: "pow" }));
		const { res } = makeRes();

		// An empty token is the shape a client with no detector sends. With a
		// populated pool it must NOT bypass to PoW — the decision machine's
		// missing-token gate handles it instead.
		for (const token of ["0xtoken", ""]) {
			const result = await runEmptyDetectorPoolPowFallback(
				makeInput(sendPowCaptcha, token),
				res,
			);
			expect(result).toBeNull();
		}

		expect(sendPowCaptcha).not.toHaveBeenCalled();
	});
});
