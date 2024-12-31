import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import { expect } from "vitest";

class UserIdRequiredValidationTests extends UserAccessRuleTestsBase {
	getName(): string {
		return "UserIdRequiredValidation";
	}

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
			await this.model.create({
				isUserBlocked: true,
			});

		// when, then
		expect(insertRecordWithoutUserIpAndId()).rejects.toThrow();
	}

	protected async userIdIsOptionalWhenUserIpIsSet(): Promise<void> {
		// given
		const insertRecordWithUserId = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v4: {
						asString: "0",
						asNumeric: 0,
					},
				},
			});

		// when
		const record = await insertRecordWithUserId();

		// then
		expect(record).not.toBeNull();
	}
}

export { UserIdRequiredValidationTests };
