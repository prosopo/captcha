import { expect } from "vitest";
import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";
import { Address4 } from "ip-address";
import { Int32, Long } from "mongodb";
import exp from "node:constants";
import { USER_IP_V6_LENGTH } from "@prosopo/types-database";

class IpV6MaskFormattingTests extends UserAccessRuleTestsBase {
	public getName(): string {
		return "IpV6MaskFormatting";
	}

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
			USER_IP_V6_LENGTH,
			"0",
		);

		// when
		const record = await this.model.create({
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
		const record = await this.model.create({
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
			USER_IP_V6_LENGTH,
			"0",
		);

		// when
		const record = await this.model.create({
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
		const record = await this.model.create({
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

export { IpV6MaskFormattingTests };
