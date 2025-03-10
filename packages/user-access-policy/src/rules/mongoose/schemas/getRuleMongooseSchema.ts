// Copyright 2021-2025 Prosopo (UK) Ltd.
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
import type { Rule } from "../../rule/rule.js";
import { rulePerformanceMongooseIndexes } from "../indexes/rulePerformanceMongooseIndexes.js";
import { ruleUniqueMongooseIndexes } from "../indexes/ruleUniqueMongooseIndexes.js";
import { ruleMongooseSchema } from "./ruleMongooseSchema.js";

const getRuleMongooseSchema = (): Schema<Rule> => {
	const ruleMongooseIndexes = [
		...rulePerformanceMongooseIndexes,
		...ruleUniqueMongooseIndexes,
	];

	for (const ruleMongooseIndex of ruleMongooseIndexes) {
		ruleMongooseSchema.index(
			ruleMongooseIndex.definition,
			ruleMongooseIndex.options,
		);
	}

	return ruleMongooseSchema;
};

export { getRuleMongooseSchema };
