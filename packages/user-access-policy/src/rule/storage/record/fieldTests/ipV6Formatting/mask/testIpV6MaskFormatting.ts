import { expect } from "vitest";
import TestRulesBase from "../../../../test/testRulesBase.js";
import IPV6_NUMERIC_MAX_LENGTH from "../../../../../../ip/v6/ipV6NumericMaxLength.js";

class TestIpV6MaskFormatting extends TestRulesBase {

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

export default TestIpV6MaskFormatting;
