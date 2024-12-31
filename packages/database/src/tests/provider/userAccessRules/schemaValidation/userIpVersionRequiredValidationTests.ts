import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import { expect } from "vitest";

class UserIpVersionRequiredValidationTests extends UserAccessRuleTestsBase {
	getName(): string {
		return "UserIpVersionRequiredValidation";
	}

	protected getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "rejectsRecordWithoutBothV4AndV6",
				method: () => this.rejectsRecordWithoutBothV4AndV6(),
			},
			{
				name: "v4IsOptionalWhenV6IsSet",
				method: () => this.v4IsOptionalWhenV6IsSet(),
			},
			{
				name: "v6IsOptionalWhenV4IsSet",
				method: () => this.v6IsOptionalWhenV4IsSet(),
			},
		];
	}

	protected async rejectsRecordWithoutBothV4AndV6(): Promise<void> {
		// given
		const insertRecordWithoutV4AndV6 = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {},
			});

		// when, then
		expect(insertRecordWithoutV4AndV6()).rejects.toThrow();
	}

	protected async v4IsOptionalWhenV6IsSet(): Promise<void> {
		// given
		const insertRecordWithV4 = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v6: {
						asNumericString: "0",
						asString: "0",
					},
				},
			});

		// when
		const record = await insertRecordWithV4();

		// then
		expect(record).not.toBeNull();
	}

	protected async v6IsOptionalWhenV4IsSet(): Promise<void> {
		// given
		const insertRecordWithV4 = async () =>
			await this.model.create({
				isUserBlocked: true,
				userIp: {
					v4: {
						asNumeric: 0,
						asString: "0",
					},
				},
			});

		// when
		const record = await insertRecordWithV4();

		// then
		expect(record).not.toBeNull();
	}
}

export { UserIpVersionRequiredValidationTests };
