import { expect } from "vitest";
import TestRulesStorageBase from "../../../../test/testRulesStorageBase.js";

class TestOptionalFieldsValidation extends TestRulesStorageBase {
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
		const insertedRule = await this.rulesStorage.insert(recordData);

		// when, then
		expect(undefined === insertedRule?.userIp).toBeTruthy();
	}
}

export default TestOptionalFieldsValidation;
