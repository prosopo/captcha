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

import type { Rule } from "../../../rules/rule/rule.js";
import type { DeleteRuleFilters } from "../../../rules/storage/filters/deleteRuleFilters.js";
import type { SearchRuleFilterSettings } from "../../../rules/storage/filters/search/searchRuleFilterSettings.js";
import type { SearchRuleFilters } from "../../../rules/storage/filters/search/searchRuleFilters.js";
import type { RuleRecord } from "../../../rules/storage/ruleRecord.js";
import type { RulesStorage } from "../../../rules/storage/rulesStorage.js";

class TestRulesStorage implements RulesStorage {
	constructor(public ruleRecords: RuleRecord[] = []) {}

	async insert(record: Rule): Promise<RuleRecord> {
		return Promise.resolve({
			isUserBlocked: false,
			_id: "none",
		});
	}

	async insertMany(records: Rule[]): Promise<RuleRecord[]> {
		return Promise.resolve(this.ruleRecords);
	}

	async find(
		filters: SearchRuleFilters,
		filterSettings?: SearchRuleFilterSettings,
	): Promise<RuleRecord[]> {
		return Promise.resolve(this.ruleRecords);
	}

	async deleteMany(recordFilters: DeleteRuleFilters[]): Promise<void> {
		return Promise.resolve();
	}

	async countRecords(): Promise<number> {
		return Promise.resolve(this.ruleRecords.length);
	}
}

export { TestRulesStorage };
