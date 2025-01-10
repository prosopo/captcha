// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { Schema } from "mongoose";
import type {Rule} from "@rules/rule/rule.js";
import {mongoosePerformanceRuleIndexes} from "@rules/storage/mongoose/indexes/mongoosePerformanceRuleIndexes.js";
import {mongooseUniqueRuleIndexes} from "@rules/storage/mongoose/indexes/mongooseUniqueRuleIndexes.js";
import {mongooseRule} from "@rules/rule/mongooseRule.js";

const getMongooseRuleRecordSchema = (): Schema<Rule> => {
	const mongooseRuleIndexes = [
		...mongoosePerformanceRuleIndexes,
		...mongooseUniqueRuleIndexes,
	];

	for (const mongooseRuleIndex of mongooseRuleIndexes) {
		mongooseRule.index(mongooseRuleIndex.definition, mongooseRuleIndex.options);
	}

	return mongooseRule;
};

export { getMongooseRuleRecordSchema };
