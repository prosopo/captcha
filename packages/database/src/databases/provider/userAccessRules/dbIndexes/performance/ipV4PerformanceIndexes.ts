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

class IpV4PerformanceIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.userIpV4AsNumeric(schema);
		this.userIpV4MaskRange(schema);
	}

	protected userIpV4AsNumeric(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v4.asNumeric": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v4.asNumeric": { $exists: true },
				},
			},
		);
	}

	protected userIpV4MaskRange(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v4.mask.rangeMinAsNumeric": 1,
				"userIp.v4.mask.rangeMaxAsNumeric": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v4.mask.asNumeric": { $exists: true },
				},
			},
		);
	}
}

const ipV4PerformanceIndexes = new IpV4PerformanceIndexes();

export { ipV4PerformanceIndexes };
