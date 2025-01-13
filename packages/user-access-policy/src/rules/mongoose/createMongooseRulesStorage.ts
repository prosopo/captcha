import { RulesMongooseStorage } from "@rules/mongoose/rulesMongooseStorage.js";
import type { Rule } from "@rules/rule/rule.js";
import type { RulesStorage } from "@rules/storage/rulesStorage.js";
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
import type { Model } from "mongoose";

const createMongooseRulesStorage = (
	readingModel: Model<Rule> | null,
	writingModel: Model<Rule> | null = null,
): RulesStorage => {
	return new RulesMongooseStorage(readingModel, writingModel);
};

export { createMongooseRulesStorage };
