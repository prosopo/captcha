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
import { IPV6_NUMERIC_MAX_LENGTH } from "../../../../../../ip/v6/ipV6NumericMaxLength.js";
import { TestRulesStorageBase } from "../../../../test/testRulesStorageBase.js";

class TestIpV6MaskFormatting extends TestRulesStorageBase {
	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
		return [
			{
				name: "insertAddsZerosToShortRangeMin",
				method: async () => this.insertAddsZerosToShortRangeMin(),
			},
			{
				name: "insertDoesNotAddZerosToFullRangeMin",
				method: async () => this.insertDoesNotAddZerosToFullRangeMin(),
			},
			{
				name: "insertAddsZerosToShortRangeMax",
				method: async () => this.insertAddsZerosToShortRangeMax(),
			},
			{
				name: "insertDoesNotAddZerosToFullRangeMax",
				method: async () => this.insertDoesNotAddZerosToFullRangeMax(),
			},
		];
	}

	protected async insertAddsZerosToShortRangeMin(): Promise<void> {
		// given
		const rangeMinAsNumericString = "1";
		const fullLengthRangeMinNumericString = "1".padStart(
			IPV6_NUMERIC_MAX_LENGTH,
			"0",
		);

		// when
		const record = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: "0",
					asString: "0",
					mask: {
						rangeMinAsNumericString: rangeMinAsNumericString,
						rangeMaxAsNumericString: "0",
						asNumeric: 0,
					},
				},
			},
		});

		// then
		expect(record.userIp?.v6?.mask?.rangeMinAsNumericString).toBe(
			fullLengthRangeMinNumericString,
		);
	}

	protected async insertDoesNotAddZerosToFullRangeMin(): Promise<void> {
		// given
		const rangeMinAsNumericString = "42541956123769884636017138956568135816";

		// when
		const record = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: "0",
					asString: "0",
					mask: {
						rangeMinAsNumericString: rangeMinAsNumericString,
						rangeMaxAsNumericString: "0",
						asNumeric: 0,
					},
				},
			},
		});

		// then
		expect(record.userIp?.v6?.mask?.rangeMinAsNumericString).toBe(
			rangeMinAsNumericString,
		);
	}

	protected async insertAddsZerosToShortRangeMax(): Promise<void> {
		// given
		const rangeMaxAsNumericString = "1";
		const fullLengthRangeMaxNumericString = "1".padStart(
			IPV6_NUMERIC_MAX_LENGTH,
			"0",
		);

		// when
		const record = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: "0",
					asString: "0",
					mask: {
						rangeMinAsNumericString: "0",
						rangeMaxAsNumericString: rangeMaxAsNumericString,
						asNumeric: 0,
					},
				},
			},
		});

		// then
		expect(record.userIp?.v6?.mask?.rangeMaxAsNumericString).toBe(
			fullLengthRangeMaxNumericString,
		);
	}

	protected async insertDoesNotAddZerosToFullRangeMax(): Promise<void> {
		// given
		const rangeMaxAsNumericString = "42541956123769884636017138956568135816";

		// when
		const record = await this.rulesStorage.insert({
			isUserBlocked: true,
			userIp: {
				v6: {
					asNumericString: "0",
					asString: "0",
					mask: {
						rangeMinAsNumericString: "0",
						rangeMaxAsNumericString: rangeMaxAsNumericString,
						asNumeric: 0,
					},
				},
			},
		});

		// then
		expect(record.userIp?.v6?.mask?.rangeMaxAsNumericString).toBe(
			rangeMaxAsNumericString,
		);
	}
}

export { TestIpV6MaskFormatting };
