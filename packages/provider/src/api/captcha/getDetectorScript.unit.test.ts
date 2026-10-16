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
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AugmentedRequest } from "../../express.js";
import {
	getAssignSecret,
	resetAssignSecretCache,
} from "../../tasks/detection/assignSecret.js";
import {
	type DetectorBundlePool,
	initDetectorBundlePool,
} from "../../tasks/detection/bundlePool.js";
import { bundleForClient } from "../../tasks/detection/clientBundle.js";
import getDetectorScript from "./getDetectorScript.js";

const getDetectorBundle = vi.fn(
	async (_detectorSessionId: string): Promise<string | null> => null,
);

vi.mock("../../tasks/index.js", () => ({
	Tasks: class {
		frictionlessManager = {
			writeQueue: { getDetectorBundle },
		};
	},
}));

const SESSION_ID = "det-00000000-0000-4000-8000-000000000000";
const CALLER_IP = "203.0.113.1";

type MockResponse = {
	res: Response;
	status: ReturnType<typeof vi.fn>;
	set: ReturnType<typeof vi.fn>;
	send: ReturnType<typeof vi.fn>;
};

const makeRes = (): MockResponse => {
	const res = {} as Response;
	const status = vi.fn((_code: number) => res);
	const set = vi.fn((_headers: Record<string, string>) => res);
	const send = vi.fn((_body: string) => res);
	const end = vi.fn(() => res);
	Object.assign(res, { status, set, send, end });
	return { res, status, set, send };
};

const makeReq = (
	query: Record<string, string>,
	ip = CALLER_IP,
): Request & AugmentedRequest =>
	({
		ip,
		query,
		logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
	}) as unknown as Request & AugmentedRequest;

const env = {} as unknown as ProviderEnvironment;

const writePool = (dir: string, count: number): DetectorBundlePool => {
	for (let i = 0; i < count; i++) {
		writeFileSync(join(dir, `bundle-${i}.js`), `export default ${i};`);
		writeFileSync(
			join(dir, `bundle-${i}.json`),
			JSON.stringify({ privateKey: `PK${i}`, innerConfig: `C${i}` }),
		);
	}
	return initDetectorBundlePool(dir);
};

const fetchScript = async (
	query: Record<string, string>,
	ip?: string,
): Promise<MockResponse> => {
	const mock = makeRes();
	await getDetectorScript(env)(makeReq(query, ip), mock.res);
	return mock;
};

describe("getDetectorScript", () => {
	let dir: string;
	let pool: DetectorBundlePool;
	let callerBundleId: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "detector-script-"));
		resetAssignSecretCache();
		pool = writePool(dir, 50);
		callerBundleId = bundleForClient(
			pool,
			CALLER_IP,
			getAssignSecret(dir),
		).bundleId;
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
		vi.clearAllMocks();
	});

	it("serves the bound bundle as a JavaScript module", async () => {
		getDetectorBundle.mockResolvedValueOnce(callerBundleId);

		const { status, set, send } = await fetchScript({
			detectorSessionId: SESSION_ID,
		});

		expect(getDetectorBundle).toHaveBeenCalledWith(SESSION_ID);
		expect(status).toHaveBeenCalledWith(200);
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				"Content-Type": "text/javascript; charset=utf-8",
			}),
		);
		expect(send).toHaveBeenCalledWith(pool.get(callerBundleId)?.js);
	});

	it("404s without a detectorSessionId", async () => {
		const { status, send } = await fetchScript({});

		expect(status).toHaveBeenCalledWith(404);
		expect(send).not.toHaveBeenCalled();
	});

	it("404s when the session has no binding", async () => {
		getDetectorBundle.mockResolvedValueOnce(null);

		const { status, send } = await fetchScript({
			detectorSessionId: SESSION_ID,
		});

		expect(status).toHaveBeenCalledWith(404);
		expect(send).not.toHaveBeenCalled();
	});

	it("404s when the bound bundle is no longer in the pool", async () => {
		getDetectorBundle.mockResolvedValueOnce("bundle-gone");

		const { status } = await fetchScript({ detectorSessionId: SESSION_ID });

		expect(status).toHaveBeenCalledWith(404);
	});

	it("404s for a caller whose address maps to a different bundle", async () => {
		const secret = getAssignSecret(dir);
		let otherIp = "";
		for (let i = 2; i < 255 && !otherIp; i++) {
			const ip = `203.0.113.${i}`;
			if (bundleForClient(pool, ip, secret).bundleId !== callerBundleId) {
				otherIp = ip;
			}
		}
		getDetectorBundle.mockResolvedValueOnce(callerBundleId);

		const { status, send } = await fetchScript(
			{ detectorSessionId: SESSION_ID },
			otherIp,
		);

		expect(otherIp).not.toBe("");
		expect(status).toHaveBeenCalledWith(404);
		expect(send).not.toHaveBeenCalled();
	});
});
