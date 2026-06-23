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
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AugmentedRequest } from "../../express.js";
import { initDetectorBundlePool } from "../../tasks/detection/bundlePool.js";
import assignDetectorBundle from "./assignDetectorBundle.js";

const cacheDetectorBundle = vi.fn(
	async (_detectorSessionId: string, _bundleId: string) => true,
);

vi.mock("../../tasks/index.js", () => ({
	Tasks: vi.fn().mockImplementation(() => ({
		frictionlessManager: { writeQueue: { cacheDetectorBundle } },
	})),
}));

const makeReq = (): Request & AugmentedRequest =>
	({
		body: { dapp: "site-key" },
		logger: { warn: vi.fn(), info: vi.fn() },
	}) as unknown as Request & AugmentedRequest;

const makeRes = (): { res: Response; json: ReturnType<typeof vi.fn> } => {
	const json = vi.fn((body: unknown) => body);
	return { res: { json } as unknown as Response, json };
};

const env = {} as unknown as ProviderEnvironment;
const next: NextFunction = vi.fn();

describe("assignDetectorBundle", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "assign-"));
		cacheDetectorBundle.mockClear();
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
		vi.clearAllMocks();
	});

	it("returns useProviderBundle:false when the pool is empty", async () => {
		initDetectorBundlePool(dir); // empty
		const { res, json } = makeRes();

		await assignDetectorBundle(env)(makeReq(), res, next);

		expect(json).toHaveBeenCalledWith({
			useProviderBundle: false,
			status: "ok",
		});
		expect(cacheDetectorBundle).not.toHaveBeenCalled();
	});

	it("assigns a bundle, stores the binding, and returns the script", async () => {
		writeFileSync(join(dir, "bundle-0.js"), "export default 1;");
		writeFileSync(
			join(dir, "bundle-0.json"),
			JSON.stringify({ privateKey: "PK", innerConfig: "C" }),
		);
		initDetectorBundlePool(dir); // size 1
		const { res, json } = makeRes();

		await assignDetectorBundle(env)(makeReq(), res, next);

		expect(cacheDetectorBundle).toHaveBeenCalledTimes(1);
		const [detSessionId, bundleId] = cacheDetectorBundle.mock.calls[0] as [
			string,
			string,
		];
		expect(bundleId).toBe("bundle-0");
		expect(detSessionId).toMatch(/^det-/);
		const body = json.mock.calls[0]?.[0] as {
			useProviderBundle: boolean;
			detectorScript: string;
			detectorSessionId: string;
		};
		expect(body.useProviderBundle).toBe(true);
		expect(body.detectorScript).toBe("export default 1;");
		expect(body.detectorSessionId).toBe(detSessionId);
	});

	it("falls back to bundled when the Redis binding cannot be stored", async () => {
		writeFileSync(join(dir, "bundle-0.js"), "JS");
		writeFileSync(
			join(dir, "bundle-0.json"),
			JSON.stringify({ privateKey: "PK", innerConfig: "C" }),
		);
		initDetectorBundlePool(dir);
		cacheDetectorBundle.mockResolvedValueOnce(false);
		const { res, json } = makeRes();

		await assignDetectorBundle(env)(makeReq(), res, next);

		expect(json).toHaveBeenCalledWith({
			useProviderBundle: false,
			status: "ok",
		});
	});
});
