import mongooseRule from "./mongooseRule";
import PerformanceRuleIndexes from "./indexes/performanceRuleIndexes";
import UniqueRuleIndexes from "./indexes/uniqueRuleIndexes";

const ruleIndexes = [...PerformanceRuleIndexes, ...UniqueRuleIndexes];

for (const ruleIndex of ruleIndexes) {
	mongooseRule.index(ruleIndex.definition, ruleIndex.options);
}

export default mongooseRule;
