import type { Model, Mongoose } from "mongoose";
import { Address4, Address6 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../../testsBase.js";
import type { UserAccessRule } from "@prosopo/types-database";

class IpV6UniqueIndexTests extends TestsBase {
	protected firstIpAsNumericString: string;
	protected secondIpAsNumericString: string;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		this.firstIpAsNumericString = new Address6(
			"2001:db8:3333:4444:5555:6666:7777:8888",
		)
			.bigInt()
			.toString();
		this.secondIpAsNumericString = new Address6(
			"1002:db8:3333:4444:5555:6666:7777:8888",
		)
			.bigInt()
			.toString();
	}

	public override getName(): string {
		return "IpV6UniqueIndex";
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "singleGlobalIpAcceptsUnique",
				method: async () => this.singleGlobalIpAcceptsUnique(),
			},
			{
				name: "singleGlobalIpRejectsDuplicate",
				method: async () => this.singleGlobalIpRejectsDuplicate(),
			},
			{
				name: "singleIpPerClientAcceptsUnique",
				method: async () => this.singleIpPerClientAcceptsUnique(),
			},
			{
				name: "singleIpPerClientRejectsDuplicate",
				method: async () => this.singleIpPerClientRejectsDuplicate(),
			},
		];
	}

	protected async singleGlobalIpAcceptsUnique(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.firstIpAsNumericString,
					asString: this.firstIpAsNumericString,
				},
			},
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.secondIpAsNumericString,
					asString: this.secondIpAsNumericString,
				},
			},
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async singleGlobalIpRejectsDuplicate(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.firstIpAsNumericString,
					asString: this.firstIpAsNumericString,
				},
			},
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v6: {
						asNumericString: this.firstIpAsNumericString,
						asString: this.firstIpAsNumericString,
					},
				},
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async singleIpPerClientAcceptsUnique(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.firstIpAsNumericString,
					asString: this.firstIpAsNumericString,
				},
			},
			clientAccountId: "client",
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.secondIpAsNumericString,
					asString: this.secondIpAsNumericString,
				},
			},
			clientAccountId: "client",
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async singleIpPerClientRejectsDuplicate(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: this.firstIpAsNumericString,
					asString: this.firstIpAsNumericString,
				},
			},
			clientAccountId: "client",
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v6: {
						asNumericString: this.firstIpAsNumericString,
						asString: this.firstIpAsNumericString,
					},
				},
				clientAccountId: "client",
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	// fixme for masks as well
}

export { IpV6UniqueIndexTests };
