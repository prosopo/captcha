import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import { expect } from "vitest";

class OptionalFieldTests extends UserAccessRuleTestsBase {
	getName(): string {
		return "OptionalField";
	}

	protected getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "skippedFieldIsUndefinedInRecordObject",
				method: () => this.skippedFieldIsUndefinedInRecordObject(),
			},
		];
	}

	protected async skippedFieldIsUndefinedInRecordObject(): Promise<void> {
		// given
		const recordData = {
			isUserBlocked: true,
			userId: "user",
		};

		// when
		const record = await this.model.create(recordData);

		// when, then
		expect(undefined === record.userIp).toBeTruthy();
	}
}

export { OptionalFieldTests };
