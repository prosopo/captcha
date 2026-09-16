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

import type { Logger } from "@prosopo/logger";
import {
	frictionlessImageThresholdDefault,
	frictionlessPuzzleThresholdDefault,
} from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";
import { describe, expect, it, vi } from "vitest";
import {
	migrateFrictionlessLadder,
	runFrictionlessLadderMigration,
} from "../../../migrations/frictionlessLadder.js";

type ClientDoc = {
	account?: string;
	settings?: { frictionlessThreshold?: unknown };
};

type BulkOp = {
	updateOne: {
		filter: { account?: string };
		update: { $set: Record<string, unknown> };
	};
};

const buildLogger = (): Logger =>
	({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	}) as unknown as Logger;

const buildDb = (
	records: ClientDoc[],
	bulkWrite: (ops: BulkOp[]) => Promise<void> = async () => {},
): { db: IProviderDatabase; bulkWrite: typeof bulkWrite } => {
	const spy = vi.fn(bulkWrite);
	const db = {
		tables: {
			client: {
				find: () => ({ lean: async (): Promise<ClientDoc[]> => records }),
				bulkWrite: spy,
			},
		},
	} as unknown as IProviderDatabase;
	return { db, bulkWrite: spy };
};

describe("migrateFrictionlessLadder", () => {
	it("rewrites a bare number into the ladder, keeping it as the puzzle rung", async () => {
		const { db, bulkWrite } = buildDb([
			{ account: "site-a", settings: { frictionlessThreshold: 0.72 } },
		]);
		const result = await migrateFrictionlessLadder(db, buildLogger());

		expect(result).toEqual({ scanned: 1, migrated: 1 });
		const ops = vi.mocked(bulkWrite).mock.calls[0]?.[0] as BulkOp[];
		expect(ops[0]?.updateOne.filter).toEqual({ account: "site-a" });
		expect(ops[0]?.updateOne.update.$set).toEqual({
			"settings.frictionlessThreshold": {
				// The site's tuned pass boundary must survive verbatim — this
				// migration changes shape, not routing.
				frictionlessPuzzleThreshold: 0.72,
				frictionlessImageThreshold: frictionlessImageThresholdDefault,
			},
		});
	});

	it("gives a record with no threshold at all both defaults", async () => {
		const { db, bulkWrite } = buildDb([{ account: "legacy", settings: {} }]);
		await migrateFrictionlessLadder(db, buildLogger());

		const ops = vi.mocked(bulkWrite).mock.calls[0]?.[0] as BulkOp[];
		expect(ops[0]?.updateOne.update.$set).toEqual({
			"settings.frictionlessThreshold": {
				frictionlessPuzzleThreshold: frictionlessPuzzleThresholdDefault,
				frictionlessImageThreshold: frictionlessImageThresholdDefault,
			},
		});
	});

	it("is idempotent — a record already on the ladder is not rewritten", async () => {
		const { db, bulkWrite } = buildDb([
			{
				account: "done",
				settings: {
					frictionlessThreshold: {
						frictionlessPuzzleThreshold: 0.4,
						frictionlessImageThreshold: 1.2,
					},
				},
			},
		]);
		const result = await migrateFrictionlessLadder(db, buildLogger());

		expect(result).toEqual({ scanned: 1, migrated: 0 });
		expect(bulkWrite).not.toHaveBeenCalled();
	});

	it("migrates only the stale records in a mixed collection", async () => {
		const { db, bulkWrite } = buildDb([
			{ account: "stale", settings: { frictionlessThreshold: 0.5 } },
			{
				account: "fresh",
				settings: {
					frictionlessThreshold: {
						frictionlessPuzzleThreshold: 0.5,
						frictionlessImageThreshold: 1,
					},
				},
			},
		]);
		const result = await migrateFrictionlessLadder(db, buildLogger());

		expect(result).toEqual({ scanned: 2, migrated: 1 });
		const ops = vi.mocked(bulkWrite).mock.calls[0]?.[0] as BulkOp[];
		expect(ops).toHaveLength(1);
		expect(ops[0]?.updateOne.filter).toEqual({ account: "stale" });
	});

	it("skips records with no account rather than writing an unfiltered update", async () => {
		// A bulkWrite with `{account: undefined}` as its filter would match an
		// arbitrary document. Never emit one.
		const { db, bulkWrite } = buildDb([
			{ settings: { frictionlessThreshold: 0.5 } },
		]);
		const result = await migrateFrictionlessLadder(db, buildLogger());

		expect(result).toEqual({ scanned: 1, migrated: 0 });
		expect(bulkWrite).not.toHaveBeenCalled();
	});

	it("does nothing when there is no client table", async () => {
		const db = { tables: undefined } as unknown as IProviderDatabase;
		expect(await migrateFrictionlessLadder(db, buildLogger())).toEqual({
			scanned: 0,
			migrated: 0,
		});
	});
});

describe("runFrictionlessLadderMigration", () => {
	it("swallows a failure so provider startup continues", async () => {
		// The read path already understands the pre-ladder shape, so a failed
		// migration must never stop the provider from serving.
		const db = {
			tables: {
				client: {
					find: () => ({
						lean: async () => {
							throw new Error("mongo is down");
						},
					}),
					bulkWrite: vi.fn(),
				},
			},
		} as unknown as IProviderDatabase;
		const logger = buildLogger();

		await expect(
			runFrictionlessLadderMigration(db, logger),
		).resolves.toBeUndefined();
		expect(logger.error).toHaveBeenCalled();
	});
});
