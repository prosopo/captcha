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

import type { Rule } from "../rule/rule.js";
import type { DeleteRuleFilters } from "./filters/deleteRuleFilters.js";
import type { SearchRuleFilterSettings } from "./filters/search/searchRuleFilterSettings.js";
import type { SearchRuleFilters } from "./filters/search/searchRuleFilters.js";
import type { RuleRecord } from "./ruleRecord.js";

interface RulesStorage {
	insert(record: Rule): Promise<RuleRecord>;

	insertMany(records: Rule[]): Promise<RuleRecord[]>;

	find(
		filters: SearchRuleFilters,
		filterSettings?: SearchRuleFilterSettings,
	): Promise<RuleRecord[]>;

	deleteMany(recordFilters: DeleteRuleFilters[]): Promise<void>;

	countRecords(): Promise<number>;
}

export type { RulesStorage };
