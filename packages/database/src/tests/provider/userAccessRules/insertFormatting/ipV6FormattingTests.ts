import { USER_IP_V6_LENGTH } from "@prosopo/types-database";
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
import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";

class IpV6FormattingTests extends UserAccessRuleTestsBase {
	public getName(): string {
		return "IpV6Formatting";
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "insertAddsZerosToShortIp",
				method: async () => this.insertAddsZerosToShortIp(),
			},
			{
				name: "insertDoesNotAddZerosToFullIp",
				method: async () => this.insertDoesNotAddZerosToFullIp(),
			},
		];
	}

	protected async insertAddsZerosToShortIp(): Promise<void> {
		// given
		const ipV6AsNumericString = "1";
		const ipV6AsString = "::1";
		const fullLengthNumericIpV6String = "1".padStart(USER_IP_V6_LENGTH, "0");

		// when
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: ipV6AsNumericString,
					asString: ipV6AsString,
				},
			},
		});

		// then
		expect(record.userIp?.v6?.asNumericString).toBe(
			fullLengthNumericIpV6String,
		);
	}

	protected async insertDoesNotAddZerosToFullIp(): Promise<void> {
		// given
		const ipV6AsNumericString = "42541956123769884636017138956568135816";
		const ipV6AsString = "2001:4860:4860::8888";

		// when
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: ipV6AsNumericString,
					asString: ipV6AsString,
				},
			},
		});

		// then
		expect(record.userIp?.v6?.asNumericString).toBe(ipV6AsNumericString);
	}
}

export { IpV6FormattingTests };
