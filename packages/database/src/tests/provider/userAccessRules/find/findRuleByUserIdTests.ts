import type { RuleFilters, UserAccessRule } from "@prosopo/types-database";
import { FindRuleTestsBase } from "./findRuleTestsBase.js";

class FindRuleByUserIdTests extends FindRuleTestsBase {
	private readonly userId: string = "userId";
	private readonly otherUserId: string = "otherUserId";
	private readonly clientAccountId: string = "client";
	private readonly otherClientAccountId: string = "another";

	getName(): string {
		return "FindRuleByUserId";
	}

	protected getRecord(): Partial<UserAccessRule> {
		const clientAccountId = this.getClientAccountId();

		const record: Partial<UserAccessRule> = {
			isUserBlocked: false,
			userId: this.userId,
			clientAccountId: this.clientAccountId,
		};

		if (null !== clientAccountId) {
			record.clientAccountId = clientAccountId;
		}

		return record;
	}

	protected getClientAccountId(): string | null {
		return this.clientAccountId;
	}

	protected getOtherClientAccountId(): string | null {
		return this.otherClientAccountId;
	}

	protected getRecordFilters(): RuleFilters {
		return {
			userId: this.userId,
		};
	}

	protected getOtherRecordFilters(): RuleFilters {
		return {
			userId: this.otherUserId,
		};
	}
}

export { FindRuleByUserIdTests };
