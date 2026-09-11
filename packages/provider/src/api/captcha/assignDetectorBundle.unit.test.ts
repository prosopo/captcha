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

import {
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProviderEnvironment } from "@prosopo/types-env";
import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AugmentedRequest } from "../../express.js";
import { resetAssignSecretCache } from "../../tasks/detection/assignSecret.js";
import { initDetectorBundlePool } from "../../tasks/detection/bundlePool.js";
import assignDetectorBundle from "./assignDetectorBundle.js";

const cacheDetectorBundle = vi.fn(
	async (_detectorSessionId: string, _bundleId: string) => true,
);

// A class rather than `vi.fn().mockImplementation`: the afterEach
// `clearAllMocks` strips implementations, which left every test after the first
// constructing an implementation-less mock and silently taking the handler's
// catch branch.
vi.mock("../../tasks/index.js", () => ({
	Tasks: class {
		frictionlessManager = {
			writeQueue: { cacheDetectorBundle },
		};
	},
}));

const makeReq = (ip = "203.0.113.1"): Request & AugmentedRequest =>
	({
		ip,
		body: { dapp: "site-key" },
		logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
	}) as unknown as Request & AugmentedRequest;

/** Writes `count` loadable bundles into `dir` and returns their ids. */
const writePool = (dir: string, count: number): string[] => {
	const ids: string[] = [];
	for (let i = 0; i < count; i++) {
		const id = `bundle-${i}`;
		writeFileSync(join(dir, `${id}.js`), `export default ${i};`);
		writeFileSync(
			join(dir, `${id}.json`),
			JSON.stringify({ privateKey: `PK${i}`, innerConfig: `C${i}` }),
		);
		ids.push(id);
	}
	return ids;
};

/** The bundle id handed to the session binding by the most recent assign. */
const assignedBundleId = (): string =>
	cacheDetectorBundle.mock.calls.at(-1)?.[1] as string;

const assignOnceWith = async (
	ip?: string,
): Promise<{ res: Response; json: ReturnType<typeof vi.fn> }> => {
	const r = makeRes();
	await assignDetectorBundle(env)(makeReq(ip), r.res, next);
	return r;
};
const assignOnce = async (ip?: string): Promise<void> => {
	await assignOnceWith(ip);
};

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
		resetAssignSecretCache();
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

	it("serves one caller the same bundle across many assigns", async () => {
		writePool(dir, 50);
		initDetectorBundlePool(dir);

		const served = new Set<string>();
		for (let i = 0; i < 200; i++) {
			await assignOnce();
			served.add(assignedBundleId());
		}

		expect(served.size).toBe(1);
	});

	it("keeps serving that bundle after the secret is re-read from disk", async () => {
		writePool(dir, 50);
		initDetectorBundlePool(dir);

		await assignOnce();
		const first = assignedBundleId();

		// Same volume, fresh process: the mapping must survive a restart.
		resetAssignSecretCache();
		await assignOnce();

		expect(assignedBundleId()).toBe(first);
	});

	it("returns the bundle body matching the id it recorded", async () => {
		writePool(dir, 50);
		initDetectorBundlePool(dir);

		const { json } = await assignOnceWith();
		const body = json.mock.calls[0]?.[0] as { detectorScript: string };
		expect(body.detectorScript).toBe(
			`export default ${assignedBundleId().replace("bundle-", "")};`,
		);
	});

	it("spreads distinct callers across the pool", async () => {
		writePool(dir, 50);
		initDetectorBundlePool(dir);

		const served = new Set<string>();
		for (let i = 0; i < 60; i++) {
			await assignOnce(`203.0.113.${i}`);
			served.add(assignedBundleId());
		}

		expect(served.size).toBeGreaterThan(1);
	});

	it("still assigns when Redis holds no client state", async () => {
		// The mapping is derived, so there is no lookup to miss.
		writePool(dir, 50);
		initDetectorBundlePool(dir);

		const { json } = await assignOnceWith();
		const body = json.mock.calls[0]?.[0] as { useProviderBundle: boolean };
		expect(body.useProviderBundle).toBe(true);
		expect(assignedBundleId()).toMatch(/^bundle-\d+$/);
	});

	it("writes the secret 0600 and leaves it alone on reload", async () => {
		writePool(dir, 50);
		initDetectorBundlePool(dir);

		await assignOnce();
		const secretPath = join(dir, ".assign-secret");
		const first = readFileSync(secretPath);
		expect(first.length).toBe(32);
		expect(statSync(secretPath).mode & 0o777).toBe(0o600);

		resetAssignSecretCache();
		await assignOnce();
		expect(readFileSync(secretPath)).toEqual(first);
	});
});
