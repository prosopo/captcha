import { UserIpVersion } from "@prosopo/types-database";
import { expect } from "vitest";
import { GetByUserIpTest } from "./getByUserIpTest.js";

class WithIpV4Test extends GetByUserIpTest {
	protected override getTestPrefixes(): string[] {
		return super.getTestPrefixes().concat(["withIpV4"]);
	}

	protected async findsGlobalRecord(): Promise<void> {
		// given
		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1")
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsClientRecord(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
			"client"
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async findsGlobalAndClientRecords(): Promise<void> {
		// given
		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});
		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.1"),
			"client"
		);

		// then
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(clientRecord.id);
		expect(rules[1]?.id).toBe(globalRecord.id);
	}

	protected async ignoresGlobalRecordWithWrongIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.1",
				version: UserIpVersion.v4,
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.3"),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithWrongIp(): Promise<void> {
		// given
		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIpV4("127.0.0.1"),
				stringPresentation: "127.0.0.2",
				version: UserIpVersion.v4,
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			UserIpVersion.v4,
			this.getNumericPresentationForIpV4("127.0.0.3"),
		);

		// then
		expect(rules.length).toBe(0);
	}

	override getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "findsGlobalRecord",
				method: async () => this.findsGlobalRecord(),
			},
			{
				name: "findsClientRecord",
				method: async () => this.findsClientRecord(),
			},
			{
				name: "findsGlobalAndClientRecords",
				method: async () => this.findsGlobalAndClientRecords(),
			},
			{
				name: "ignoresGlobalRecordWithWrongIp",
				method: async () => this.ignoresGlobalRecordWithWrongIp(),
			},
			{
				name: "ignoresClientRecordWithWrongIp",
				method: async () => this.ignoresClientRecordWithWrongIp(),
			},
		];
	}
}

export { WithIpV4Test };
