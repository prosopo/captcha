import type { Model } from "mongoose";
import { Address4 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../../testsBase.js";
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

	protected async singleGlobalIpRejectsDuplicate(): Promise<void> {
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

	protected async singleIpPerClientAcceptsUnique(): Promise<void> {
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

	protected async singleIpPerClientRejectsDuplicate(): Promise<void> {
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

	// fixme for masks as well
}

export { IpV4UniqueIndexTests };
