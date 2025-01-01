import type { RuleFilters, UserAccessRule } from "@prosopo/types-database";
import { FindRuleByFilterTestsBase } from "./findRuleByFilterTestsBase.js";

class FindRuleByUserIdTests extends FindRuleByFilterTestsBase {
	private readonly userId: string = "userId";
	private readonly otherUserId: string = "otherUserId";
	private readonly clientId: string = "client";
	private readonly otherClientId: string = "another";

	getName(): string {
		return "FindRuleByUserId";
	}

	protected getRule(): UserAccessRule {
		const clientId = this.getClientId();

		const record: UserAccessRule = {
			isUserBlocked: false,
			userId: this.userId,
			clientId: this.clientId,
		};

		if (null !== clientId) {
			record.clientId = clientId;
		}

		return record;
	}

	protected getClientId(): string | null {
		return this.clientId;
	}

	protected getOtherClientId(): string | null {
		return this.otherClientId;
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
