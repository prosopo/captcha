import mongooseRule from "../../mongooseRule.js";
import MongooseUniqueRuleIndexes from "../indexes/unique/mongooseUniqueRuleIndexes.js";
import MongoosePerformanceRuleIndexes from "../indexes/performance/mongoosePerformanceRuleIndexes.js";

const mongooseRuleIndexes = [
	...MongooseUniqueRuleIndexes,
	...MongoosePerformanceRuleIndexes,
];

for (const mongooseRuleIndex of mongooseRuleIndexes) {
	mongooseRule.index(mongooseRuleIndex.definition, mongooseRuleIndex.options);
}

export default mongooseRule;
