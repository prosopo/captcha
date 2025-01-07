import PerformanceRuleIndexes from "./indexes/performanceRuleIndexes.js";
import UniqueRuleIndexes from "./indexes/uniqueRuleIndexes.js";
import mongooseRule from "./mongooseRule.js";

const ruleIndexes = [...PerformanceRuleIndexes, ...UniqueRuleIndexes];

for (const ruleIndex of ruleIndexes) {
	mongooseRule.index(ruleIndex.definition, ruleIndex.options);
}

export default mongooseRule;
