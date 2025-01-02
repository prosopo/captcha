import { CommandBase } from "./commandBase.js";
import { UserAccessRulesDbStorage } from "../../../../databases/provider/userAccessRules/userAccessRulesDbStorage.js";
import {
	type UserAccessRule,
	type UserAccessRulesStorage,
	UserIpVersion,
} from "@prosopo/types-database";
import * as util from "node:util";
import { Address4, Address6 } from "ip-address";
import type { Model } from "mongoose";

class MeasureFindCommand extends CommandBase {
	getName(): string {
		return "measure-find";
	}

	override async process(args: object): Promise<void> {
		const targetIpV4AsString =
			"target-ipv4" in args && "string" === typeof args["target-ipv4"]
				? args["target-ipv4"]
				: "";
		const targetIpV6AsString =
			"target-ipv6" in args && "string" === typeof args["target-ipv6"]
				? args["target-ipv6"]
				: "";

		if (!targetIpV4AsString) {
			throw new Error("Target ipv4 is not set");
		}

		if (!targetIpV6AsString) {
			throw new Error("Target ipv6 is not set");
		}

		const model = await this.createModelByArgs(args);
		const userAccessRules = new UserAccessRulesDbStorage(model);

		await this.measureFind(
			targetIpV4AsString,
			targetIpV6AsString,
			model,
			userAccessRules,
		);
	}

	protected async measureFind(
		targetIpV4AsString: string,
		targetIpV6AsString: string,
		model: Model<UserAccessRule>,
		userAccessRulesStorage: UserAccessRulesStorage,
	): Promise<void> {
		const targetIpV4 = new Address4(targetIpV4AsString);
		const targetIpV6 = new Address6(targetIpV6AsString);

		const totalRulesCount = await model.countDocuments().exec();

		await this.measureRuleFindTime(
			userAccessRulesStorage,
			targetIpV4,
			totalRulesCount,
		);
		await this.measureRuleFindTime(
			userAccessRulesStorage,
			targetIpV6,
			totalRulesCount,
		);
	}

	protected async measureRuleFindTime(
		userAccessRulesStorage: UserAccessRulesStorage,
		targetIp: Address4 | Address6,
		totalRulesCount: number,
	): Promise<void> {
		const startTime = Date.now();
		const ipVersion =
			targetIp instanceof Address4 ? UserIpVersion.v4 : UserIpVersion.v6;

		const foundRules = await userAccessRulesStorage.find(null, {
			userIpAddress: targetIp,
		});

		const endTime = Date.now();

		console.log(
			`ip${ipVersion} measure`,
			util.inspect(
				{
					target: targetIp.address,
					foundRules: foundRules,
					spendTimeMs: endTime - startTime,
					totalRulesCount: totalRulesCount,
				},
				{ depth: null, colors: true },
			),
		);
	}
}

export { MeasureFindCommand };
