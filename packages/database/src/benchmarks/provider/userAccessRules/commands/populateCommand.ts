import { Command } from "./command.js";
import { Address4, Address6 } from "ip-address";

class PopulateCommand extends Command {
	getName(): string {
		return "populate";
	}

	async process(args: object): Promise<void> {
		const model = await this.createModelByArgs(args);

		const entitiesCountPerTypeAsString =
			"entities-count-per-type" in args &&
			"string" === typeof args["entities-count-per-type"]
				? args["entities-count-per-type"]
				: "10";

		const entitiesCountPerType = Number.parseInt(entitiesCountPerTypeAsString);

		for (let i = 0; i < entitiesCountPerType; i++) {
			const ipAsNumeric = BigInt(i);
			const address4 = Address4.fromBigInt(ipAsNumeric);
			const address6 = Address6.fromBigInt(ipAsNumeric);

			await model.create({
				isUserBlocked: true,
				userIp: {
					v4: {
						asNumeric: address4.bigInt(),
						asString: address4.address,
					},
				},
			});

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

			await model.create({
				isUserBlocked: true,
				userIp: {
					v6: {
						asNumericString: address6.bigInt().toString(),
						asString: address6.address,
					},
				},
			});

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

			if (i % 10000 === 0) {
				console.log(`Processed ${i} entities`);
			}
		}

		await Promise.resolve();
	}
}

export { PopulateCommand };
