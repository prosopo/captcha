import { expect } from "vitest";
import TestRulesBase from "../../../../test/testRulesBase.js";

class TestOptionalFieldsValidation extends TestRulesBase {
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
		const record = await this.rulesStorage.insert(recordData);

		// when, then
		expect(undefined === record.userIp).toBeTruthy();
	}
}

export default TestOptionalFieldsValidation;
