import { expect } from "vitest";
import TestRulesBase from "../../../test/testRulesBase.js";
import IPV6_NUMERIC_MAX_LENGTH from "../../../../../ip/v6/ipV6NumericMaxLength.js";

class TestIpV6Formatting extends TestRulesBase {
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
		const fullLengthNumericIpV6String = "1".padStart(IPV6_NUMERIC_MAX_LENGTH, "0");

		// when
		const record = await this.rulesStorage.insert({
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
		const record = await this.rulesStorage.insert({
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

export default TestIpV6Formatting;
