import type { UserAccessRule } from "@prosopo/types-database";
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
import type { AccessRuleDbIndexes } from "../accessRuleDbIndexes.js";
import { ipV4MaskUniqueIndexes } from "./ipV4/ipV4MaskUniqueIndexes.js";
import { ipV4UniqueIndexes } from "./ipV4/ipV4UniqueIndexes.js";
import { ipV6MaskUniqueIndexes } from "./ipV6/ipV6MaskUniqueIndexes.js";
import { ipV6UniqueIndexes } from "./ipV6/ipV6UniqueIndexes.js";

class UniqueIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		ipV4UniqueIndexes.setup(schema);
		ipV4MaskUniqueIndexes.setup(schema);

		ipV6UniqueIndexes.setup(schema);
		ipV6MaskUniqueIndexes.setup(schema);
	}
}

const uniqueIndexes = new UniqueIndexes();

export { uniqueIndexes };
