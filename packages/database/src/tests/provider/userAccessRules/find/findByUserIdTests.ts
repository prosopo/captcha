import { FindByTests } from "./findByTests.js";
import type { RuleFilters, UserAccessRule } from "@prosopo/types-database";

class FindByUserIdTests extends FindByTests {
	getName(): string {
		return "FindByUserId";
	}

	protected getRecord(): Partial<UserAccessRule> {
		return {
			isUserBlocked: false,
			userId: "userId",
		};
	}

	protected getRecordFilters(): RuleFilters {
		return {
			userId: "userId",
		};
	}

	protected getOtherRecordFilters(): RuleFilters {
		return {
			userId: "otherUserId",
		};
	}
}

export { FindByUserIdTests };
