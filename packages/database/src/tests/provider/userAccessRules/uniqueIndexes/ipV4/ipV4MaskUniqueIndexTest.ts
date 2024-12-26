import type { Model } from "mongoose";
import { Address4 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../../../testsBase.js";
import type { UserAccessRule } from "@prosopo/types-database";

class IpV4MaskUniqueIndexTest extends TestsBase {
	protected ipAsNumeric: bigint;
	protected firstIpMaskAsNumeric: number;
	protected secondIpMaskAsNumeric: number;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		this.ipAsNumeric = new Address4("192.168.1.1").bigInt();
		this.firstIpMaskAsNumeric = 10;
		this.secondIpMaskAsNumeric = 20;
	}

	public override getName(): string {
		return "IpV4MaskUniqueIndex";
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "globalIpMaskAcceptsUnique",
				method: async () => this.globalIpMaskAcceptsUnique(),
			},
			{
				name: "globalIpMaskRejectsDuplicate",
				method: async () => this.globalIpMaskRejectsDuplicate(),
			},
			{
				name: "clientsIpMaskAcceptsUnique",
				method: async () => this.clientsIpMaskAcceptsUnique(),
			},
			{
				name: "clientsIpMaskRejectsDuplicate",
				method: async () => this.clientsIpMaskRejectsDuplicate(),
			},
		];
	}

	protected async globalIpMaskAcceptsUnique(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipAsNumeric,
					asString: this.ipAsNumeric.toString(),
					mask: {
						rangeMinAsNumeric: 0,
						rangeMaxAsNumeric: 0,
						asNumeric: this.firstIpMaskAsNumeric,
					},
				},
			},
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipAsNumeric,
					asString: this.ipAsNumeric.toString(),
					mask: {
						rangeMinAsNumeric: 0,
						rangeMaxAsNumeric: 0,
						asNumeric: this.secondIpMaskAsNumeric,
					},
				},
			},
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async globalIpMaskRejectsDuplicate(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipAsNumeric,
					asString: this.ipAsNumeric.toString(),
					mask: {
						rangeMinAsNumeric: 0,
						rangeMaxAsNumeric: 0,
						asNumeric: this.firstIpMaskAsNumeric,
					},
				},
			},
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v4: {
						asNumeric: this.ipAsNumeric,
						asString: this.ipAsNumeric.toString(),
						mask: {
							rangeMinAsNumeric: 0,
							rangeMaxAsNumeric: 0,
							asNumeric: this.firstIpMaskAsNumeric,
						},
					},
				},
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async clientsIpMaskAcceptsUnique(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipAsNumeric,
					asString: this.ipAsNumeric.toString(),
					mask: {
						rangeMinAsNumeric: 0,
						rangeMaxAsNumeric: 0,
						asNumeric: this.firstIpMaskAsNumeric,
					},
				},
			},
			clientAccountId: "client",
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipAsNumeric,
					asString: this.ipAsNumeric.toString(),
					mask: {
						rangeMinAsNumeric: 0,
						rangeMaxAsNumeric: 0,
						asNumeric: this.secondIpMaskAsNumeric,
					},
				},
			},
			clientAccountId: "client",
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async clientsIpMaskRejectsDuplicate(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				v4: {
					asNumeric: this.ipAsNumeric,
					asString: this.ipAsNumeric.toString(),
					mask: {
						rangeMinAsNumeric: 0,
						rangeMaxAsNumeric: 0,
						asNumeric: this.firstIpMaskAsNumeric,
					},
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
						asNumeric: this.ipAsNumeric,
						asString: this.ipAsNumeric.toString(),
						mask: {
							rangeMinAsNumeric: 0,
							rangeMaxAsNumeric: 0,
							asNumeric: this.firstIpMaskAsNumeric,
						},
					},
				},
				clientAccountId: "client",
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	// fixme globalIpMaskCanBeSameAsClientsIpMask
}

export { IpV4MaskUniqueIndexTest };
