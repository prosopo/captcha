import { expect } from "vitest";
import type { UserIp } from "@prosopo/types-database";
import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";

abstract class IpUniqueIndexTests extends UserAccessRuleTestsBase {
	protected abstract getFirstUserIpObject(): UserIp;

	protected abstract getSecondUserIpObject(): UserIp;

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "globalRuleAcceptsUniqueIp",
				method: async () => this.globalRuleAcceptsUniqueIp(),
			},
			{
				name: "globalRuleRejectsNotUniqueIp",
				method: async () => this.globalRuleRejectsNotUniqueIp(),
			},
			{
				name: "clientRuleAcceptsUniqueIp",
				method: async () => this.clientRuleAcceptsUniqueIp(),
			},
			{
				name: "clientRuleRejectsNotUniqueIp",
				method: async () => this.clientRuleRejectsNotUniqueIp(),
			},
			{
				name: "globalAndClientRulesCanHaveSameIp",
				method: async () => this.globalAndClientRulesCanHaveSameIp(),
			},
		];
	}

	protected async globalRuleAcceptsUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getSecondUserIpObject(),
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async globalRuleRejectsNotUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: this.getFirstUserIpObject(),
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async clientRuleAcceptsUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const anotherRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getSecondUserIpObject(),
			clientAccountId: "client",
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async clientRuleRejectsNotUniqueIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const insertDuplicate = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: this.getFirstUserIpObject(),
				clientAccountId: "client",
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async globalAndClientRulesCanHaveSameIp(): Promise<void> {
		// given
		const userRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientAccountId: "client",
		});

		// when
		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// then
		expect(userRecord).not.toBeNull();
		expect(globalRecord).not.toBeNull();
	}
}

export { IpUniqueIndexTests };
