import { UserIpVersion } from "@prosopo/types-database";
import { expect } from "vitest";
import { GetByUserIpTest } from "./getByUserIpTest.js";

class WithIpV4AndClientAccountIdTest extends GetByUserIpTest {
	protected override getTestPrefixes(): string[] {
		return super.getTestPrefixes().concat(["withIpV4AndClientAccountId"]);
	}

	protected async findsClientRecordByIpAndClientAccountId(): Promise<void> {
		// given
		const record = await this.model.create({
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
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsGlobalRecordByIpAndClientAccountId(): Promise<void> {
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
			this.getNumericPresentationForIpV4("127.0.0.1"),
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	// todo finds both

	protected async ignoresClientRecordWithWrongIpAndRightClientAccountId(): Promise<void> {
		// given
		await this.model.create({
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
			this.getNumericPresentationForIpV4("127.0.0.2"),
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithRightIpAndWrongClientAccountId(): Promise<void> {
		// given
		await this.model.create({
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
			"another",
		);

		// then
		expect(rules.length).toBe(0);
	}

	override getTests(): { name: string; method: () => Promise<void> }[] {
		return [
			{
				name: "findsClientRecordByIpAndClientAccountId",
				method: async () => this.findsClientRecordByIpAndClientAccountId(),
			},
			{
				name: "findsGlobalRecordByIpAndClientAccountId",
				method: async () => this.findsGlobalRecordByIpAndClientAccountId(),
			},
			{
				name: "ignoresClientRecordWithWrongIpAndRightClientAccountId",
				method: async () =>
					this.ignoresClientRecordWithWrongIpAndRightClientAccountId(),
			},
			{
				name: "ignoresClientRecordWithRightIpAndWrongClientAccountId",
				method: async () =>
					this.ignoresClientRecordWithRightIpAndWrongClientAccountId(),
			},
		];
	}
}

export { WithIpV4AndClientAccountIdTest };
