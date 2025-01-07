import mongooseRule from "./mongooseRule.js";
import MongooseUniqueRuleIndexes from "./storage/indexes/unique/mongooseUniqueRuleIndexes.js";
import MongoosePerformanceRuleIndexes from "./storage/indexes/performance/mongoosePerformanceRuleIndexes.js";

const mongooseRuleIndexes = [
	...MongooseUniqueRuleIndexes,
	...MongoosePerformanceRuleIndexes,
];

for (const mongooseRuleIndex of mongooseRuleIndexes) {
	mongooseRule.index(mongooseRuleIndex.definition, mongooseRuleIndex.options);
}

export default mongooseRule;
