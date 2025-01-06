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
