import type Rule from "../../rule.js";
import type RuleRecord from "../record/ruleRecord.js";

interface TestRulesStorage {
	insert(rule: Rule): Promise<RuleRecord>;

	setup(): Promise<void>;
}

export default TestRulesStorage;
