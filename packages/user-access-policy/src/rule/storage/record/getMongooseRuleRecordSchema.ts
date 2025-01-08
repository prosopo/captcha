import mongooseRule from "../../mongooseRule.js";
import MongooseUniqueRuleIndexes from "../indexes/unique/mongooseUniqueRuleIndexes.js";
import MongoosePerformanceRuleIndexes from "../indexes/performance/mongoosePerformanceRuleIndexes.js";
import type { Schema } from "mongoose";
import type Rule from "../../rule.js";

export default function (): Schema<Rule> {
	const mongooseRuleIndexes = [
		...MongooseUniqueRuleIndexes,
		...MongoosePerformanceRuleIndexes,
	];

	for (const mongooseRuleIndex of mongooseRuleIndexes) {
		mongooseRule.index(mongooseRuleIndex.definition, mongooseRuleIndex.options);
	}

	return mongooseRule;
}
