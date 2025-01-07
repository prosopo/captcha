import { expect } from "vitest";
import TestRulesBase from "../../../../test/testRulesBase.js";

class TestUserIdValidation extends TestRulesBase {
	protected getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "userIdIsRequiredWhenUserIpIsNotSet",
				method: () => this.userIdIsRequiredWhenUserIpIsNotSet(),
			},
			{
				name: "userIdIsOptionalWhenUserIpIsSet",
				method: () => this.userIdIsOptionalWhenUserIpIsSet(),
			},
		];
	}

	protected async userIdIsRequiredWhenUserIpIsNotSet(): Promise<void> {
		// given
		const insertRecordWithoutUserIpAndId = async () =>
			await this.rulesStorage.insert({
				isUserBlocked: true,
			});

		// when, then
		expect(insertRecordWithoutUserIpAndId()).rejects.toThrow();
	}

	protected async userIdIsOptionalWhenUserIpIsSet(): Promise<void> {
		// given
		const insertRecordWithUserId = async () =>
			await this.rulesStorage.insert({
				isUserBlocked: true,
				userIp: {
					v4: {
						asString: "0",
						asNumeric: BigInt(0),
					},
				},
			});

		// when
		const record = await insertRecordWithUserId();

		// then
		expect(record).not.toBeNull();
	}
}

export default TestUserIdValidation;
