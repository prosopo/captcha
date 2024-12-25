import { expect } from "vitest";
import { WithIp } from "./withIp.js";

abstract class WithIpAndClientAccountId extends WithIp {
	protected override getTestPrefixes(): string[] {
		return super.getTestPrefixes().concat(["withIpAndClientAccountId"]);
	}

	protected override getTests(): {
		name: string;
		method: () => Promise<void>;
	}[] {
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
				name: "findsGlobalAndClientRecordsByIpAndClientAccountId",
				method: async () =>
					this.findsGlobalAndClientRecordsByIpAndClientAccountId(),
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

	protected async findsClientRecordByIpAndClientAccountId(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		const record = await this.model.create({
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
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsGlobalRecordByIpAndClientAccountId(): Promise<void> {
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
			"client",
		);

		// then
		expect(rules.length).toBe(1);
		expect(rules[0]?.id).toBe(record.id);
	}

	protected async findsGlobalAndClientRecordsByIpAndClientAccountId(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		const globalRecord = await this.model.create({
			isUserBlocked: true,
			userIp: {
				numericPresentation: this.getNumericPresentationForIp(userIp),
				stringPresentation: userIp,
				version: this.getUserIpVersion(),
			},
		});
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
		expect(rules.length).toBe(2);
		expect(rules[0]?.id).toBe(globalRecord.id);
		expect(rules[1]?.id).toBe(clientRecord.id);
	}

	protected async ignoresClientRecordWithWrongIpAndRightClientAccountId(): Promise<void> {
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
			"client",
		);

		// then
		expect(rules.length).toBe(0);
	}

	protected async ignoresClientRecordWithRightIpAndWrongClientAccountId(): Promise<void> {
		// given
		const userIp = this.getFirstUserIp();
		await this.model.create({
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
			"another",
		);

		// then
		expect(rules.length).toBe(0);
	}
}

export { WithIpAndClientAccountId };
