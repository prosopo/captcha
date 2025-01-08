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
import { expect } from "vitest";
import { TestRulesStorageBase } from "../../../../test/testRulesStorageBase.js";

class TestUserIpValidation extends TestRulesStorageBase {
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

export { TestUserIpValidation };
