import {expect} from "vitest";
import TestRulesBase from "../../../../test/testRulesBase.js";

class TestUserIpValidation extends TestRulesBase {
	protected getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "userIpIsRequiredWhenUserIdIsNotSet",
				method: () => this.userIpIsRequiredWhenUserIdIsNotSet(),
			},
			{
				name: "userIpIsOptionalWhenUserIdIsSet",
				method: () => this.userIpIsOptionalWhenUserIdIsSet(),
			},
		];
	}

	protected async userIpIsRequiredWhenUserIdIsNotSet(): Promise<void> {
		// given
		const insertRecordWithoutUserIpAndId = async () =>
			await this.rulesStorage.insert({
				isUserBlocked: true,
			});

		// when, then
		expect(insertRecordWithoutUserIpAndId()).rejects.toThrow();
	}

	protected async userIpIsOptionalWhenUserIdIsSet(): Promise<void> {
		// given
		const insertRecordWithUserId = async () =>
			await this.rulesStorage.insert({
				isUserBlocked: true,
				userId: "userId",
			});

		// when
		const record = await insertRecordWithUserId();

		// then
		expect(record).not.toBeNull();
	}
}

export default TestUserIpValidation;
