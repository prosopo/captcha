import { expect } from "vitest";
import type Ip from "../../../../ip/ip.js";
import TestRulesBase from "../../test/testRulesBase.js";

abstract class TestUniqueIndexBase extends TestRulesBase {
	protected abstract getFirstUserIpObject(): Ip;

	protected abstract getSecondUserIpObject(): Ip;

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
		await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const anotherRecord = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getSecondUserIpObject(),
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async globalRuleRejectsNotUniqueIp(): Promise<void> {
		// given
		await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// when
		const insertDuplicate = async () =>
			await this.rulesStorage.insert({
				isUserBlocked: true,
				userIp: this.getFirstUserIpObject(),
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async clientRuleAcceptsUniqueIp(): Promise<void> {
		// given
		await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientId: "client",
		});

		// when
		const anotherRecord = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getSecondUserIpObject(),
			clientId: "client",
		});

		// then
		expect(anotherRecord).not.toBeNull();
	}

	protected async clientRuleRejectsNotUniqueIp(): Promise<void> {
		// given
		await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientId: "client",
		});

		// when
		const insertDuplicate = async () =>
			await this.rulesStorage.insert({
				isUserBlocked: true,
				userIp: this.getFirstUserIpObject(),
				clientId: "client",
			});

		// then
		expect(insertDuplicate()).rejects.toThrow();
	}

	protected async globalAndClientRulesCanHaveSameIp(): Promise<void> {
		// given
		const userRecord = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
			clientId: "client",
		});

		// when
		const globalRecord = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: this.getFirstUserIpObject(),
		});

		// then
		expect(userRecord).not.toBeNull();
		expect(globalRecord).not.toBeNull();
	}
}

export default TestUniqueIndexBase;
