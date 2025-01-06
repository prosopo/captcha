import { expect } from "vitest";
// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";

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
