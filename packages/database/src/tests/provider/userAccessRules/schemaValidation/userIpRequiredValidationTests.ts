import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import { expect } from "vitest";

class UserIpRequiredValidationTests extends UserAccessRuleTestsBase {
	getName(): string {
		return "UserIpRequiredValidation";
	}

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
			await this.model.create({
				isUserBlocked: true,
			});

		// when, then
		expect(insertRecordWithoutUserIpAndId()).rejects.toThrow();
	}

	protected async userIpIsOptionalWhenUserIdIsSet(): Promise<void> {
		// given
		const insertRecordWithUserId = async () =>
			await this.model.create({
				isUserBlocked: true,
				userId: "userId",
			});

		// when
		const record = await insertRecordWithUserId();

		// then
		expect(record).not.toBeNull();
	}
}

export { UserIpRequiredValidationTests };
