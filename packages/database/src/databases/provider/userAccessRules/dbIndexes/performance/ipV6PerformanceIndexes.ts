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

class IpV6PerformanceIndexes implements AccessRuleDbIndexes {
	public setup(schema: Schema<UserAccessRule>): void {
		this.userIpV6AsNumericString(schema);
		this.userIpV6MaskRange(schema);
	}

	protected userIpV6AsNumericString(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.asNumericString": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v6.asNumericString": { $exists: true },
				},
			},
		);
	}

	protected userIpV6MaskRange(schema: Schema<UserAccessRule>): void {
		schema.index(
			{
				"userIp.v6.mask.rangeMinAsNumericString": 1,
				"userIp.v6.mask.rangeMaxAsNumericString": 1,
			},
			{
				partialFilterExpression: {
					"userIp.v6.mask.asNumeric": { $exists: true },
				},
			},
		);
	}
}

const ipV6PerformanceIndexes = new IpV6PerformanceIndexes();

export { ipV6PerformanceIndexes };
