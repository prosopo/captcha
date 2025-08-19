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
import { Decimal128 } from "bson";
import { Address6 } from "ip-address";
import type { Db } from "mongodb";

const MAX_IPV4_NUMERIC = 4294967295;

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
	const count = await db.collection(collection).countDocuments(searchArgs);

	await db
		.collection(collection)
		.aggregate([
			{
				$match: searchArgs,
			},
			{
				$addFields: {
					ipAddress: {
						lower: "$ipAddress",
						type: IpAddressType.v4,
					},
				},
			},
			{
				$merge: {
					into: collection,
					on: "_id",
					whenMatched: "merge",
				},
			},
		])
		// executes the pipeline
		.toArray();

	logger.info(() => ({
		msg: `Migrated ${count} v4 records in "${collection}" collection`,
	}));
};

const migrateV6Records = async (db: Db, collection: string, logger: Logger) => {
	const searchArgs = {
		ipAddress: {
			$type: "number",
			$gt: Number(MAX_IPV4_NUMERIC),
		},
	};
	const count = await db.collection(collection).countDocuments(searchArgs);

	const cursor = db
		.collection(collection)
		.find(searchArgs, { projection: { ipAddress: 1 } });

	const operations = [];

	for await (const doc of cursor) {
		const ipAddress = Address6.fromBigInt(BigInt(doc.ipAddress));
		const compositeIpAddress = getCompositeIpAddress(ipAddress);

		operations.push({
			updateOne: {
				filter: { _id: doc._id },
				update: {
					$set: {
						ipAddress: {
							// Long.fromString() for some reason leads to Int64 in records instead of NumberLong,
							// so we use Decimal128
							lower: Decimal128.fromString(compositeIpAddress.lower.toString()),
							upper: Decimal128.fromString(
								(compositeIpAddress.upper || 0n).toString(),
							),
							type: IpAddressType.v6,
						},
					},
				},
			},
		});
	}

	let bulkResult = undefined;

	if (operations.length > 0) {
		bulkResult = await db
			.collection(collection)
			.bulkWrite(operations, { ordered: false });
	}

	const modifiedCount = bulkResult?.modifiedCount || 0;

	logger.info(() => ({
		msg: `Migrated ${count} v6 records (${modifiedCount} modified) in "${collection}"`,
	}));
};
