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
): ShortCircuitInput => {
	const input = {
		tasks: { frictionlessManager: { sendPowCaptcha } },
		env: { config: {} },
		clientRecord: { settings: {} },
		token: "0xtoken",
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

	it("returns null (proceed with detection) when the pool has bundles", async () => {
		writeFileSync(join(dir, "bundle-0.js"), "JS");
		writeFileSync(
			join(dir, "bundle-0.json"),
			JSON.stringify({ privateKey: "PK", innerConfig: "C" }),
		);
		initDetectorBundlePool(dir); // size 1
		const sendPowCaptcha = vi.fn(async () => ({ captchaType: "pow" }));
		const { res } = makeRes();

		const result = await runEmptyDetectorPoolPowFallback(
			makeInput(sendPowCaptcha),
			res,
		);

		expect(result).toBeNull();
		expect(sendPowCaptcha).not.toHaveBeenCalled();
	});
});
