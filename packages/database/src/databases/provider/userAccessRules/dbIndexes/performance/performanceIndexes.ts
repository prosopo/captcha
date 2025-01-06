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
import { ipV4PerformanceIndexes } from "./ipV4PerformanceIndexes.js";
import { ipV6PerformanceIndexes } from "./ipV6PerformanceIndexes.js";

class PerformanceIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.clientId(schema);
		this.userId(schema);

		ipV4PerformanceIndexes.setup(schema);
		ipV6PerformanceIndexes.setup(schema);
	}

	protected clientId(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				clientId: 1,
			},
			{
				partialFilterExpression: {
					clientId: { $exists: true },
				},
			},
		);
	}

	protected userId(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				userId: 1,
			},
			{
				partialFilterExpression: {
					userId: { $exists: true },
				},
			},
		);
	}
}

const performanceIndexes = new PerformanceIndexes();

export { performanceIndexes };
