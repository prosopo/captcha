import * as util from "node:util";
import {
	type UserAccessRule,
	type UserAccessRulesStorage,
	UserIpVersion,
} from "@prosopo/types-database";
import { Address4, Address6 } from "ip-address";
import type { Model } from "mongoose";
import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { UserAccessRulesDbStorage } from "../../../../databases/provider/userAccessRules/userAccessRulesDbStorage.js";
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

class MeasureFindCommand extends CommandBase implements CommandModule {
	public command = "measure-find";
	public describe = "Measure find";

	public builder = (yargs: Argv): Argv =>
		yargs
			.option("target-ip-v4", {
				type: "string" as const,
				describe: "Target ipV4",
				demandOption: true,
			})
			.option("target-ip-v6", {
				type: "string" as const,
				describe: "Target ipV6",
				demandOption: true,
			});

	public handler = async (args: ArgumentsCamelCase): Promise<void> => {
		const targetIpV4AsString =
			"string" === typeof args.targetIpV4 ? args.targetIpV4 : "";
		const targetIpV6AsString =
			"string" === typeof args.targetIpV6 ? args.targetIpV6 : "";

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

		await this.disconnectMongoose();
	};

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

		const foundRules = await userAccessRulesStorage.find({
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
