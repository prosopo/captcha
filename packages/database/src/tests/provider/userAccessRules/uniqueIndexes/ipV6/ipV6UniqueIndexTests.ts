import type { Model, Mongoose } from "mongoose";
import { Address4, Address6 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../../../testsBase.js";
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
				name: "globalIpAcceptsUnique",
				method: async () => this.globalIpAcceptsUnique(),
			},
			{
				name: "globalIpRejectsDuplicate",
				method: async () => this.globalIpRejectsDuplicate(),
			},
			{
				name: "clientsIpAcceptsUnique",
				method: async () => this.clientsIpAcceptsUnique(),
			},
			{
				name: "clientsIpRejectsDuplicate",
				method: async () => this.clientsIpRejectsDuplicate(),
			},
		];
	}

	protected async globalIpAcceptsUnique(): Promise<void> {
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

	protected async globalIpRejectsDuplicate(): Promise<void> {
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

	protected async clientsIpAcceptsUnique(): Promise<void> {
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

	protected async clientsIpRejectsDuplicate(): Promise<void> {
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

	// fixme globalIpCanBeSameAsClientsIp
}

export { IpV6UniqueIndexTests };
