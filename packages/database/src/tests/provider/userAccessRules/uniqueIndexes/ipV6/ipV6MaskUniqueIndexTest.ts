import type { Model, Mongoose } from "mongoose";
import { Address4, Address6 } from "ip-address";
import { expect } from "vitest";
import { TestsBase } from "../../../../testsBase.js";
import type { UserAccessRule } from "@prosopo/types-database";

class IpV6MaskUniqueIndexTest extends TestsBase {
	protected ipAsNumericString: string;
	protected firstIpMaskAsNumeric: number;
	protected secondIpMaskAsNumeric: number;

	public constructor(protected model: Model<UserAccessRule>) {
		super();

		this.ipAsNumericString = new Address6(
			"2001:db8:3333:4444:5555:6666:7777:8888",
		)
			.bigInt()
			.toString();
		this.firstIpMaskAsNumeric = 10;
		this.secondIpMaskAsNumeric = 20;
	}

	public override getName(): string {
		return "IpV6MaskUniqueIndex";
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
				v6: {
					asNumericString: this.ipAsNumericString,
					asString: this.ipAsNumericString,
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
				v6: {
					asNumericString: this.ipAsNumericString,
					asString: this.ipAsNumericString,
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
				v6: {
					asNumericString: this.ipAsNumericString,
					asString: this.ipAsNumericString,
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
					v6: {
						asNumericString: this.ipAsNumericString,
						asString: this.ipAsNumericString,
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
				v6: {
					asNumericString: this.ipAsNumericString,
					asString: this.ipAsNumericString,
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
				v6: {
					asNumericString: this.ipAsNumericString,
					asString: this.ipAsNumericString,
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
				v6: {
					asNumericString: this.ipAsNumericString,
					asString: this.ipAsNumericString,
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
					v6: {
						asNumericString: this.ipAsNumericString,
						asString: this.ipAsNumericString,
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

export { IpV6MaskUniqueIndexTest };
