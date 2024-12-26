import type { Model, Mongoose } from "mongoose";
import { Address4, Address6 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../testsBase.js";
import type { UserAccessRule } from "@prosopo/types-database";

class RuleUniqueRestrictionTests extends TestsBase {
	protected ipV4AsNumeric: bigint;
	protected ipV6AsNumericString: string;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		const address4 = new Address4("192.168.1.1");
		const address6 = new Address6("2001:db8:3333:4444:5555:6666:7777:8888");

		this.ipV4AsNumeric = address4.bigInt();
		this.ipV6AsNumericString = address6.bigInt().toString();
	}

	protected override getTestName(): string {
		return "RuleUniqueRestriction";
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "singleGlobalIpV4",
				method: async () => this.singleGlobalIpV4(),
			},
		];
	}

	protected async singleGlobalIpV4(): Promise<void> {
		// given
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipV4AsNumeric,
					asString: this.ipV4AsNumeric.toString(),
				},
			},
		});

		// when
		const duplicate = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipV4AsNumeric,
					asString: this.ipV4AsNumeric.toString(),
				},
			},
		});

		// then
		expect(duplicate).toBeNull();
	}
}

export { RuleUniqueRestrictionTests };
