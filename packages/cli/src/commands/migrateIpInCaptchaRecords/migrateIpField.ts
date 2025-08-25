// Copyright 2021-2025 Prosopo (UK) Ltd.
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

import type { Logger } from "@prosopo/common";
import { getCompositeIpAddress } from "@prosopo/provider";
import { IpAddressType } from "@prosopo/types-database";
import { Address6 } from "ip-address";
import { type Db, Decimal128 } from "mongodb";

const MAX_IPV4_NUMERIC = 4294967295;
const BATCH_SIZE = 100_000;

export const migrateIpField = async (
	db: Db,
	collectionsToUpgrade: string[],
	logger: Logger,
) => {
	for (const collection of collectionsToUpgrade) {
		await migrateV4Records(db, collection, logger);
		await migrateV6Records(db, collection, logger);
	}
};

const migrateV4Records = async (db: Db, collection: string, logger: Logger) => {
	const searchArgs = {
		ipAddress: {
			$type: "number",
			$lte: Number(MAX_IPV4_NUMERIC),
		},
	};

	let totalModified = 0;
	let processed = 0;
	const count = await db.collection(collection).countDocuments(searchArgs);

	while (true) {
		const docs = await db
			.collection(collection)
			.find(searchArgs, { projection: { ipAddress: 1 } })
			.limit(BATCH_SIZE)
			.toArray();

		if (docs.length === 0) break;

		const operations = docs.map((doc) => ({
			updateOne: {
				filter: { _id: doc._id },
				update: {
					$set: {
						ipAddress: {
							lower: doc.ipAddress,
							type: IpAddressType.v4,
						},
					},
				},
			},
		}));

		const bulkResult = await db
			.collection(collection)
			.bulkWrite(operations, { ordered: false });

		totalModified += bulkResult?.modifiedCount || 0;
		processed += docs.length;

		logger.info(() => ({
			msg: `Migrated v4 batch (${docs.length}) [${processed}/${count}] in "${collection}"`,
		}));
	}

	logger.info(() => ({
		msg: `Migrated ${count} v4 records (${totalModified} modified) in "${collection}" collection`,
	}));
};

const migrateV6Records = async (db: Db, collection: string, logger: Logger) => {
	const searchArgs = {
		ipAddress: {
			$type: "number",
			$gt: Number(MAX_IPV4_NUMERIC),
		},
	};

	let totalModified = 0;
	let processed = 0;
	const count = await db.collection(collection).countDocuments(searchArgs);

	while (true) {
		const docs = await db
			.collection(collection)
			.find(searchArgs, { projection: { ipAddress: 1 } })
			.limit(BATCH_SIZE)
			.toArray();

		if (docs.length === 0) break;

		const operations = docs.map((doc) => {
			const ipAddress = Address6.fromBigInt(BigInt(doc.ipAddress));
			const compositeIpAddress = getCompositeIpAddress(ipAddress);

			return {
				updateOne: {
					filter: { _id: doc._id },
					update: {
						$set: {
							ipAddress: {
								lower: Decimal128.fromString(
									compositeIpAddress.lower.toString(),
								),
								upper: Decimal128.fromString(
									(compositeIpAddress.upper || 0n).toString(),
								),
								type: IpAddressType.v6,
							},
						},
					},
				},
			};
		});

		const bulkResult = await db
			.collection(collection)
			.bulkWrite(operations, { ordered: false });

		totalModified += bulkResult?.modifiedCount || 0;
		processed += docs.length;

		logger.info(() => ({
			msg: `Migrated v6 batch (${docs.length}) [${processed}/${count}] in "${collection}"`,
		}));
	}

	logger.info(() => ({
		msg: `Migrated ${count} v6 records (${totalModified} modified) in "${collection}"`,
	}));
};
