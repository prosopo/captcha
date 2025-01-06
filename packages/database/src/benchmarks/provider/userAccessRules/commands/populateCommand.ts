// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { CommandBase } from "./commandBase.js";
import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import type { UserAccessRule } from "@prosopo/types-database";
import { Address4, Address6 } from "ip-address";
import type { Model } from "mongoose";

class PopulateCommand extends CommandBase implements CommandModule {
	public command = "populate";
	public describe = "Populate the database with a bunch of records";

	public builder = (yargs: Argv): Argv => {
		return yargs.option("entities-count-per-type", {
			type: "string" as const,
			describe: "Entities count per type",
		});
	};

	public handler = async (args: ArgumentsCamelCase): Promise<void> => {
		const entitiesCountPerTypeAsString =
			"string" === typeof args.entitiesCountPerType
				? args.entitiesCountPerType
				: "10";

		const model = await this.createModelByArgs(args);

		const entitiesCountPerType = Number.parseInt(entitiesCountPerTypeAsString);

		await this.createRecords(entitiesCountPerType, model);

		await this.disconnectMongoose();
	};

	protected async createRecords(
		entitiesCountPerType: number,
		model: Model<UserAccessRule>,
	): Promise<void> {
		for (let i = 0; i < entitiesCountPerType; i++) {
			await this.createOneRecordForEachType(i, model);

			if (i % 10000 === 0) {
				console.log(`Processed ${i} entities`);
			}
		}
	}

	protected async createOneRecordForEachType(
		ipBase: number,
		model: Model<UserAccessRule>,
	): Promise<void> {
		const ipAsNumeric = BigInt(ipBase);
		const address4 = Address4.fromBigInt(ipAsNumeric);
		const address6 = Address6.fromBigInt(ipAsNumeric);

		await this.createIpV4SingleRecord(model, address4);
		await this.createIpV4MaskRecord(model, address4);
		await this.createIpV6SingleRecord(model, address6);
		await this.createIpV6MaskRecord(model, address6);
	}

	protected async createIpV4SingleRecord(
		model: Model<UserAccessRule>,
		address4: Address4,
	): Promise<void> {
		await model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: address4.bigInt(),
					asString: address4.address,
				},
			},
		});
	}

	protected async createIpV4MaskRecord(
		model: Model<UserAccessRule>,
		address4: Address4,
	): Promise<void> {
		await model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: address4.bigInt(),
					asString: address4.address,
					mask: {
						rangeMinAsNumeric: address4.bigInt(),
						rangeMaxAsNumeric: address4.bigInt(),
						asNumeric: 1,
					},
				},
			},
		});
	}

	protected async createIpV6SingleRecord(
		model: Model<UserAccessRule>,
		address6: Address6,
	): Promise<void> {
		await model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: address6.bigInt().toString(),
					asString: address6.address,
				},
			},
		});
	}

	protected async createIpV6MaskRecord(
		model: Model<UserAccessRule>,
		address6: Address6,
	): Promise<void> {
		await model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: address6.bigInt().toString(),
					asString: address6.address,
					mask: {
						rangeMinAsNumericString: address6.bigInt().toString(),
						rangeMaxAsNumericString: address6.bigInt().toString(),
						asNumeric: 1,
					},
				},
			},
		});
	}
}

export { PopulateCommand };
