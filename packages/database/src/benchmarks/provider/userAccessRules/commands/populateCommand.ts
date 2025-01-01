import { CommandBase } from "./commandBase.js";
import { Address4, Address6 } from "ip-address";
import type { Model } from "mongoose";
import type { UserAccessRule } from "@prosopo/types-database";

class PopulateCommand extends CommandBase {
	public getName(): string {
		return "populate";
	}

	public async process(args: object): Promise<void> {
		const entitiesCountPerTypeAsString =
			"entities-count-per-type" in args &&
			"string" === typeof args["entities-count-per-type"]
				? args["entities-count-per-type"]
				: "10";

		const model = await this.createModelByArgs(args);

		const entitiesCountPerType = Number.parseInt(entitiesCountPerTypeAsString);

		await this.createRecords(entitiesCountPerType, model);
	}

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
