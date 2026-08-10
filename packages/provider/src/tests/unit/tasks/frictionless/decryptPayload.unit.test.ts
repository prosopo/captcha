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
import type { RedisWriteQueue } from "@prosopo/database";
import {
	FrictionlessPenalties,
	type KeyringPair,
	type ProsopoConfigOutput,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("decryptPayload", () => {
	let db: IProviderDatabase;
	let pair: KeyringPair;
	let config: ProsopoConfigOutput;
	let dir: string;

	beforeEach(() => {
		// A pool with a single bundle, resolvable by id "bundle-0". The pool is
		// initialised inside each test AFTER vi.resetModules() so it lands on the
		// same bundlePool module instance the manager imports.
		dir = mkdtempSync(join(tmpdir(), "decrypt-pool-"));
		writeFileSync(join(dir, "bundle-0.js"), "JS");
		writeFileSync(
			join(dir, "bundle-0.json"),
			JSON.stringify({ privateKey: "PK", innerConfig: "CFG" }),
		);

		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.resetModules();
		db = {
			updateFrictionlessTokenRecord: vi.fn(),
			storeFrictionlessTokenRecord: vi.fn(),
			storeSessionRecord: vi.fn(),
		} as unknown as IProviderDatabase;

		pair = {
			sign: vi.fn(),
			address: "testAddress",
		} as unknown as KeyringPair;

		config = {
			penalties: FrictionlessPenalties.parse({}),
			captchas: {
				solved: { count: 5 },
				unsolved: { count: 5 },
			},
			lRules: { en: 1 },
		} as unknown as ProsopoConfigOutput;

		vi.clearAllMocks();
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("should get values from the payload when the session bundle resolves", async () => {
		vi.doMock("../../../../tasks/detection/getBotScore.ts", () => ({
			getBotScore: vi.fn().mockImplementation(() => {
				return {
					baseBotScore: 1,
					timestamp: Date.now(),
				};
			}),
		}));
		// Init the pool on the post-reset module instance the manager will use.
		const { initDetectorBundlePool } = await import(
			"../../../../tasks/detection/bundlePool.js"
		);
		initDetectorBundlePool(dir);

		const FrictionlessManager = (
			await import("../../../../tasks/frictionless/frictionlessTasks.js")
		).FrictionlessManager;

		// Redis binding resolves detectorSessionId → bundle-0.
		const writeQueue = {
			getDetectorBundle: vi.fn().mockResolvedValue("bundle-0"),
		} as unknown as RedisWriteQueue;

		const frictionlessTaskManager = new FrictionlessManager(
			db,
			pair,
			config,
			undefined,
			writeQueue,
		);

		const result = await frictionlessTaskManager.decryptPayload(
			"payload",
			"headHash",
			"det-1",
		);
		expect(result).toEqual({
			baseBotScore: 1,
			timestamp: expect.any(Number),
			userId: undefined,
			userAgent: undefined,
			webView: false,
			iFrame: false,
			decryptedHeadHash: "",
			decryptionFailed: false,
			bundleId: "bundle-0",
		});
	});

	it("fails closed (treated as bot) when no detector bundle can be resolved", async () => {
		const FrictionlessManager = (
			await import("../../../../tasks/frictionless/frictionlessTasks.js")
		).FrictionlessManager;

		// No writeQueue / no detectorSessionId ⇒ no bundle ⇒ no decrypt attempt.
		const frictionlessTaskManager = new FrictionlessManager(db, pair, config);

		const result = await frictionlessTaskManager.decryptPayload(
			"payload",
			"headHash",
		);
		expect(result.decryptionFailed).toBe(true);
		expect(result.baseBotScore).toBe(1);
		expect(result.bundleId).toBeUndefined();
	});
});
