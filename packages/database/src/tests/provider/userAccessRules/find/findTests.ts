import { UserAccessRuleTestsBase } from "../userAccessRuleTestsBase.js";

class FindTests extends UserAccessRuleTestsBase {
	getName(): string {
		return "Find";
	}

	protected getTests(): { name: string; method: () => Promise<void> }[] {
		return [];
	}

	protected findsRecordByClientAccountId(): Promise<void> {

	}

	protected ignoresRecordWithDifferentClientAccountId(): Promise<void> {}

	protected findsByIpAndUserId(): Promise<void> {}

	protected ignoresRecordWithDifferentIpAndUserId(): Promise<void> {}

	protected ignoresPartialMatchesForIpAndUserId(): Promise<void> {}

	protected includesPartialMatchesForIpAndUserIdWhenFlagIsSet(): Promise<void> {}
}
