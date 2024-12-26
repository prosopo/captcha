import type { Model } from "mongoose";
import { Address4 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../../../testsBase.js";
import type { UserAccessRule } from "@prosopo/types-database";

class IpV4UniqueIndexTests extends TestsBase {
	protected firstIpAsNumeric: bigint;
	protected secondIpAsNumeric: bigint;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		this.firstIpAsNumeric = new Address4("192.168.1.1").bigInt();
		this.secondIpAsNumeric = new Address4("192.168.1.2").bigInt();
	}

	public override getName(): string {
		return "IpV4UniqueIndex";
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
				v4: {
					asNumeric: this.firstIpAsNumeric,
					asString: this.firstIpAsNumeric.toString(),
				},
			},
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.secondIpAsNumeric,
					asString: this.secondIpAsNumeric.toString(),
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
				v4: {
					asNumeric: this.firstIpAsNumeric,
					asString: this.firstIpAsNumeric.toString(),
				},
			},
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v4: {
						asNumeric: this.firstIpAsNumeric,
						asString: this.firstIpAsNumeric.toString(),
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
				v4: {
					asNumeric: this.firstIpAsNumeric,
					asString: this.firstIpAsNumeric.toString(),
				},
			},
			clientAccountId: "client",
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.secondIpAsNumeric,
					asString: this.secondIpAsNumeric.toString(),
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
				v4: {
					asNumeric: this.firstIpAsNumeric,
					asString: this.firstIpAsNumeric.toString(),
				},
			},
			clientAccountId: "client",
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v4: {
						asNumeric: this.firstIpAsNumeric,
						asString: this.firstIpAsNumeric.toString(),
					},
				},
				clientAccountId: "client",
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	// fixme globalIpCanBeSameAsClientsIp
}

export { IpV4UniqueIndexTests };
