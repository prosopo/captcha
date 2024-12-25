import type { UserIpVersion } from "@prosopo/types-database";
import { expect } from "vitest";
import { GetByUserIp } from "../getByUserIp.js";
import type { Decimal128 } from "mongodb";

abstract class WithIp extends GetByUserIp {
	protected abstract getUserIpVersion(): UserIpVersion;

	protected abstract getFirstUserIp(): string;

	protected abstract getSecondUserIp(): string;

	protected getNumericPresentationForIp(userIp: string): Decimal128 {
		return this.getNumericPresentationForUserIp(
			userIp,
			this.getUserIpVersion(),
		);
	}

	protected override getTestPrefixes(): string[] {
		return super.getTestPrefixes().concat(["withIp"]);
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
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

	protected async findsGlobalRecord(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();

		const record = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIp(userIp),
				stringPresentation: userIp,
				version: this.getUserIpVersion(),
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			this.getUserIpVersion(),
			this.getNumericPresentationForIp(userIp),
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsClientRecord(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();

		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIp(userIp),
				stringPresentation: userIp,
				version: this.getUserIpVersion(),
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			this.getUserIpVersion(),
			this.getNumericPresentationForIp(userIp),
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(clientRecord.id);
	}

	protected async findsGlobalAndClientRecords(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();

		const clientRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIp(userIp),
				stringPresentation: userIp,
				version: this.getUserIpVersion(),
			},
			clientAccountId: "client",
		});

		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIp(userIp),
				stringPresentation: userIp,
				version: this.getUserIpVersion(),
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			this.getUserIpVersion(),
			this.getNumericPresentationForIp(userIp),
			"client",
		);

		// then
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(clientRecord.id);
		expect(rules[1]?.id).toBe(globalRecord.id);
	}

	protected async ignoresGlobalRecordWithWrongIp(): Promise<void> {
		// given
		const firstUserIp = this.getFirstUserIp();

		const secondUserIp = this.getSecondUserIp();

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIp(firstUserIp),
				stringPresentation: firstUserIp,
				version: this.getUserIpVersion(),
			},
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			this.getUserIpVersion(),
			this.getNumericPresentationForIp(secondUserIp),
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithWrongIp(): Promise<void> {
		// given
		const firstUserIp = this.getFirstUserIp();

		const secondUserIp = this.getSecondUserIp();

		await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIp(firstUserIp),
				stringPresentation: firstUserIp,
				version: this.getUserIpVersion(),
			},
			clientAccountId: "client",
		});

		// when
		const rules = await this.userAccessRules.getByUserIp(
			this.getUserIpVersion(),
			this.getNumericPresentationForIp(secondUserIp),
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { WithIp };
