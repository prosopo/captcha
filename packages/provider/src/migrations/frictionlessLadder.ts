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

// TEMPORARY — delete after the release that ships it.
//
// `settings.frictionlessThreshold` on provider client records changed from a
// bare number to the two-rung score ladder. Provider client records live in
// each provider's own database, not centrally, so they cannot be migrated by
// the central script; this runs once per container start instead.
//
// The runtime already tolerates the old shape (`resolveFrictionlessThreshold`
// reads a number as the puzzle rung), so this is a tidy-up, not a
// prerequisite. That is deliberate: the provider must boot and serve whether
// or not the migration succeeds.

import type { Logger } from "@prosopo/logger";
import { resolveFrictionlessThreshold } from "@prosopo/types";
import type { IProviderDatabase } from "@prosopo/types-database";

type LegacyClientRecord = {
	account?: string;
	settings?: { frictionlessThreshold?: unknown };
};

/** Already the ladder object? Anything else gets rewritten. */
const isLadder = (value: unknown): boolean =>
	typeof value === "object" &&
	value !== null &&
	"frictionlessPuzzleThreshold" in value &&
	"frictionlessImageThreshold" in value;

export type FrictionlessLadderMigrationResult = {
	scanned: number;
	migrated: number;
};

/**
 * Rewrite any pre-ladder `frictionlessThreshold` on this provider's client
 * records. Each record's existing number becomes its puzzle rung verbatim, so
 * no site's silent-pass boundary moves.
 *
 * Idempotent — records already carrying the object shape are skipped, so
 * restarting the container repeatedly is free after the first pass.
 */
export const migrateFrictionlessLadder = async (
	db: IProviderDatabase,
	logger: Logger,
): Promise<FrictionlessLadderMigrationResult> => {
	const clients = db.tables?.client;
	if (!clients) {
		logger.warn(() => ({
			msg: "Frictionless ladder migration skipped - no client table",
		}));
		return { scanned: 0, migrated: 0 };
	}

	const records = await clients.find().lean<LegacyClientRecord[]>();
	const ops = records
		.filter(
			(record) =>
				record.account !== undefined &&
				!isLadder(record.settings?.frictionlessThreshold),
		)
		.map((record) => {
			const current = record.settings?.frictionlessThreshold;
			return {
				updateOne: {
					filter: { account: record.account },
					update: {
						$set: {
							"settings.frictionlessThreshold": resolveFrictionlessThreshold(
								typeof current === "number" ? current : undefined,
							),
						},
					},
				},
			};
		});

	if (ops.length > 0) {
		await clients.bulkWrite(ops);
	}

	logger.info(() => ({
		msg: "Frictionless ladder migration complete",
		data: { scanned: records.length, migrated: ops.length },
	}));
	return { scanned: records.length, migrated: ops.length };
};

/**
 * Boot-time wrapper. Never throws: a failed migration must not stop the
 * provider from serving, because the read path already handles the old shape.
 */
export const runFrictionlessLadderMigration = async (
	db: IProviderDatabase,
	logger: Logger,
): Promise<void> => {
	try {
		await migrateFrictionlessLadder(db, logger);
	} catch (err) {
		logger.error(() => ({
			err,
			msg: "Frictionless ladder migration failed - continuing startup",
		}));
	}
};
