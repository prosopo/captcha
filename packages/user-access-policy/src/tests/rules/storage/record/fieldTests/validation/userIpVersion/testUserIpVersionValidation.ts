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
import {TestRulesStorageBase} from "@tests/rules/storage/testRulesStorageBase.js";

class TestUserIpVersionValidation extends TestRulesStorageBase {
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
			await this.rulesStorage.insert({
				isUserBlocked: true,
				userIp: {},
			});

		// when, then
		expect(insertRecordWithoutV4AndV6()).rejects.toThrow();
	}

	protected async v4IsOptionalWhenV6IsSet(): Promise<void> {
		// given
		const insertRecordWithV4 = async () =>
			await this.rulesStorage.insert({
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
			await this.rulesStorage.insert({
				isUserBlocked: true,
				userIp: {
					v4: {
						asNumeric: BigInt(0),
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

export { TestUserIpVersionValidation };
